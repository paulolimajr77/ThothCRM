/**
 * Métrica `tempo_ate_primeiro_valor` — papel admin. Quanto tempo cada empresa
 * leva da criação até o primeiro valor real: primeiro agente publicado, primeira
 * resposta da IA a um cliente e o estado das propostas do assistente.
 *
 * Cada organização é um cliente diferente que paga: `organization_id` é
 * filtrado explicitamente em toda leitura (doutrina do repositório). A RLS é
 * o cinto, não o único filtro.
 *
 * `dias_ate_primeiro_agente_publicado` = dias entre `organizations.created_at`
 * e o `published_at` mais antigo de `ai_agent_versions` com `published_at` não nulo.
 * `dias_ate_primeira_resposta_da_ia` = dias entre `organizations.created_at`
 * e o `created_at` mais antigo de `messages` de saída enviada pela IA
 * (`direction = 'outbound'` e `sent_via = 'ai'`).
 * `propostas_do_assistente` = contagem por estado de `config_proposals`
 * (inclui expirada).
 *
 * O papel mínimo é admin porque `config_proposals` só é legível por
 * administrador (RLS): um gestor ou atendente veria zeros que parecem verdade.
 * Para cada data: `null` quando o marco ainda não aconteceu (nunca 0).
 * Qualquer erro de leitura vira `{ ok: false }` — a mensagem do banco NUNCA sobe ao modelo.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { ContextoDeConsulta, DefinicaoDeMetrica } from "../tipos";

const ID = "tempo_ate_primeiro_valor";

const parametros = z.strictObject({});
export type ParametrosDeTempoAtePrimeiroValor = z.infer<typeof parametros>;

interface LinhaDoMarco {
  created_at: string | null;
  published_at: string | null;
}

interface LinhaProposta {
  status: string;
}

const MS_POR_DIA = 86_400_000;

const REGUA =
  "Papel admin (config_proposals só é lida por administrador); organização da sessão filtrada por organization_id. " +
  "dias_ate_primeiro_agente_publicado é dias entre organizations.created_at e o published_at mais antigo de ai_agent_versions. " +
  "dias_ate_primeira_resposta_da_ia é dias entre organizations.created_at e o created_at mais antigo de messages com direction 'outbound' e sent_via 'ai'. " +
  "null quando o marco ainda não aconteceu (nunca 0). " +
  "propostas_do_assistente conta pendentes, aprovadas, aplicadas, rejeitadas e expiradas de config_proposals.";

/** Dias entre o instante `de` (criação da organização) e o marco. */
function diasApos(deIso: string, marcoIso: string | null): number | null {
  if (!marcoIso) return null;
  const instanteDe = new Date(deIso).getTime();
  const instanteMarco = new Date(marcoIso).getTime();
  return Math.round((instanteMarco - instanteDe) / MS_POR_DIA);
}

export const metricaTempoAtePrimeiroValor: DefinicaoDeMetrica<ParametrosDeTempoAtePrimeiroValor> = {
  id: ID,
  descricao: "Quanto tempo a empresa levou até o primeiro agente no ar e a primeira resposta da IA.",
  papelMinimo: "admin",
  modulo: null,
  parametros,
  dimensoes: [],
  regua: REGUA,
  executar: async (ctx: ContextoDeConsulta) => {
    const db: SupabaseClient = ctx.bancoDosModulos;

    // ── Organização da sessão: data de criação (fonte confiável, nunca do modelo). ──
    const { data: orgLida, error: orgError } = await db
      .from("organizations")
      .select("created_at")
      .eq("id", ctx.orgId)
      .maybeSingle();
    if (orgError) {
      return { ok: false, metrica: ID, motivo: "indisponivel", detalhe: "não consegui ler a organização da sessão" };
    }
    const organizacao = orgLida as { created_at: string } | null;
    const criadoEm = organizacao?.created_at;
    if (!criadoEm) {
      return { ok: false, metrica: ID, motivo: "indisponivel", detalhe: "organização sem data de criação" };
    }

    // ── Primeiro agente publicado: menor published_at não nulo.
    // created_at é quando o rascunho nasce; published_at é quando foi ao ar.
    // Uma versão superseded ainda tem published_at preenchido e vale.
    const { data: agentes, error: agentesError } = await db
      .from("ai_agent_versions")
      .select("published_at")
      .eq("organization_id", ctx.orgId)
      .not("published_at", "is", null)
      .order("published_at", { ascending: true })
      .limit(1);
    if (agentesError) {
      return { ok: false, metrica: ID, motivo: "indisponivel", detalhe: "não consegui ler as versões de agente" };
    }
    const primeiroAgentePublicado = (agentes ?? [])[0] as LinhaDoMarco | undefined;
    const diasAgente = diasApos(criadoEm, primeiroAgentePublicado?.published_at ?? null);

    // ── Primeira resposta da IA: menor created_at de saída com sent_via 'ai'. ──
    const { data: mensagens, error: mensagensError } = await db
      .from("messages")
      .select("created_at")
      .eq("organization_id", ctx.orgId)
      .eq("direction", "outbound")
      .eq("sent_via", "ai")
      .order("created_at", { ascending: true })
      .limit(1);
    if (mensagensError) {
      return { ok: false, metrica: ID, motivo: "indisponivel", detalhe: "não consegui ler as mensagens" };
    }
    const primeiraRespostaIa = (mensagens ?? [])[0] as LinhaDoMarco | undefined;
    const diasRespostaIa = diasApos(criadoEm, primeiraRespostaIa?.created_at ?? null);

    // ── Propostas do assistente: contagem por estado, só desta organização. ──
    const { data: propostas, error: propostasError } = await db
      .from("config_proposals")
      .select("status")
      .eq("organization_id", ctx.orgId);
    if (propostasError) {
      return { ok: false, metrica: ID, motivo: "indisponivel", detalhe: "não consegui ler as propostas do assistente" };
    }

    const contagem = { pendente: 0, aprovada: 0, aplicada: 0, rejeitada: 0, expirada: 0 };
    for (const linha of (propostas ?? [])) {
      const st = (linha as LinhaProposta).status;
      if (st === "pendente") contagem.pendente += 1;
      else if (st === "aprovada") contagem.aprovada += 1;
      else if (st === "aplicada") contagem.aplicada += 1;
      else if (st === "rejeitada") contagem.rejeitada += 1;
      else if (st === "expirada") contagem.expirada += 1;
    }

    return {
      ok: true,
      metrica: ID,
      periodo: null,
      regua: REGUA,
      dados: {
        dias_ate_primeiro_agente_publicado: diasAgente,
        dias_ate_primeira_resposta_da_ia: diasRespostaIa,
        propostas_do_assistente: {
          pendente: contagem.pendente,
          aprovada: contagem.aprovada,
          aplicada: contagem.aplicada,
          rejeitada: contagem.rejeitada,
          expirada: contagem.expirada,
          total:
            contagem.pendente +
            contagem.aprovada +
            contagem.aplicada +
            contagem.rejeitada +
            contagem.expirada,
        },
      },
      avisos: [],
    };
  },
};
