/**
 * Regras de leitura e escrita do catálogo de portas do assistente interno.
 *
 * Ler: qualquer porta da empresa (GET), exceto prefixos proibidos, portas
 * proibidas exatas e sufixos proibidos (OAuth). Escrever: proibido por
 * padrão, liberado só o que está em ESCRITA_PERMITIDA (aprovada pelo Paulo).
 * Nenhum DELETE.
 */

import type { Metodo, PortaDoCatalogo } from "./tipos";
import { CATALOGO_DE_PORTAS } from "./catalogo.gerado";
import {
  AREAS_SO_LEITURA,
  ESCRITA_PERMITIDA,
  PREFIXOS_PROIBIDOS,
  PORTAS_PROIBIDAS,
  SUFIXOS_PROIBIDOS,
  casaComPrefixo,
  ehProibida,
} from "./listas";

/**
 * Verdadeiro se `id` existe no catálogo, expõe `GET`, não casa com nenhum
 * prefixo proibido, não é uma porta proibida exata e não termina com um
 * sufixo proibido (OAuth).
 */
export function portaDeLeituraPermitida(id: string): boolean {
  const porta = CATALOGO_DE_PORTAS.find((p) => p.id === id);
  if (!porta) return false;
  if (!porta.metodos.includes("GET")) return false;
  if (ehProibida(id)) return false;
  return true;
}

/**
 * Verdadeiro se a escrita em `id` com `metodo` é permitida.
 *
 * `DELETE` é sempre recusado (sem exceção). Para `POST`/`PATCH`/`PUT`:
 * - recusa se casar com PREFIXOS_PROIBIDOS, PORTAS_PROIBIDAS, sufixos
 *   proibidos ou AREAS_SO_LEITURA;
 * - senão, só se o par (porta, metodo) está em ESCRITA_PERMITIDA.
 */
/**
 * Portas que a rota aceita com o corpo VAZIO e, mesmo assim, aplicam (criam
 * registro em branco ou regravam ajustes). Medido na bateria de 30/10/2026:
 * o assistente não pode propor essas escritas sem dizer o que escrever.
 */
const EXIGEM_CORPO_PREENCHIDO: ReadonlySet<string> = new Set([
  "contacts POST",
  "companies POST",
  "financeiro/comandas POST",
  "settings/art15 PATCH",
  "settings/campanhas PATCH",
  "settings/prospeccao PATCH",
]);

/** `true` quando a porta exige corpo com ao menos um campo e o corpo veio vazio. */
export function corpoVazioRecusado(porta: string, metodo: string, corpo: unknown): boolean {
  if (!EXIGEM_CORPO_PREENCHIDO.has(`${porta} ${metodo}`)) return false;
  return corpo === null || typeof corpo !== "object" || Array.isArray(corpo) || Object.keys(corpo).length === 0;
}

/**
 * A escrita nesta porta manda mensagem a gente de fora ou age fora do sistema (`externo: true`)?
 * Nesse caso o pedido expresso NÃO vale: a mudança passa sempre pelo cartão de alerta, porque
 * mensagem enviada não se desfaz.
 */
export function escritaTemEfeitoFora(id: string, metodo: Metodo): boolean {
  return ESCRITA_PERMITIDA.some((e) => e.porta === id && e.metodo === metodo && e.externo === true);
}

export function escritaPermitida(
  id: string,
  metodo: Metodo,
): boolean {
  if (metodo === "DELETE") return false;
  if (metodo !== "POST" && metodo !== "PATCH" && metodo !== "PUT") return false;
  if (
    ehProibida(id) ||
    AREAS_SO_LEITURA.some((prefixo) => casaComPrefixo(id, prefixo))
  ) {
    return false;
  }
  return ESCRITA_PERMITIDA.some(
    (e) => e.porta === id && e.metodo === metodo,
  );
}

/**
 * Verdadeiro quando a ação do corpo está liberada para a porta.
 *
 * - Se a entrada de ESCRITA_PERMITIDA não tem `acoes`, devolve `true`.
 * - Se tem, devolve `true` só quando `corpo` é objeto (não array, não null)
 *   e `corpo.action` é string presente em `acoes`. Sem `action` ou com valor
 *   fora da lista, devolve `false`.
 */
export function acaoPermitida(
  porta: string,
  metodo: Metodo,
  corpo: unknown,
): boolean {
  const entrada = ESCRITA_PERMITIDA.find(
    (e) => e.porta === porta && e.metodo === metodo,
  );
  if (!entrada || !entrada.acoes) return true;
  if (
    typeof corpo !== "object" ||
    corpo === null ||
    Array.isArray(corpo)
  ) {
    return false;
  }
  const action = (corpo as Record<string, unknown>).action;
  return typeof action === "string" && entrada.acoes.includes(action);
}

// Reexporta as listas para consumo por outros módulos e testes.
export {
  AREAS_SO_LEITURA,
  ESCRITA_PERMITIDA,
  PREFIXOS_PROIBIDOS,
  PORTAS_PROIBIDAS,
  SUFIXOS_PROIBIDOS,
  casaComPrefixo,
  ehProibida,
};

/**
 * Verdadeiro se o método de escrita (POST/PATCH/PUT) é permitido para a porta.
 */
export function tipoDeMetodoPermitido(
  id: string,
  metodo: "POST" | "PATCH" | "PUT",
): boolean {
  return escritaPermitida(id, metodo);
}
