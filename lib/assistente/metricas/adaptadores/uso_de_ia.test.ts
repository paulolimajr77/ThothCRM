// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { metricaUsoDeIa, sobreporHandlerDeUsoDeIa } from "@/lib/assistente/metricas";
import { consultarMetrica } from "@/lib/assistente/metricas/registro";
import type { HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";
import type { ContextoDeConsulta } from "@/lib/assistente/metricas/tipos";

const CTX_MANAGER: ContextoDeConsulta = { orgId: "org-1", papel: "manager", idioma: "pt-BR", fuso: "America/Sao_Paulo", agoraIso: "2026-10-14T09:00:00-03:00", bancoDosModulos: {} as any };

function handlerDe(status: number, corpo: unknown, captura?: { url?: string }) {
  const handler: HandlerDeRota = async (req) => { if (captura) captura.url = req.url; return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } }); };
  return handler;
}

const payload = () => ({
  range: { from: "2026-10-07", to: "2026-10-14" },
  totals: { cost_cents: 1.5, total_tokens: 10, invocations: 1, input_tokens: 0, cache_read_tokens: 0, agent_turns: 1, avg_cost_per_turn_cents: 1.5, p50_latency_ms: 10, p95_latency_ms: 20 },
  series: { cost_cents: [], total_tokens: [] },
  by_kind: { turns: 1 },
});

describe("uso_de_ia", () => {
  it("URL e warnings", async () => {
    const captura: { url?: string } = {};
    sobreporHandlerDeUsoDeIa(handlerDe(200, { data: payload() }, captura));
    const r = await metricaUsoDeIa.executar(CTX_MANAGER, {});
    expect(new URL(captura.url ?? "").searchParams.has("agent_id")).toBe(false);
    const u = new URL(captura.url ?? "");
    expect(u.searchParams.get("from")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(u.searchParams.get("to")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.avisos.join()).toContain("UTC");
  });

  it("recusa >90 dias SEM chamar rota", async () => {
    const h = vi.fn(handlerDe(200, { data: payload() }));
    sobreporHandlerDeUsoDeIa(h);
    const r = await consultarMetrica(CTX_MANAGER, "uso_de_ia", { periodo: { tipo: "intervalo", de: "2020-01-01", ate: "2021-02-01" } });
    expect(r).toMatchObject({ ok: false, motivo: "parametro_invalido" });
    expect(h).not.toHaveBeenCalled();
  });

  it("amostra zero", async () => {
    const p = payload(); p.totals.invocations = 0;
    sobreporHandlerDeUsoDeIa(handlerDe(200, { data: p }));
    const r = await metricaUsoDeIa.executar(CTX_MANAGER, {});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados).toBeNull();
  });

  it("403", async () => {
    sobreporHandlerDeUsoDeIa(handlerDe(403, {}));
    const r = await metricaUsoDeIa.executar(CTX_MANAGER, {});
    expect(r).toMatchObject({ ok: false, motivo: "sem_permissao" });
  });
});