import type { NextRequest } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

import { chamarRotaPorDentro, traduzirResposta } from "../chamar-rota";
import { chavesProibidasEm, projetar } from "../projecao";
import { diasInclusive, PeriodoSolicitado, resolverPeriodo } from "../periodo";
import { AVISO_TZ_UTC_USO, acimaDe90 } from "./datas-utc";
import type { ContextoDeConsulta, DefinicaoDeMetrica, ResultadoDeMetrica } from "../tipos";

const ID = "uso_de_ia";

const parametros = z.strictObject({ periodo: PeriodoSolicitado.optional() });
export type ParametrosDeUsoDeIa = z.infer<typeof parametros>;

const serie = z.array(z.object({ day: z.string(), value: z.number().int().min(0) }));

const esquema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  totals: z.object({
    cost_cents: z.number().min(0),
    total_tokens: z.number().int().min(0),
    invocations: z.number().int().min(0),
    input_tokens: z.number().int().min(0),
    cache_read_tokens: z.number().int().min(0),
    agent_turns: z.number().int().min(0),
    avg_cost_per_turn_cents: z.number().min(0).nullable(),
    p50_latency_ms: z.number().min(0).nullable(),
    p95_latency_ms: z.number().min(0).nullable(),
  }),
  series: z.object({ cost_cents: serie, total_tokens: serie }),
  by_kind: z.record(z.string().max(64), z.number().int().min(0)),
});

const REGUA =
  "Fonte ?/api/v1/ai/usage, papel manager; dias em UTC, data final INCLUSIVA, teto 90 dias. " +
  "cost_cents é em centavos da moeda de preço do provedor e é MÍNIMO (chamada sem preço não soma). " +
  "cache_hit_rate vira null sem tokens de entrada. Taxa de passagem para humano não é desta fonte (evolucao_da_ia).";

type Handler = (req: NextRequest) => Promise<Response>;
let handlerSobreposto: Handler | null = null;
export function sobreporHandlerDeUsoDeIa(handler: Handler | null): void { handlerSobreposto = handler; }
async function handlerAtual(): Promise<Handler> {
  if (handlerSobreposto) return handlerSobreposto;
  const modulo = await import("@/app/api/v1/ai/usage/route");
  return modulo.GET;
}

export const metricaUsoDeIa: DefinicaoDeMetrica<ParametrosDeUsoDeIa> = {
  id: ID,
  descricao: "Uso e custo de IA no período: tokens, chamadas, latência e custo por modo.",
  papelMinimo: "manager",
  modulo: null,
  parametros,
  dimensoes: ["periodo", "modo", "serie"],
  regua: REGUA,
  executar: async (ctx, params) => {
    const solicitado = params.periodo ?? { tipo: "semana_passada" as const };
    const periodo = resolverPeriodo(solicitado, ctx.agoraIso, ctx.fuso, ctx.idioma);
    if (acimaDe90(diasInclusive(periodo.de, periodo.ateInclusivo), 90)) {
      return { ok: false, metrica: ID, motivo: "parametro_invalido", detalhe: "o período máximo desta fonte é 90 dias" };
    }
    const resposta = await chamarRotaPorDentro(await handlerAtual(), "/api/v1/ai/usage", {
      from: periodo.de,
      to: periodo.ateInclusivo,
    });
    const veredito = traduzirResposta(resposta, "manager");
    if (!veredito.ok) return { metrica: ID, ...veredito };

    const projetado = projetar(esquema, veredito.dados);
    if (!projetado.ok) {
      return { ok: false, metrica: ID, motivo: "indisponivel", detalhe: "a rota respondeu num formato inesperado" };
    }
    const proibidas = chavesProibidasEm(projetado.dados);
    if (proibidas.length > 0) {
      logger.warn("assistente.metricas.chave_proibida_no_resultado", { metrica: ID, chaves: proibidas });
      return { ok: false, metrica: ID, motivo: "indisponivel", detalhe: "a resposta trouxe campos que não podem sair" };
    }

    const avisos: string[] = [AVISO_TZ_UTC_USO];
    if (projetado.dados.totals.invocations === 0) {
      return { ok: true, metrica: ID, periodo, regua: REGUA, dados: null, avisos: avisos.concat(["Sem chamadas de IA no período."]) };
    }
    return { ok: true, metrica: ID, periodo, regua: REGUA, dados: projetado.dados, avisos };
  },
};