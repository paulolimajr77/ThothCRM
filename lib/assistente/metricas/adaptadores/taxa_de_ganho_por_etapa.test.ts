// @vitest-environment node
import { describe, expect, it } from "vitest";

import { metricaTaxaDeGanhoPorEtapa, sobreporHandlersDeTaxaDeGanho } from "@/lib/assistente/metricas";
import type { ContextoDeConsulta } from "@/lib/assistente/metricas/tipos";

const CTX_MANAGER: ContextoDeConsulta = { orgId: "org-1", papel: "manager", idioma: "pt-BR", fuso: "America/Sao_Paulo", agoraIso: "2026-10-14T09:00:00-03:00", bancoDosModulos: {} as any };

const stageId = "11111111-2222-3333-4444-555555555555";
const pipelineId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("taxa_de_ganho_por_etapa", () => {
  it("junção por nome e sem etapa_id", async () => {
    const taxasPayload = { minimo_de_casos: 5, taxas: [{ etapa_id: stageId, total: 2, ganhos: 1, percentual: 0.5, sugestao: null }], tempo_na_etapa: { medida: "etapa atual", ancora: "x", base: "y", amostra: 0, limite: 0, truncado: false, etapas: [] } };
    const stagesPayload = [{ id: stageId, name: "Lead", position: 1, is_won: false, is_lost: false, expected_duration_hours: null }];
    const hTaxas = async () => new Response(JSON.stringify({ data: taxasPayload }), { status: 200, headers: { "content-type": "application/json" } });
    const hEtapas = async () => new Response(JSON.stringify({ data: stagesPayload }), { status: 200, headers: { "content-type": "application/json" } });
    sobreporHandlersDeTaxaDeGanho({ taxas: hTaxas, etapas: hEtapas });
    const r = await metricaTaxaDeGanhoPorEtapa.executar(CTX_MANAGER, { pipeline_id: pipelineId, dias: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const t = JSON.stringify(r.dados);
      expect(t).toContain("Lead");
      expect(t).not.toContain(stageId);
      expect((r.dados as any).taxas[0].nome).toBe("Lead");
    }
  });

  it("etapa arquivada recebe nome", async () => {
    const taxasPayload = { minimo_de_casos: 5, taxas: [{ etapa_id: stageId, total: 1, ganhos: 0, percentual: null, sugestao: null }], tempo_na_etapa: { medida: "etapa atual", ancora: "x", base: "y", amostra: 0, limite: 0, truncado: false, etapas: [] } };
    const hTaxas = async () => new Response(JSON.stringify({ data: taxasPayload }), { status: 200, headers: { "content-type": "application/json" } });
    const hEtapas = async () => new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
    sobreporHandlersDeTaxaDeGanho({ taxas: hTaxas, etapas: hEtapas });
    const r = await metricaTaxaDeGanhoPorEtapa.executar(CTX_MANAGER, { pipeline_id: pipelineId, dias: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.dados as any).taxas[0].nome).toBe("(etapa arquivada)");
  });

  it("amostra zero → dados null + aviso", async () => {
    const taxasPayload = { minimo_de_casos: 5, taxas: [{ etapa_id: stageId, total: 0, ganhos: 0, percentual: null, sugestao: null }], tempo_na_etapa: { medida: "etapa atual", ancora: "x", base: "y", amostra: 0, limite: 0, truncado: false, etapas: [] } };
    const stagesPayload = [{ id: stageId, name: "Lead", position: 1, is_won: false, is_lost: false, expected_duration_hours: null }];
    const hTaxas = async () => new Response(JSON.stringify({ data: taxasPayload }), { status: 200, headers: { "content-type": "application/json" } });
    const hEtapas = async () => new Response(JSON.stringify({ data: stagesPayload }), { status: 200, headers: { "content-type": "application/json" } });
    sobreporHandlersDeTaxaDeGanho({ taxas: hTaxas, etapas: hEtapas });
    const r = await metricaTaxaDeGanhoPorEtapa.executar(CTX_MANAGER, { pipeline_id: pipelineId, dias: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados).toBeNull();
  });

  it("funil vazio → aviso de não encontrado", async () => {
    const hTaxas = async () => new Response(JSON.stringify({ data: { minimo_de_casos: 5, taxas: [], tempo_na_etapa: { medida: "etapa atual", ancora: "x", base: "y", amostra: 0, limite: 0, truncado: false, etapas: [] } } }), { status: 200, headers: { "content-type": "application/json" } });
    const hEtapas = async () => new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
    sobreporHandlersDeTaxaDeGanho({ taxas: hTaxas, etapas: hEtapas });
    const r = await metricaTaxaDeGanhoPorEtapa.executar(CTX_MANAGER, { pipeline_id: pipelineId, dias: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.dados).toBeNull(); expect(r.avisos.join()).toContain("Funil não encontrado ou sem etapas."); }
  });
});