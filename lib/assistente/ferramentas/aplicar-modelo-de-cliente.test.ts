/**
 * `aplicar_modelo_de_cliente` — o modelo tirado da empresa A e aplicado na
 * empresa B (a da sessão), com o banco falso das duas empresas.
 *
 * O isolamento medido: o que vira proposta na B é só estrutura, sem nome,
 * contato ou id da A; a organização de destino é a do contexto; só modelo
 * `revisado` se aplica; nada se duplica nem se apaga.
 */
// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

import type { HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";
import { criarBancoFalso, type LinhaDeTeste } from "@/lib/assistente/metricas/consultas/banco-falso";
import { extrairModeloDaOrganizacao } from "@/lib/assistente/modelos-de-cliente/extrair";
import { revisarEstrutura } from "@/lib/assistente/modelos-de-cliente/revisar";
import { modeloPorId } from "@/lib/followup/modelos";

import { aplicarModeloDeCliente, sobreporHandlerDeListaDeFunis } from "./aplicar-modelo-de-cliente";
import { montarParaTeste } from "./auxiliar-de-teste";
import { sobreporHandlersDeCriacao } from "./criar-rascunho-de-agente";
import { sobreporHandlerDeListaDeAgentes, sobreporHandlerDeListaDeFollowups } from "./montar-pacote-do-nicho";
import { sobreporFontesDeProposta } from "./proposta-comum";

const ORG_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const FUNIL_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const AGENTE_A = "aaaaaaaa-2222-4000-8000-00000000000a";
const MODELO = "dddddddd-0000-4000-8000-00000000000d";

/** A empresa A, de onde o modelo sai (outra organização, no mesmo banco). */
const DA_ORIGEM: Record<string, readonly LinhaDeTeste[]> = {
  organizations: [{ id: ORG_A, display_name: "Clínica Aurora", legal_name: "Aurora Serviços Médicos Ltda" }],
  crm_pipelines: [{ id: FUNIL_A, organization_id: ORG_A, name: "Consultas Aurora", position: 1, is_archived: false }],
  crm_stages: [
    { pipeline_id: FUNIL_A, organization_id: ORG_A, name: "Primeiro contato", position: 1, is_won: false, is_lost: false, is_archived: false },
    { pipeline_id: FUNIL_A, organization_id: ORG_A, name: "Compareceu", position: 2, is_won: true, is_lost: false, is_archived: false },
    { pipeline_id: FUNIL_A, organization_id: ORG_A, name: "Desistiu", position: 3, is_won: false, is_lost: true, is_archived: false },
  ],
  ai_agents: [{ id: AGENTE_A, organization_id: ORG_A, name: "Recepção Aurora", description: "" }],
  ai_agent_versions: [
    {
      agent_id: AGENTE_A,
      organization_id: ORG_A,
      status: "published",
      version_number: 1,
      system_prompt: "Você é a recepção da Clínica Aurora. Responda com calma e marque consultas.",
    },
  ],
  followup_flow_pointers: [{ organization_id: ORG_A, name: modeloPorId("clinica-consulta-retomada")!.nome }],
};

function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

const PROVEDORES_OK = {
  padrao: { provider: "anthropic", defaultModel: "claude-sonnet-4-6" },
  credenciais: [
    { id: "cred-1", provider: "anthropic", label: "Chave", validated_at: "2026-10-01T00:00:00Z", is_active: true },
  ],
};

/** O que a empresa B (a da sessão) já tem, e as propostas que chegam à rota. */
function ligarDestino(opcoes: { funis?: unknown[]; agentes?: unknown[]; followups?: unknown[] } = {}) {
  const corpos: Record<string, unknown>[] = [];
  const lista = (dados: unknown[] | undefined): HandlerDeRota => async () => respostaJson(200, { data: dados ?? [] });
  sobreporHandlerDeListaDeFunis(lista(opcoes.funis));
  sobreporHandlerDeListaDeAgentes(lista(opcoes.agentes));
  sobreporHandlerDeListaDeFollowups(lista(opcoes.followups));
  sobreporHandlersDeCriacao({
    provedores: async () => respostaJson(200, { data: PROVEDORES_OK }),
    funis: async () => respostaJson(200, { data: [] }),
    materiais: async () => respostaJson(200, { data: [] }),
    agentesPost: async () => respostaJson(500, {}),
  });
  sobreporFontesDeProposta({
    propostas: async (req) => {
      corpos.push((await req.json()) as Record<string, unknown>);
      return respostaJson(201, { data: { id: `prop-${corpos.length}`, resumo: "ok" } });
    },
  });
  return corpos;
}

/** O modelo como a tabela guardaria: tirado da A pelo código real, com o status pedido. */
async function linhaDoModelo(status: "rascunho" | "revisado"): Promise<LinhaDeTeste> {
  const extraido = await extrairModeloDaOrganizacao(criarBancoFalso(DA_ORIGEM).client, ORG_A);
  const revisao = revisarEstrutura(extraido!.estrutura, extraido!.termos);
  if (!revisao.ok) throw new Error(`a estrutura da A não passou na revisão: ${JSON.stringify(revisao)}`);
  return {
    id: MODELO,
    name: "Clínica pronta",
    niche: "clinica",
    status,
    structure: revisao.estrutura,
    warnings: extraido!.avisos,
    source_terms: extraido!.termos,
    created_at: "2026-10-29T12:00:00Z",
    reviewed_at: status === "revisado" ? "2026-10-29T13:00:00Z" : null,
  };
}

async function entradaDoDestino(status: "rascunho" | "revisado" = "revisado") {
  const { ctx, coletor } = montarParaTeste("admin", {}, {
    instalacao: { config_client_templates: [await linhaDoModelo(status)] },
  });
  return { ctx, coletor, skills: [] };
}

describe("aplicar_modelo_de_cliente", () => {
  afterEach(() => {
    sobreporHandlerDeListaDeFunis(null);
    sobreporHandlerDeListaDeAgentes(null);
    sobreporHandlerDeListaDeFollowups(null);
    sobreporHandlersDeCriacao(null);
    sobreporFontesDeProposta(null);
  });

  it("propõe funil (com as etapas), agente em rascunho e follow-up — tudo como cartão, nada criado", async () => {
    const corpos = ligarDestino();
    const r = await aplicarModeloDeCliente(await entradaDoDestino(), { modeloId: MODELO, negocio: "Odonto Sorriso" });

    expect(r).toMatchObject({
      ok: true,
      proposto: {
        funis: ["Consultas Odonto Sorriso"],
        agentes: ["Recepção Odonto Sorriso"],
        followups: ["clinica-consulta-retomada"],
      },
    });
    const portas = corpos.map((c) => (c.payload as { porta: string }).porta);
    expect(portas).toEqual(["pipelines", "ai/agents", "ai/followup-flows/from-model"]);
    expect(corpos.every((c) => c.kind === "acao")).toBe(true);
    const funil = (corpos[0]!.payload as { corpo: { stages: unknown[] } }).corpo;
    expect(funil.stages).toEqual([
      { name: "Primeiro contato" },
      { name: "Compareceu", is_won: true },
      { name: "Desistiu", is_lost: true },
    ]);
  });

  it("⭐ 2 empresas: nada da A (nome, palavra do nome, ids) chega às propostas da B", async () => {
    const corpos = ligarDestino();
    await aplicarModeloDeCliente(await entradaDoDestino(), { modeloId: MODELO, negocio: "Odonto Sorriso" });
    const tudo = JSON.stringify(corpos);
    expect(corpos.length).toBeGreaterThan(0);
    for (const proibido of ["Aurora", ORG_A, FUNIL_A, AGENTE_A, "{{negocio}}"]) {
      expect(tudo, proibido).not.toContain(proibido);
    }
    expect(tudo).toContain("Você é a recepção da Odonto Sorriso.");
  });

  it("modelo ainda em rascunho → nao_revisado, nenhuma proposta", async () => {
    const corpos = ligarDestino();
    const r = await aplicarModeloDeCliente(await entradaDoDestino("rascunho"), { modeloId: MODELO, negocio: "X Odonto" });
    expect(r).toMatchObject({ ok: false, motivo: "nao_revisado" });
    expect(corpos).toEqual([]);
  });

  it("revisado no banco mas com termo da origem enfiado depois → a revisão roda de novo e recusa", async () => {
    const corpos = ligarDestino();
    const linha = await linhaDoModelo("revisado");
    const estrutura = linha.structure as { agentes: { prompt: string }[] };
    estrutura.agentes[0]!.prompt = "Você é a recepção da Aurora.";
    const { ctx, coletor } = montarParaTeste("admin", {}, { instalacao: { config_client_templates: [linha] } });
    const r = await aplicarModeloDeCliente({ ctx, coletor, skills: [] }, { modeloId: MODELO, negocio: "B" });
    expect(r).toMatchObject({ ok: false, motivo: "nao_revisado" });
    expect(corpos).toEqual([]);
  });

  it("nunca duplica: funil, agente e follow-up de mesmo nome já na B são reaproveitados", async () => {
    const corpos = ligarDestino({
      funis: [{ name: "consultas odonto sorriso" }],
      agentes: [{ name: "Recepção Odonto Sorriso" }],
      followups: [{ id: "fu-1", name: modeloPorId("clinica-consulta-retomada")!.nome }],
    });
    const r = await aplicarModeloDeCliente(await entradaDoDestino(), { modeloId: MODELO, negocio: "Odonto Sorriso" });
    expect(r).toMatchObject({
      ok: true,
      proposto: { funis: [], agentes: [], followups: [] },
      reaproveitado: {
        funis: ["Consultas Odonto Sorriso"],
        agentes: ["Recepção Odonto Sorriso"],
        followups: ["clinica-consulta-retomada"],
      },
    });
    expect(corpos).toEqual([]);
  });

  it("modelo que não existe → nao_encontrado; sem o banco da instalação → indisponivel", async () => {
    ligarDestino();
    expect(
      await aplicarModeloDeCliente(await entradaDoDestino(), {
        modeloId: "eeeeeeee-0000-4000-8000-00000000000e",
        negocio: "B",
      }),
    ).toMatchObject({ ok: false, motivo: "nao_encontrado" });
    const { ctx, coletor } = montarParaTeste("admin");
    expect(await aplicarModeloDeCliente({ ctx, coletor, skills: [] }, { modeloId: MODELO, negocio: "B" })).toEqual({
      ok: false,
      motivo: "indisponivel",
    });
  });
});
