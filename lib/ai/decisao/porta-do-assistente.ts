/**
 * A CONSULTA DO ASSISTENTE, ESCOLHIDA PELO JEV — só observação.
 *
 * Quando `procurar_porta` (`lib/assistente/ferramentas/procurar-porta.ts`) acha
 * as candidatas por palavra-chave, este emissor pergunta ao Jev qual delas serve
 * à pergunta da equipe, e grava só a COMPARAÇÃO com a 1ª sugestão da busca
 * (`assistente.jev_porta`). A resposta do Jev NUNCA volta ao assistente: quem
 * chama dispara sem esperar (`void`), e a ferramenta devolve o mesmo de sempre.
 *
 * ═══ AS REGRAS QUE ESTE ARQUIVO GARANTE ═══
 *
 *  - Nunca lança. Qualquer falha (leitura do estado, rede, gravação) vira aviso
 *    em log, sem o texto da pergunta.
 *  - Jev desligado, sem aceite, tarefa pausada ou sem credencial: ZERO
 *    requisição e ZERO linha em `llm_calls` (o mesmo guarda de estado efetivo
 *    do ponto, `estadoEfetivoDaTarefa`, e o de `decidirNoPonto`).
 *  - O que sai para o fornecedor: a pergunta (até 200 caracteres, passada pelo
 *    `scrubMessage`) e, de cada candidata, o id e o resumo do catálogo. Nenhuma
 *    conversa de cliente, nenhum dado da organização.
 *  - O log leva ids de consulta, o booleano e o tempo — nunca a pergunta.
 */
import { costCents } from "@/lib/agent-engine/edge/llm/pricing";
import { logger } from "@/lib/logger";
import { scrubMessage } from "@/lib/sentry/scrub";
import { createAdminClient } from "@/lib/supabase/admin";

import { MODELO_DO_JEV, type FalhaDaDecisao, type Pergunta } from "./cliente";
import { lerConfigDoJev } from "./config";
import { podeTentar, registrarFalha, registrarSucesso } from "./disjuntor";
import { decidirNoPonto, type DependenciasDoPonto } from "./ponto";
import { PORTA_DO_ASSISTENTE, TAREFA_DA_PORTA_DO_ASSISTENTE, estadoEfetivoDaTarefa } from "./tarefas";
import { codigoDoErroDoJev } from "./textos";

type Admin = ReturnType<typeof createAdminClient>;

/** A pergunta da escolha: o id da consulta é a opção, e o resumo é o critério. */
const CHAVE_DA_PERGUNTA = "porta";
/** "Nenhuma serve" — a opção de saída, como no roteador. */
const NENHUMA = "nenhuma";
/** O mesmo teto que `procurar_porta` devolve (e que cabe folgado numa escolha). */
export const CANDIDATAS_NO_MAXIMO = 12;

export interface CandidataDaPorta {
  id: string;
  resumo: string;
}

export interface EntradaDaEscolhaDePorta {
  organizationId: string;
  /** O texto da pergunta da equipe ao assistente. Só vai ao Jev; nunca ao log. */
  pergunta: string;
  candidatas: readonly CandidataDaPorta[];
  /** O id que a busca por palavra pôs em 1º lugar. */
  primeiraDaBusca: string | null;
}

export interface DependenciasDaEscolhaDePorta extends DependenciasDoPonto {
  /** O cliente admin; injetado por teste. Default: `createAdminClient()`. */
  admin?: Admin;
}

/** A pergunta ao Jev, ou `null` quando não há escolha de verdade (menos de 2) ou há demais. */
export function perguntaDaPorta(candidatas: readonly CandidataDaPorta[]): Pergunta | null {
  if (candidatas.length < 2 || candidatas.length > CANDIDATAS_NO_MAXIMO) return null;
  if (new Set(candidatas.map((c) => c.id)).size !== candidatas.length) return null;
  const criterios: Record<string, string | null> = {};
  for (const c of candidatas) {
    if (c.id === NENHUMA) return null;
    criterios[c.id] = c.resumo.trim() === "" ? null : scrubMessage(c.resumo);
  }
  criterios[NENHUMA] = "Nenhuma das consultas acima serve para responder.";
  return {
    tipo: "choice",
    instrucao:
      "Qual destas consultas do sistema serve para responder à pergunta feita pela equipe da empresa ao seu assistente?",
    criterios,
  };
}

/**
 * Observa a escolha do Jev e registra a comparação. Devolve quando termina; quem
 * chama NÃO espera (`void`). Nunca lança.
 */
