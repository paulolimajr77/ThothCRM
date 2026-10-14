// @vitest-environment node
import { describe, expect, it } from "vitest";

import { metricaFunilConversao, sobreporHandlerDeFunilConversao } from "@/lib/assistente/metricas";
import type { HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";
import type { ContextoDeConsulta } from "@/lib/assistente/metricas/tipos";

const CTX_AGENT: ContextoDeConsulta = { orgId: "org-1", papel: "agent", idioma: "pt-BR", fuso: "America/Sao_Paulo", agoraIso: "2026-10-14T09:00:00-03:00", bancoDosModulos: {} as any };

describe("funil_conversao", () => {
  it("ids de etapa não saem; pipeline_id sai", async () => {
    const payload = {
      janela: { from: "2026-10-07", to: "2026-10-14T00:00:00Z" },
      base: 1,
      conversao: { etapas: [{ pipeline_id: "11111111-2222-3333-4444-555555555555", funil: "Funil", etapa: { id: "et1", nome: "Lead", posicao: 1 }, proxima: { id: "et2", nome: "Won", posicao: 2 }, entraram: 2, passaram: 1, taxa: 0.5, amostra: 2, saidas_sem_entrada_na_janela: 0, desvios: 0 }], amostra: 2, notas: ["x"] },
      dias_ate_fechar: { medida: "mediana", mediana: 1, p25: 1, p75: 1, amostra: 1, ignorados: 0, exclui: "", por_funil: [] },
      origem: { linhas: [], valor_por_moeda: true },
      contra_metrica: { turnos: null, opt_outs: null, fonte: "x", nota: "y" },
      truncado: false,
    };
    const h = async () => new Response(JSON.stringify({ data: payload }), { status: 200, headers: { "content-type": "application/json" } });
    sobreporHandlerDeFunilConversao(h);
    const r = await metricaFunilConversao.executar(CTX_AGENT, {});
    expect(r.ok).toBe(true);
    if (r.ok) {
      const t = JSON.stringify(r.dados);
      expect(t).not.toContain("\"id\":\"et1\"");
      expect(t).toContain("pipeline_id");
    }
  });

  it("vazio (motivo) → dados null + aviso", async () => {
    const payload = {
      janela: { from: "2026-10-07", to: "2026-10-14T00:00:00Z" },
      base: 0,
      conversao: { etapas: [], amostra: 0, notas: [] },
      dias_ate_fechar: { medida: "mediana", mediana: null, p25: null, p75: null, amostra: 0, ignorados: 0, exclui: "", por_funil: [] },
      origem: { linhas: [], valor_por_moeda: true },
      contra_metrica: { turnos: null, opt_outs: null, fonte: "x", nota: "y" },
      truncado: false,
      vazio: { motivo: "sem" },
    };
    const h = async () => new Response(JSON.stringify({ data: payload }), { status: 200, headers: { "content-type": "application/json" } });
    sobreporHandlerDeFunilConversao(h);
    const r = await metricaFunilConversao.executar(CTX_AGENT, {});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados).toBeNull();
  });
});