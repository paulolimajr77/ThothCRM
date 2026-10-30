/**
 * `conferir_agente`: a ficha curta do agente numa chamada só — rascunho,
 * publicada, número de WhatsApp (ativo ou não) e o que difere.
 */
// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

import type { HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";

import { chamar, montarParaTeste, ORG } from "./auxiliar-de-teste";
import { pendenciasDoAgente, situacaoDoNumero, sobreporHandlerDeVersoesDaConferencia } from "./conferir-agente";

const AGENTE = "11111111-1111-4111-8111-111111111111";
const CANAL = "99999999-9999-4999-8999-999999999999";

function resposta(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
}

function versao(numero: number, estado: string, extras: Record<string, unknown> = {}) {
  return {
    id: `v-${numero}`,
    version_number: numero,
    status: estado,
    system_prompt: "x".repeat(300),
    model: "m1",
    knowledge_source_ids: [],
    tool_ids: [],
    pipeline_ids: [],
    channel_session_id: null,
    ...extras,
  };
}

function ligar(versoes: unknown[], status = 200): void {
  const h: HandlerDeRota = async () => resposta(status, { data: versoes });
  sobreporHandlerDeVersoesDaConferencia(h);
}

interface Ficha {
  ok: boolean;
  motivo?: string;
  rascunho: { numero: number; materiais_ligados: number; comeco_do_prompt: string } | null;
  publicada: { numero: number } | null;
  numero_do_whatsapp: string | null;
  diferencas_do_rascunho: string[] | null;
}

describe("conferir_agente", () => {
  afterEach(() => sobreporHandlerDeVersoesDaConferencia(null));

  it("devolve a ficha curta: o começo do prompt, nunca o texto inteiro", async () => {
    ligar([versao(2, "draft", { knowledge_source_ids: ["k1"] }), versao(1, "published")]);
    const { ferramentas } = montarParaTeste("admin");

    const saida = await chamar<Ficha>(ferramentas, "conferir_agente", { agente_id: AGENTE });

    expect(saida.ok).toBe(true);
    expect(saida.rascunho?.numero).toBe(2);
    expect(saida.rascunho?.materiais_ligados).toBe(1);
    expect(saida.rascunho?.comeco_do_prompt.length).toBe(160);
    expect(saida.publicada?.numero).toBe(1);
    expect(saida.diferencas_do_rascunho).toEqual(["materiais ligados"]);
  });

  it("lê o número escolhido e diz que está desativado na mão", async () => {
    ligar([versao(2, "draft", { channel_session_id: CANAL })]);
    const { ferramentas } = montarParaTeste("admin", {
      channel_sessions: [
        { id: CANAL, organization_id: ORG, status: "WORKING", metadata: { disabled: true, disabled_by: "manual" } },
      ],
    });

    const saida = await chamar<Ficha>(ferramentas, "conferir_agente", { agente_id: AGENTE });

    expect(saida.numero_do_whatsapp).toBe("desativado_na_mao");
    expect(saida.diferencas_do_rascunho).toBeNull();
  });

  it("pendencias: material pronto e não ligado, sem passar para humano e follow-up sem horário", async () => {
    // Pedido do dono (30/10): a Nina foi publicada assim e o assistente disse "pronto".
    // Sabotagem: tirar o cálculo de `pendenciasDoAgente` → este teste fica vermelho.
    ligar([
      versao(1, "draft", {
        knowledge_source_ids: ["k1"],
        followup: { enabled: true, send_window: null },
        channel_session_id: CANAL,
        pipeline_ids: ["p1"],
      }),
    ]);
    const { ferramentas } = montarParaTeste("admin", {
      channel_sessions: [{ id: CANAL, organization_id: ORG, status: "WORKING", metadata: {} }],
      ai_knowledge_sources: [
        { id: "k1", organization_id: ORG, name: "Ligado", chunks_count: 8, is_active: true },
        { id: "k2", organization_id: ORG, name: "Solto", chunks_count: 31, is_active: true },
      ],
    });

    const saida = await chamar<{ pendencias: string[] }>(ferramentas, "conferir_agente", { agente_id: AGENTE });

    expect(saida.pendencias).toHaveLength(3);
    expect(saida.pendencias[0]).toContain('"Solto" (31 trechos)');
    expect(saida.pendencias.join(" ")).toContain("Passar para um humano");
    expect(saida.pendencias.join(" ")).toContain("SEM janela de horário");
  });

  it("pendenciasDoAgente: agente completo não tem pendência", () => {
    expect(
      pendenciasDoAgente(
        {
          numero: 1,
          estado: "draft",
          modelo: "m",
          tamanho_do_prompt: 1,
          comeco_do_prompt: "",
          materiais_ligados: 1,
          capacidades_ligadas: 1,
          funis_ligados: 1,
          numero_escolhido: true,
          passa_para_humano: true,
          followup_sem_janela: false,
          ids_dos_materiais: ["k1"],
        },
        [{ id: "k1", name: "A", chunks: 5 }],
      ),
    ).toEqual([]);
  });

  it("sem permissão ou sem agente: falha curta, sem lançar", async () => {
    ligar([], 404);
    const { ferramentas } = montarParaTeste("admin");

    const saida = await chamar<Ficha>(ferramentas, "conferir_agente", { agente_id: AGENTE });

    expect(saida).toEqual({ ok: false, motivo: "sem_permissao_ou_nao_existe" });
  });

  it("só administrador recebe a ferramenta", () => {
    const { ferramentas } = montarParaTeste("manager");
    expect(Object.keys(ferramentas)).not.toContain("conferir_agente");
  });

  it("situacaoDoNumero: ativo, pausado por horário, fora do ar e não encontrado", () => {
    expect(situacaoDoNumero({ status: "WORKING", metadata: {} })).toBe("ativo");
    expect(situacaoDoNumero({ status: "WORKING", metadata: { disabled: true, disabled_by: "schedule" } })).toBe(
      "pausado_por_horario",
    );
    expect(situacaoDoNumero({ status: "FAILED", metadata: null })).toBe("fora_do_ar");
    expect(situacaoDoNumero(null)).toBe("nao_encontrado");
  });
});