export async function observarEscolhaDePorta(
  entrada: EntradaDaEscolhaDePorta,
  deps: DependenciasDaEscolhaDePorta = {},
): Promise<void> {
  try {
    const pergunta = perguntaDaPorta(entrada.candidatas);
    if (pergunta === null) return;

    const admin = deps.admin ?? createAdminClient();
    // 1. Desligado, sem aceite ou tarefa pausada: nada sai e nada se grava.
    if ((await estadoDaPorta(admin, entrada.organizationId)) === "desligada") return;

    const alvo = { organizationId: entrada.organizationId, tarefa: PORTA_DO_ASSISTENTE.purpose };
    if (!podeTentar(alvo)) return;

    const inicio = Date.now();
    const r = await decidirNoPonto(
      {
        organizationId: entrada.organizationId,
        ponto: "porta_do_assistente",
        estado: scrubMessage(entrada.pergunta),
        perguntas: { [CHAVE_DA_PERGUNTA]: pergunta },
      },
      deps,
    );
    if (!r.ok) {
      registrarFalha(alvo, r.motivo, Date.now(), r.retryAfterMs);
      // `sem_credencial` é configuração, não falha: nada saiu e nada se conta.
      if (r.motivo !== "sem_credencial" && r.motivo !== "disjuntor_aberto") {
        logger.warn("o Jev não escolheu a consulta do assistente", {
          organization_id: entrada.organizationId,
          motivo: r.motivo,
        });
        await gravarFalha(admin, entrada.organizationId, r);
      }
      return;
    }

    const resposta = r.respostas[CHAVE_DA_PERGUNTA];
    const conhecida =
      resposta?.tipo === "choice" &&
      (resposta.escolha === NENHUMA || entrada.candidatas.some((c) => c.id === resposta.escolha));
    if (!conhecida || resposta?.tipo !== "choice") {
      // Resposta fora das opções: o custo foi pago, mas não há escolha a comparar.
      registrarFalha(alvo, "resposta_ilegivel");
      logger.warn("o Jev respondeu a consulta do assistente fora das opções", {
        organization_id: entrada.organizationId,
      });
      await gravarFalha(admin, entrada.organizationId, {
        ok: false,
        motivo: "resposta_ilegivel",
        exigeAcao: false,
        defeitoNosso: false,
        status: 200,
        latenciaMs: r.latenciaMs,
      });
      return;
    }
    registrarSucesso(alvo);
    await gravarCusto(admin, entrada.organizationId, r);

    const jevEscolheu = resposta.escolha === NENHUMA ? null : resposta.escolha;
    logger.info("assistente.jev_porta", {
      jev_escolheu: jevEscolheu,
      primeira_da_busca: entrada.primeiraDaBusca,
      coincidem: jevEscolheu !== null && jevEscolheu === entrada.primeiraDaBusca,
      ms: Date.now() - inicio,
    });
  } catch (erro) {
    logger.warn("a observação da consulta do assistente falhou; o assistente segue como sempre", {
      organization_id: entrada.organizationId,
      erro: erro instanceof Error ? erro.name : typeof erro,
    });
  }
}

/**
 * O estado EFETIVO da tarefa para a organização: interruptor, aceite e o que a
 * empresa escolheu. Leitura que falha lança — quem chama está em `try` e sai.
 */
async function estadoDaPorta(admin: Admin, organizationId: string) {
  const { data, error } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return estadoEfetivoDaTarefa(lerConfigDoJev(data?.settings ?? null), TAREFA_DA_PORTA_DO_ASSISTENTE);
}

/** A chamada que deu certo vira linha de custo em Uso de IA (molde de `./afirmacao-de-fato`). */
async function gravarCusto(
  admin: Admin,
  organizationId: string,
  r: { modelo: string; latenciaMs: number; uso: { tokensDeEntrada: number; tokensDeSaida: number } },
): Promise<void> {
  const { error } = await admin.from("llm_calls").insert({
    organization_id: organizationId,
    contact_id: null,
    agent_id: null,
    purpose: PORTA_DO_ASSISTENTE.purpose,
    provider: "typesafe",
    model: `typesafe/${r.modelo}`,
    input_tokens: r.uso.tokensDeEntrada,
    output_tokens: r.uso.tokensDeSaida,
    cost_cents: costCents(r.modelo, {
      inputTokens: r.uso.tokensDeEntrada,
      outputTokens: r.uso.tokensDeSaida,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }),
    latency_ms: r.latenciaMs,
    status: "ok",
    origem_da_escolha: "jev_observacao",
  });
  if (error) {
    logger.warn("custo da escolha de consulta do assistente não foi gravado", {
      organization_id: organizationId,
      erro: error.message.slice(0, 200),
    });
  }
}

/** A falha vira linha em Execuções com `error_code` (`jev_*`). */
async function gravarFalha(admin: Admin, organizationId: string, falha: FalhaDaDecisao): Promise<void> {
  const { error } = await admin.from("llm_calls").insert({
    organization_id: organizationId,
    contact_id: null,
    agent_id: null,
    purpose: PORTA_DO_ASSISTENTE.purpose,
    provider: "typesafe",
    model: `typesafe/${MODELO_DO_JEV}`,
    input_tokens: 0,
    output_tokens: 0,
    cost_cents: 0,
    latency_ms: falha.latenciaMs ?? null,
    status: "erro",
    error_code: codigoDoErroDoJev(falha.motivo),
    http_status: falha.status,
    origem_da_escolha: "jev_observacao",
  });
  if (error) {
    logger.warn("falha da escolha de consulta do assistente não foi gravada", {
      organization_id: organizationId,
      erro: error.message.slice(0, 200),
    });
  }
}
