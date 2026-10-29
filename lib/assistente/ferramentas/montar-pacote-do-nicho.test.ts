/**
 * `montar_pacote_do_nicho` — PROPÕE (não grava) o agente do nicho como
 * rascunho e os follow-ups escolhidos. Nada é criado antes do administrador
 * aprovar o cartão.
 */
// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

import type { HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";
import { nichoPorId, preencherEsqueleto } from "@/lib/assistente/nichos";
import type { NichoDoAssistente } from "@/lib/assistente/nichos";
import { catalogoComHandler } from "@/lib/ai/agents/capacidades-padrao";
import { ligarPacote } from "@/lib/mcp/tools/selecao-por-pacote";

import { chamar, montarParaTeste } from "./auxiliar-de-teste";
import { sobreporHandlersDeCriacao } from "./criar-rascunho-de-agente";
import { sobreporFontesDeProposta } from "./proposta-comum";
import { montarPacoteDoNicho, sobreporHandlerDeListaDeAgentes } from "./montar-pacote-do-nicho";

function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const PROVEDORES_OK = {
  padrao: { provider: "anthropic", defaultModel: "claude-sonnet-4-6" },
  credenciais: [
    {
      id: "cred-1",
      provider: "anthropic",
      label: "Chave da empresa",
      validated_at: "2026-10-01T00:00:00Z",
      is_active: true,
    },
  ],
};

interface PropostaCapturada {
  metodo: string;
  corpos: Record<string, unknown>[];
}

interface CorpoCapturado {
  metodo: string;
  corpos: Record<string, unknown>[];
}

function ligar(opcoes: {
  agentes?: unknown;
  statusAgentes?: number;
  provedores?: unknown;
  capturaAgente?: CorpoCapturado;
  capturaProposta?: PropostaCapturada;
  statusPostProposta?: number;
  corpoPostProposta?: { id: string; resumo: string };
}): void {
  const hLista: HandlerDeRota = async () =>
    respostaJson(opcoes.statusAgentes ?? 200, { data: opcoes.agentes ?? [] });
  sobreporHandlerDeListaDeAgentes(hLista);

  const hProvedores: HandlerDeRota = async () =>
    respostaJson(200, { data: opcoes.provedores ?? PROVEDORES_OK });
  const hFunis: HandlerDeRota = async () => respostaJson(200, { data: [] });
  const hMateriais: HandlerDeRota = async () => respostaJson(200, { data: [] });
  sobreporHandlersDeCriacao({
    provedores: hProvedores,
    funis: hFunis,
    materiais: hMateriais,
    agentesPost: async () =>
      respostaJson(201, { data: { agent: { id: "ag-novo", name: "X" }, version: { id: "v1", status: "draft" } } }),
  });

  const hPostProposta: HandlerDeRota = async (req) => {
    let corpo: Record<string, unknown> = {};
    try {
      corpo = (await req.json()) as Record<string, unknown>;
    } catch {
      corpo = {};
    }
    if (opcoes.capturaProposta) {
      opcoes.capturaProposta.metodo = req.method;
      opcoes.capturaProposta.corpos.push(corpo);
    }
    return respostaJson(opcoes.statusPostProposta ?? 201, {
      data: opcoes.corpoPostProposta
        ? opcoes.corpoPostProposta
        : { id: "prop-novo", resumo: "proposta de teste" },
    });
  };
  sobreporFontesDeProposta({
    propostas: hPostProposta,
  });
}

const ENTRADA_CLINICA = {
  nicho: "clinica",
  negocio: "Clínica Aurora",
  descricao: "consultas e exames com acolhimento",
  nome_do_agente: "Recepção Aurora",
} as const;

function entradaDeTeste(): Parameters<typeof montarPacoteDoNicho>[0] {
  return montarParaTeste("admin").ctx as unknown as Parameters<typeof montarPacoteDoNicho>[0];
}

describe("montar_pacote_do_nicho", () => {
  afterEach(() => {
    sobreporHandlerDeListaDeAgentes(null);
    sobreporHandlersDeCriacao(null);
    sobreporFontesDeProposta(null);
  });

  // --- Caso obrigatório 1: NÃO chama POST /api/v1/ai/agents nem POST /api/v1/ai/followup-flows/from-model ---
  it("não chama POST de agente nem de follow-up: só propõe", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      nicho: nichoPorId("clinica")!,
      negocio: ENTRADA_CLINICA.negocio,
      descricao: ENTRADA_CLINICA.descricao,
      nomeDoAgente: ENTRADA_CLINICA.nome_do_agente,
      followups: [],
    });

    expect(saida.ok).toBe(true);
    // Só propostas, nenhum POST direto de agente/follow-up:
    expect(capturaProposta.corpos.length).toBeGreaterThan(0);
    // Cada proposta é kind "acao"
    for (const c of capturaProposta.corpos) {
      expect(c.kind).toBe("acao");
    }
  });

  // --- Caso obrigatório 2: cria uma proposta `kind: "acao"` com payload.porta === "ai/agents", metodo === "POST", system_prompt do nicho preenchido ---
  it("propoe o agente: proposta acao com porta ai/agents, metodo POST, system_prompt preenchido (sem chaves)", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      nicho: nichoPorId("clinica")!,
      negocio: ENTRADA_CLINICA.negocio,
      descricao: ENTRADA_CLINICA.descricao,
      nomeDoAgente: ENTRADA_CLINICA.nome_do_agente,
      followups: [],
    });

    expect(saida.ok).toBe(true);
    expect(saida.proposto.agente.proposta_id).toBeDefined();
    expect(saida.proposto.agente.nome).toBe(ENTRADA_CLINICA.nome_do_agente);

    const propostaAgente = capturaProposta.corpos.find(
      (c) => (c.payload as { porta?: string })?.porta === "ai/agents",
    );
    expect(propostaAgente).toBeDefined();
    expect((propostaAgente!.payload as { metodo?: string }).metodo).toBe("POST");
    const corpo = (propostaAgente!.payload as { corpo?: unknown }).corpo as {
      version?: { system_prompt?: string };
    };
    expect(corpo.version?.system_prompt).toBeDefined();
    expect(corpo.version?.system_prompt).not.toContain("{");
    expect(corpo.version?.system_prompt).toContain("Clínica Aurora");
    expect(corpo.version?.system_prompt).toContain("Recepção Aurora");
    expect(JSON.stringify(propostaAgente)).not.toContain("organization_id");
  });

  // --- Caso obrigatório 3: follow-up pedido vira segunda proposta com porta ai/followup-flows/from-model e corpo.model_id ---
  it("propoe follow-up: segunda proposta com porta ai/followup-flows/from-model e model_id certo", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      nicho: nichoPorId("clinica")!,
      negocio: ENTRADA_CLINICA.negocio,
      descricao: ENTRADA_CLINICA.descricao,
      nomeDoAgente: ENTRADA_CLINICA.nome_do_agente,
      followups: ["clinica-consulta-retomada"],
    });

    expect(saida.ok).toBe(true);
    expect(saida.proposto.followups).toHaveLength(1);
    expect(saida.proposto.followups[0].modelo).toBe("clinica-consulta-retomada");
    expect(saida.proposto.followups[0].proposta_id).toBeDefined();

    const propostaFu = capturaProposta.corpos.find(
      (c) => (c.payload as { porta?: string })?.porta === "ai/followup-flows/from-model",
    );
    expect(propostaFu).toBeDefined();
    expect((propostaFu!.payload as { metodo?: string }).metodo).toBe("POST");
    expect((propostaFu!.payload as { corpo?: { model_id?: string } }).corpo?.model_id).toBe(
      "clinica-consulta-retomada",
    );
  });

  // --- Caso obrigatório 4: follow-up com pedeEtapa continua em falta e NÃO vira proposta ---
  it("follow-up com pedeEtapa vai para falta e nao vira proposta", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta });
    const entrada = entradaDeTeste();

    // clinica-cirurgia-decisao e clinica-falta-remarcar pedem etapa (conforme modelos do nicho)
    const saida = await montarPacoteDoNicho(entrada, {
      nicho: nichoPorId("clinica")!,
      negocio: ENTRADA_CLINICA.negocio,
      descricao: ENTRADA_CLINICA.descricao,
      nomeDoAgente: ENTRADA_CLINICA.nome_do_agente,
      followups: ["clinica-cirurgia-decisao"],
    });

    expect(saida.ok).toBe(true);
    expect(saida.proposto.followups).toHaveLength(0);
    expect(saida.falta.some((f) => f.includes("clinica-cirurgia-decisao"))).toBe(true);
    expect(saida.falta.some((f) => f.includes("etapa do funil"))).toBe(true);
    // Nenhuma proposta para follow-up (só a do agente)
    const propostasFu = capturaProposta.corpos.filter(
      (c) => (c.payload as { porta?: string })?.porta === "ai/followup-flows/from-model",
    );
    expect(propostasFu).toHaveLength(0);
  });

  // --- Caso obrigatório 5: falha na proposta do agente → indisponivel e nenhuma proposta de follow-up ---
  it("falha na proposta do agente: indisponivel e nenhuma proposta de follow-up", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta, statusPostProposta: 500 });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      nicho: nichoPorId("clinica")!,
      negocio: ENTRADA_CLINICA.negocio,
      descricao: ENTRADA_CLINICA.descricao,
      nomeDoAgente: ENTRADA_CLINICA.nome_do_agente,
      followups: ["clinica-consulta-retomada"],
    });

    expect(saida.ok).toBe(false);
    expect(saida.motivo).toBe("indisponivel");
    // Nenhuma proposta foi criada (nem agente, nem follow-up)
    expect(capturaProposta.corpos).toHaveLength(0);
  });

  // --- Casos antigos adaptados ---

  it("clinica feliz: propõe agente com prompt preenchido, falta inclui publicar", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      nicho: nichoPorId("clinica")!,
      negocio: ENTRADA_CLINICA.negocio,
      descricao: ENTRADA_CLINICA.descricao,
      nomeDoAgente: ENTRADA_CLINICA.nome_do_agente,
      followups: [],
    });

    expect(saida.ok).toBe(true);
    const propostaAgente = capturaProposta.corpos[0];
    const versao = (propostaAgente.payload as { corpo?: { version?: { system_prompt?: string } } }).corpo
      ?.version as { system_prompt: string };
    const nicho = nichoPorId("clinica");
    const preenchido = preencherEsqueleto(nicho?.esqueleto ?? "", {
      "clínica": ENTRADA_CLINICA.negocio,
      "especialidades, em uma frase": ENTRADA_CLINICA.descricao,
      nome: ENTRADA_CLINICA.nome_do_agente,
    });
    expect(preenchido.ok).toBe(true);
    if (preenchido.ok) expect(versao.system_prompt).toBe(preenchido.texto);
    expect(versao.system_prompt).not.toContain("{");
    expect(versao.system_prompt).toContain("Clínica Aurora");
    expect(versao.system_prompt).toContain("Recepção Aurora");

    expect(saida.proposto.agente).toEqual({
      proposta_id: expect.any(String),
      nome: "Recepção Aurora",
    });
    expect(saida.falta.some((f) => f.includes("Agendamentos"))).toBe(true);
    expect(saida.falta.some((f) => f.includes("convênios aceitos"))).toBe(true);
    expect(saida.falta.some((f) => f.includes("tem horário essa semana?"))).toBe(true);
    expect(saida.falta.some((f) => f.includes("publicar"))).toBe(true);
    expect(saida.falta.some((f) => f.includes("PRECISO CONFIRMAR"))).toBe(true);
  });

  it.each(["imobiliaria", "servicos", "infoproduto", "loja", "generico", "advocacia"] as const)(
    "%s: propõe o agente em rascunho com o prompt do nicho preenchido",
    async (nicho) => {
      const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
      ligar({ capturaProposta });
      const entrada = entradaDeTeste();

      const saida = await montarPacoteDoNicho(entrada, {
        nicho: nichoPorId(nicho)!,
        negocio: "Negócio Teste",
        descricao: "faz coisas boas",
        nomeDoAgente: "Atendente Teste",
        followups: [],
      });

      expect(saida.ok).toBe(true);
      expect(saida.proposto.agente.nome).toBe("Atendente Teste");
      expect(capturaProposta.corpos).toHaveLength(1);
      const corpo = (capturaProposta.corpos[0].payload as { corpo?: unknown }).corpo as {
        version?: { system_prompt: string };
      };
      expect(corpo.version?.system_prompt).toContain("Negócio Teste");
      expect(corpo.version?.system_prompt).toContain("faz coisas boas");
      expect(corpo.version?.system_prompt).toContain("Atendente Teste");
      expect(corpo.version?.system_prompt).not.toMatch(/[{}]/);
      expect(saida.falta.some((f) => f.includes("publicar"))).toBe(true);
    },
  );

  it("nicho sem prompt: nicho_sem_prompt e NENHUMA proposta", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta });
    const sem = { ...nichoPorId("imobiliaria")!, esqueleto: null, campos: [] } as NichoDoAssistente;
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      nicho: sem,
      negocio: "Imob Sul",
      descricao: "venda e locação",
      nomeDoAgente: "Vendas Sul",
      followups: [],
    });

    if (saida.ok) throw new Error("devia recusar");
    expect(saida.motivo).toBe("nicho_sem_prompt");
    expect(saida.detalhe).toContain("PRECISO CONFIRMAR");
    expect(capturaProposta.corpos).toEqual([]);
  });

  it("marcador fora do mapeamento: falta_dado, sem proposta", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta });
    const clinica = nichoPorId("clinica");
    const falso: NichoDoAssistente = {
      ...clinica!,
      esqueleto: `Olá {nome}, bem-vindo à {cidade}.`,
    };
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      nicho: falso,
      negocio: "Clínica Aurora",
      descricao: "consultas",
      nomeDoAgente: "Recepção Aurora",
      followups: [],
    });

    expect(saida).toEqual({
      ok: false,
      motivo: "falta_dado",
      faltam: ["cidade"],
      detalhe: expect.stringContaining("PRECISO CONFIRMAR"),
    });
    expect(capturaProposta.corpos).toEqual([]);
  });

  it("nome duplicado: ja_existe, sem proposta", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({
      agentes: [{ id: "ag-velho", name: "Recepção Aurora" }],
      capturaProposta,
    });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      ...ENTRADA_CLINICA,
    });

    expect(saida).toEqual({ ok: false, motivo: "ja_existe" });
    expect(capturaProposta.corpos).toEqual([]);
  });

  it("follow-up de outro nicho: followup_de_outro_nicho, sem proposta", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      nicho: "advocacia",
      negocio: "Escritório Prado",
      descricao: "direito trabalhista",
      nome_do_agente: "Triagem Prado",
      followups: ["clinica-consulta-retomada"],
    });

    expect(saida).toEqual({ ok: false, motivo: "followup_de_outro_nicho" });
    expect(capturaProposta.corpos).toEqual([]);
  });

  it("4 follow-ups da clínica: 2 sem etapa propõem (2 propostas), 2 com etapa vão para falta", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({ capturaProposta });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      ...ENTRADA_CLINICA,
      followups: [
        "clinica-consulta-retomada",
        "clinica-exame-marcar",
        "clinica-cirurgia-decisao",
        "clinica-falta-remarcar",
      ],
    });

    expect(saida.ok).toBe(true);
    // clinica-consulta-retomada e clinica-falta-remarcar NÃO pedem etapa → propõem
    expect(saida.proposto.followups).toHaveLength(2);
    expect(saida.proposto.followups.map((f) => f.modelo).sort()).toEqual([
      "clinica-consulta-retomada",
      "clinica-falta-remarcar",
    ]);
    // clinica-exame-marcar e clinica-cirurgia-decisao pedem etapa → falta
    expect(saida.falta.some((f) => f.includes("clinica-exame-marcar"))).toBe(true);
    expect(saida.falta.some((f) => f.includes("clinica-cirurgia-decisao"))).toBe(true);
  });

  it("agente falha (montagem indisponivel): indisponivel, sem proposta de follow-up", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    // provedores sem credencial → montagem falha com sem_credencial
    ligar({
      provedores: { padrao: { provider: "anthropic", defaultModel: "x" }, credenciais: [] },
      capturaProposta,
    });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      ...ENTRADA_CLINICA,
      followups: ["clinica-consulta-retomada"],
    });

    expect(saida.ok).toBe(false);
    expect(saida.motivo).toBe("sem_credencial");
    expect(capturaProposta.corpos).toEqual([]);
  });

  it("sem credencial: sem_credencial, sem proposta", async () => {
    const capturaProposta: PropostaCapturada = { metodo: "", corpos: [] };
    ligar({
      provedores: { padrao: { provider: "anthropic", defaultModel: "x" }, credenciais: [] },
      capturaProposta,
    });
    const entrada = entradaDeTeste();

    const saida = await montarPacoteDoNicho(entrada, {
      ...ENTRADA_CLINICA,
      followups: ["clinica-consulta-retomada"],
    });

    expect(saida.motivo).toBe("sem_credencial");
    expect(capturaProposta.corpos).toEqual([]);
  });
});
