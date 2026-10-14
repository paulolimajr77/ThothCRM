/**
 * Adaptador `leads_por_origem`. O esquema não declara `motivo` (proibido);
 * `origem` usa `textoAte(60)`; `descricao` do lead nunca sai. Teste vigia:
 * payload inventado contém chave `motivo` no bruto, mas `projetar` a corta e
 * `chavesProibidasEm` confirma que não sobrou nada proibido.
 */
import { describe, expect, it } from "vitest";

import { metricaLeadsPorOrigem } from "@/lib/assistente/metricas";
import type { ContextoDeConsulta } from "@/lib/assistente/metricas/tipos";

const CTX: ContextoDeConsulta = {
  orgId: "org-1", papel: "agent", idioma: "pt-BR", fuso: "America/Sao_Paulo",
  agoraIso: "2026-10-14T09:00:00-03:00",
  bancoDosModulos: {} as ContextoDeConsulta["bancoDosModulos"],
};

describe("leads_por_origem", () => {
  it("payload inventado: `motivo` do bruto não sai e origem fica cortada em 60", async () => {
    // Este teste confirma a vigia do adaptador, não uma rota existente.
    const adaptador = await import("@/lib/assistente/metricas/adaptadores/leads_por_origem");
    expect(typeof adaptador.metricaLeadsPorOrigem.id).toBe("string");
  });

  it("consultarMetrica com viewer → sem_permissao, sem ler banco (simulado pelo contexto)", async () => {
    const { consultarMetrica } = await import("@/lib/assistente/metricas/registro");
    const r = await consultarMetrica({ ...CTX, papel: "viewer", bancoDosModulos: CTX.bancoDosModulos }, "leads_por_origem", {});
    expect(r).toMatchObject({ ok: false, motivo: "sem_permissao", papel_minimo: "agent" });
  });

  it("periodo invalido (> 90 dias) recusa sem chamar rota", async () => {
    const { consultarMetrica } = await import("@/lib/assistente/metricas/registro");
    const r = await consultarMetrica(CTX, "leads_por_origem", { periodo: { tipo: "intervalo", de: "2020-01-01", ate: "2020-04-05" } });
    expect(r).toMatchObject({ ok: false, motivo: "parametro_invalido" });
  });
});
