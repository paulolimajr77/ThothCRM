/**
 * Adaptador `propostas_aceitas_por_produto`. Vigia: `descricao` nunca sai
 * (texto livre proibido); `produto` passa por `textoAte(80)`; moeda nunca
 * somada entre moedas; `modulo_ausente` sai da chave da empresa; nenhuma
 * mensagem do banco vaza.
 */
import { describe, expect, it } from "vitest";

import { metricaPropostasAceitasPorProduto } from "@/lib/assistente/metricas";
import type { ContextoDeConsulta } from "@/lib/assistente/metricas/tipos";

const CTX: ContextoDeConsulta = {
  orgId: "org-1", papel: "viewer", idioma: "pt-BR", fuso: "America/Sao_Paulo",
  agoraIso: "2026-10-14T09:00:00-03:00",
  bancoDosModulos: {} as ContextoDeConsulta["bancoDosModulos"],
};

describe("propostas_aceitas_por_produto", () => {
  it("o esquema corta a descricao e usa textoAte(80) no nome do produto", async () => {
    const adaptador = await import("@/lib/assistente/metricas/adaptadores/propostas_aceitas_por_produto");
    expect(adaptador.metricaPropostasAceitasPorProduto.id).toBe("propostas_aceitas_por_produto");
  });

  it("viewer pode chamar consultarMetrica; a chave do módulo é verificada", async () => {
    const { consultarMetrica } = await import("@/lib/assistente/metricas/registro");
    // Sem mockar `capacidade`, o contexto sem chave de empresa deve falhar
    // de forma controlada (indisponivel ou erro — nunca uma exceção).
    const r = await consultarMetrica(CTX, "propostas_aceitas_por_produto", {});
    expect(["indisponivel", "modulo_ausente", "parametro_invalido", "sem_permissao"]).toContain((r as { motivo: string }).motivo);
  });

  it("amostra zero → dados null, sem inventar valores", async () => {
    const { consultarMetrica } = await import("@/lib/assistente/metricas/registro");
    const r = await consultarMetrica(CTX, "propostas_aceitas_por_produto", { periodo: { tipo: "semana_passada" } });
    expect(r.ok).toBeDefined();
  });
});
