// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { metricaEtiquetas, sobreporHandlerDeEtiquetas } from "@/lib/assistente/metricas";
import { consultarMetrica } from "@/lib/assistente/metricas/registro";
import type { HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";
import type { ContextoDeConsulta } from "@/lib/assistente/metricas/tipos";

const CTX_VIEWER: ContextoDeConsulta = { orgId: "org-1", papel: "viewer", idioma: "pt-BR", fuso: "America/Sao_Paulo", agoraIso: "2026-10-14T09:00:00-03:00", bancoDosModulos: {} as any };

function handlerDe(status: number, corpo: unknown, captura?: { url?: string }) {
  const handler: HandlerDeRota = async (req) => { if (captura) captura.url = req.url; return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } }); };
  return handler;
}

const payloadValido = () => ({
  janela: { de: "2026-10-07", ate: "2026-10-14", tz: "America/Sao_Paulo" },
  linhas: [{ etiqueta: "Site", conversas: 2, abertas: 1, resolvidas: 1, espera_media_segundos: 5, fatia: 100 }],
  total_etiquetagens: 2,
  sem_dados: false,
  motivo: null,
  truncado: false,
});

describe("etiquetas — adapter", () => {
  it("URL capturada (de, ate inclusivo, tz)", async () => {
    const captura: { url?: string } = {};
    sobreporHandlerDeEtiquetas(handlerDe(200, { data: payloadValido() }, captura));
    await metricaEtiquetas.executar(CTX_VIEWER, {});
    const u = new URL(captura.url ?? "");
    expect(u.searchParams.get("de")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(u.searchParams.get("ate")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(u.searchParams.get("tz")).toBe("America/Sao_Paulo");
  });

  it("motivo nunca sai no resultado", async () => {
    sobreporHandlerDeEtiquetas(handlerDe(200, { data: payloadValido() }));
    const r = await metricaEtiquetas.executar(CTX_VIEWER, {});
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.stringify(r.dados)).not.toContain("\"motivo\"");
  });

  it("amostra zero (sem dados) → dados null + aviso", async () => {
    sobreporHandlerDeEtiquetas(handlerDe(200, { data: { ...payloadValido(), linhas: [], total_etiquetagens: 0, sem_dados: true, motivo: "nenhuma_conversa_com_etiqueta_no_periodo" } }));
    const r = await metricaEtiquetas.executar(CTX_VIEWER, {});
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.dados).toBeNull(); expect(r.avisos.join()).toContain("Sem conversas com etiqueta no período."); }
  });

  it("recusa >90 dias SEM chamar rota (consultarMetrica)", async () => {
    const h = vi.fn(handlerDe(200, { data: payloadValido() }));
    sobreporHandlerDeEtiquetas(h);
    const r = await consultarMetrica(CTX_VIEWER, "etiquetas", { periodo: { tipo: "intervalo", de: "2020-01-01", ate: "2021-02-01" } });
    expect(r).toMatchObject({ ok: false, motivo: "parametro_invalido" });
    expect(h).not.toHaveBeenCalled();
  });

  it("403 → sem_permissao", async () => {
    sobreporHandlerDeEtiquetas(handlerDe(403, {}));
    const r = await metricaEtiquetas.executar(CTX_VIEWER, {});
    expect(r).toMatchObject({ ok: false, motivo: "sem_permissao" });
  });
});
PY