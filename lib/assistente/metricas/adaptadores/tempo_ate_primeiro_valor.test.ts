/**
 * Consultas de `tempo_ate_primeiro_valor` — banco falso, padrão dos vizinhos.
 */
import { describe, expect, it } from "vitest";

import { criarBancoFalso, type LinhaDeTeste } from "../consultas/banco-falso";
import { metricaTempoAtePrimeiroValor } from "./tempo_ate_primeiro_valor";
import type { ContextoDeConsulta } from "../tipos";

const ORG = "00000000-0000-0000-0000-000000000099";
const OUTRA_ORG = "00000000-0000-0000-0000-000000000098";

interface Dados {
  dias_ate_primeiro_agente_publicado: number | null;
  dias_ate_primeira_resposta_da_ia: number | null;
  propostas_do_assistente: {
    pendente: number;
    aprovada: number;
    aplicada: number;
    rejeitada: number;
    expirada: number;
    total: number;
  };
}

async function medir(dados: Record<string, readonly LinhaDeTeste[]>) {
  const banco = criarBancoFalso(dados);
  const ctx: ContextoDeConsulta = {
    orgId: ORG,
    papel: "admin",
    idioma: "pt-BR",
    fuso: "America/Sao_Paulo",
    agoraIso: "2026-10-14T09:00:00-03:00",
    bancoDosModulos: banco.client,
  };
  const r = await metricaTempoAtePrimeiroValor.executar(ctx, {});
  if (!r.ok) throw new Error(`métrica falhou: ${r.motivo}`);
  return { banco, dados: r.dados as Dados };
}

/** Mensagem de saída enviada pela IA (o que a métrica conta). */
function respostaDaIa(id: string, org: string, criadaEm: string): LinhaDeTeste {
  return { id, organization_id: org, direction: "outbound", sent_via: "ai", created_at: criadaEm };
}

describe("metricaTempoAtePrimeiroValor", () => {
  it("organização com os três marcos → dias certos (published_at, não created_at)", async () => {
    const { dados } = await medir({
      organizations: [{ id: ORG, created_at: "2026-10-01T00:00:00-03:00" }],
      ai_agent_versions: [
        {
          id: "av-1",
          organization_id: ORG,
          status: "published",
          created_at: "2026-10-05T00:00:00-03:00",
          published_at: "2026-10-10T00:00:00-03:00",
        },
      ],
      messages: [respostaDaIa("m-1", ORG, "2026-10-05T00:00:00-03:00")],
      config_proposals: [
        { id: "p-1", organization_id: ORG, status: "pendente" },
        { id: "p-2", organization_id: ORG, status: "aprovada" },
        { id: "p-3", organization_id: ORG, status: "aplicada" },
        { id: "p-4", organization_id: ORG, status: "rejeitada" },
        { id: "p-5", organization_id: ORG, status: "expirada" },
      ],
    });
    // publicação foi 10/10 (published_at), não 05/10 (created_at do rascunho).
    expect(dados.dias_ate_primeiro_agente_publicado).toBe(9);
    expect(dados.dias_ate_primeira_resposta_da_ia).toBe(4);
    expect(dados.propostas_do_assistente).toEqual({
      pendente: 1,
      aprovada: 1,
      aplicada: 1,
      rejeitada: 1,
      expirada: 1,
      total: 5,
    });
  });

  it("organização sem agente publicado nem resposta da IA → null, não 0", async () => {
    const { dados } = await medir({
      organizations: [{ id: ORG, created_at: "2026-10-01T00:00:00-03:00" }],
      ai_agent_versions: [
        { id: "av-1", organization_id: ORG, status: "draft", created_at: "2026-10-10T00:00:00-03:00", published_at: null },
      ],
      messages: [
        // Mensagem de atendente humano e mensagem recebida: nenhuma é resposta da IA.
        { id: "m-h", organization_id: ORG, direction: "outbound", sent_via: "crm", created_at: "2026-10-03T00:00:00-03:00" },
        { id: "m-in", organization_id: ORG, direction: "inbound", sent_via: "crm", created_at: "2026-10-02T00:00:00-03:00" },
      ],
      config_proposals: [],
    });
    expect(dados.dias_ate_primeiro_agente_publicado).toBeNull();
    expect(dados.dias_ate_primeira_resposta_da_ia).toBeNull();
    expect(dados.propostas_do_assistente.total).toBe(0);
  });

  it("versão superseded com published_at conta como publicação (não só status published)", async () => {
    // O falso não ordena: a superseded vem primeiro, como o banco devolveria
    // ordenando por published_at crescente. Filtrar por status a excluiria (→ 19).
    const { dados, banco } = await medir({
      organizations: [{ id: ORG, created_at: "2026-10-01T00:00:00-03:00" }],
      ai_agent_versions: [
        {
          id: "av-velha",
          organization_id: ORG,
          status: "superseded",
          created_at: "2026-10-05T00:00:00-03:00",
          published_at: "2026-10-08T00:00:00-03:00",
        },
        {
          id: "av-nova",
          organization_id: ORG,
          status: "published",
          created_at: "2026-10-20T00:00:00-03:00",
          published_at: "2026-10-20T00:00:00-03:00",
        },
      ],
      messages: [],
      config_proposals: [],
    });
    expect(dados.dias_ate_primeiro_agente_publicado).toBe(7);
    const consulta = banco.consultas.find((c) => c.tabela === "ai_agent_versions");
    expect(consulta?.ordens).toEqual(["published_at"]);
    expect(consulta?.filtros).toContainEqual(["published_at not is", null]);
  });

  it("só conta a organização da sessão: dados de outra org não entram", async () => {
    const { dados, banco } = await medir({
      organizations: [
        { id: OUTRA_ORG, created_at: "2026-09-01T00:00:00-03:00" },
        { id: ORG, created_at: "2026-10-01T00:00:00-03:00" },
      ],
      ai_agent_versions: [
        { id: "av-outra", organization_id: OUTRA_ORG, status: "published", created_at: "2026-10-02T00:00:00-03:00", published_at: "2026-10-02T00:00:00-03:00" },
        { id: "av-org", organization_id: ORG, status: "published", created_at: "2026-10-08T00:00:00-03:00", published_at: "2026-10-08T00:00:00-03:00" },
      ],
      messages: [
        respostaDaIa("m-outra", OUTRA_ORG, "2026-10-02T00:00:00-03:00"),
        respostaDaIa("m-org", ORG, "2026-10-06T00:00:00-03:00"),
      ],
      config_proposals: [
        { id: "p-outra", organization_id: OUTRA_ORG, status: "aplicada" },
        { id: "p-org-1", organization_id: ORG, status: "pendente" },
        { id: "p-org-2", organization_id: ORG, status: "aplicada" },
        { id: "p-org-3", organization_id: ORG, status: "expirada" },
      ],
    });
    expect(dados.dias_ate_primeiro_agente_publicado).toBe(7);
    expect(dados.dias_ate_primeira_resposta_da_ia).toBe(5);
    expect(dados.propostas_do_assistente).toEqual({
      pendente: 1,
      aprovada: 0,
      aplicada: 1,
      rejeitada: 0,
      expirada: 1,
      total: 3,
    });
    for (const tabela of ["ai_agent_versions", "messages", "config_proposals"]) {
      const consulta = banco.consultas.find((c) => c.tabela === tabela);
      expect(consulta?.filtros).toContainEqual(["organization_id", ORG]);
    }
    expect(banco.consultas.find((c) => c.tabela === "organizations")?.filtros).toContainEqual(["id", ORG]);
  });
});
