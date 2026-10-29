/**
 * Tirar o modelo de UMA organização — banco falso com DUAS empresas no mesmo
 * banco, como na VPS: nada da outra entra, toda consulta filtra a origem e o
 * modelo só carrega estrutura limpa.
 */
import { describe, expect, it } from "vitest";

import { criarBancoFalso, type LinhaDeTeste } from "@/lib/assistente/metricas/consultas/banco-falso";
import { modeloPorId } from "@/lib/followup/modelos";

import { estruturaDoModeloSchema } from "./estrutura";
import { extrairModeloDaOrganizacao } from "./extrair";

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";
const FUNIL_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const FUNIL_B = "bbbbbbbb-1111-4000-8000-00000000000b";
const AGENTE_A = "aaaaaaaa-2222-4000-8000-00000000000a";
const AGENTE_B = "bbbbbbbb-2222-4000-8000-00000000000b";

const NOME_DO_MODELO = modeloPorId("clinica-consulta-retomada")!.nome;

const DADOS: Record<string, readonly LinhaDeTeste[]> = {
  organizations: [
    { id: A, display_name: "Clínica Aurora", legal_name: "Aurora Serviços Médicos Ltda" },
    { id: B, display_name: "Odonto Sorriso", legal_name: "Sorriso Odontologia Ltda" },
  ],
  crm_pipelines: [
    { id: FUNIL_A, organization_id: A, name: "Consultas", position: 1, is_archived: false },
    { id: FUNIL_B, organization_id: B, name: "Funil do Sorriso", position: 1, is_archived: false },
  ],
  crm_stages: [
    { pipeline_id: FUNIL_A, organization_id: A, name: "Agendou", position: 2, is_won: false, is_lost: false, is_archived: false },
    { pipeline_id: FUNIL_A, organization_id: A, name: "Primeiro contato", position: 1, is_won: false, is_lost: false, is_archived: false },
    { pipeline_id: FUNIL_A, organization_id: A, name: "Compareceu", position: 3, is_won: true, is_lost: false, is_archived: false },
    { pipeline_id: FUNIL_B, organization_id: B, name: "Etapa do Sorriso", position: 1, is_won: false, is_lost: false, is_archived: false },
  ],
  ai_agents: [
    { id: AGENTE_A, organization_id: A, name: "Recepção Aurora", description: "Atende a Clínica Aurora" },
    { id: AGENTE_B, organization_id: B, name: "Recepção Sorriso", description: "Atende o Sorriso" },
  ],
  ai_agent_versions: [
    { agent_id: AGENTE_A, organization_id: A, status: "draft", version_number: 3, system_prompt: "rascunho novo da Clínica Aurora" },
    {
      agent_id: AGENTE_A,
      organization_id: A,
      status: "published",
      version_number: 2,
      system_prompt: "Você atende a Clínica Aurora. Fone (62) 99876-5432, contato@aurora.com.br.",
    },
    { agent_id: AGENTE_B, organization_id: B, status: "published", version_number: 1, system_prompt: "Sorriso: (11) 95555-4444" },
  ],
  followup_flow_pointers: [
    { organization_id: A, name: NOME_DO_MODELO },
    { organization_id: A, name: "Fluxo feito à mão da Aurora" },
    { organization_id: B, name: "Outro fluxo do Sorriso" },
  ],
};

describe("extrairModeloDaOrganizacao", () => {
  it("só a organização de origem: toda consulta filtra por ela", async () => {
    const banco = criarBancoFalso(DADOS);
    await extrairModeloDaOrganizacao(banco.client, A);
    for (const tabela of ["crm_pipelines", "crm_stages", "ai_agents", "ai_agent_versions", "followup_flow_pointers"]) {
      const consulta = banco.consultas.find((c) => c.tabela === tabela);
      expect(consulta?.filtros, tabela).toContainEqual(["organization_id", A]);
    }
    expect(banco.consultas.find((c) => c.tabela === "organizations")?.filtros).toContainEqual(["id", A]);
  });

  it("⭐ nada da outra empresa e nenhum dado de contato chega ao modelo (estrutura e avisos)", async () => {
    const r = await extrairModeloDaOrganizacao(criarBancoFalso(DADOS).client, A);
    // Os termos ficam fora: são justamente o nome da origem, guardado só para a revisão recusar.
    const tudo = JSON.stringify({ estrutura: r?.estrutura, avisos: r?.avisos });
    for (const proibido of ["Sorriso", "11) 95555", B, FUNIL_A, AGENTE_A, A, "Aurora", "99876", "contato@"]) {
      expect(tudo, proibido).not.toContain(proibido);
    }
  });

  it("a estrutura: funil com etapas em ordem, texto PUBLICADO limpo, follow-up do catálogo pelo id", async () => {
    const r = await extrairModeloDaOrganizacao(criarBancoFalso(DADOS).client, A);
    expect(r).not.toBeNull();
    const { estrutura, avisos } = r!;
    expect(estruturaDoModeloSchema.safeParse(estrutura).success).toBe(true);
    expect(estrutura.funis).toEqual([
      {
        nome: "Consultas",
        etapas: [
          { nome: "Primeiro contato", ganho: false, perdido: false },
          { nome: "Agendou", ganho: false, perdido: false },
          { nome: "Compareceu", ganho: true, perdido: false },
        ],
      },
    ]);
    expect(estrutura.agentes).toHaveLength(1);
    // "Aurora" sozinho também é da origem: a palavra própria do nome vira {{negocio}}.
    expect(estrutura.agentes[0]!.nome).toBe("Recepção {{negocio}}");
    expect(estrutura.agentes[0]!.descricao).toBe("Atende a {{negocio}}");
    expect(estrutura.agentes[0]!.prompt).toBe(
      "Você atende a {{negocio}}. Fone [REVISAR: telefone], [REVISAR: e-mail].",
    );
    expect(estrutura.followups).toEqual([{ modelo_id: "clinica-consulta-retomada" }]);
    expect(avisos).toContain("um follow-up feito à mão ficou de fora (só os do catálogo entram)");
    // Os termos que a revisão vai recusar: os nomes inteiros e a palavra própria, não "Clínica" nem "Ltda".
    expect(r!.termos).toEqual(["Aurora Serviços Médicos Ltda", "Clínica Aurora", "Aurora"]);
  });

  it("organização que não existe → null (nada é gravado)", async () => {
    expect(await extrairModeloDaOrganizacao(criarBancoFalso(DADOS).client, "cccccccc-0000-4000-8000-00000000000c")).toBeNull();
  });

  it("leitura falhou → null", async () => {
    expect(await extrairModeloDaOrganizacao(criarBancoFalso(DADOS, "ai_agents").client, A)).toBeNull();
  });
});
