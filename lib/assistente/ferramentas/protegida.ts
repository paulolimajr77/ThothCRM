/**
 * O invólucro de toda ferramenta do assistente: o `execute` NUNCA lança.
 *
 * Entrada que não cabe no esquema (o SDK valida antes, mas quem chama o
 * `execute` direto não passa por ele) vira `parametro_invalido`; qualquer
 * exceção do corpo vira `indisponivel` — o erro é registrado no log, e a
 * mensagem dele NUNCA sobe ao modelo (pode trazer texto do banco).
 *
 * Observabilidade: após cada execução (sucesso, parametro_invalido, falha
 * devolvida pelo corpo ou exceção), grava uma linha
 * `assistente.ferramentas.resultado` com ferramenta, ok, motivo (só quando
 * !ok), status (só se existir), porta (só se a entrada validada tiver uma
 * string em `porta`) e ms. Nunca registra valores, filtros, corpo, pergunta,
 * mensagem de erro nem dados devolvidos — podem conter dado de cliente e o
 * log sai para o Sentry.
 */
import type { z } from "zod";

import { logger } from "@/lib/logger";

import type { FalhaDeFerramenta } from "./tipos";

export function protegida<E extends z.ZodType, S>(
  ferramenta: string,
  esquema: E,
  corpo: (entrada: z.infer<E>) => Promise<S>,
): (bruto: unknown) => Promise<S | FalhaDeFerramenta> {
  return async (bruto: unknown) => {
    const inicio = Date.now();
    try {
      const validacao = esquema.safeParse(bruto);
      if (!validacao.success) {
        logger.info("assistente.ferramentas.resultado", {
          ferramenta,
          ok: false,
          motivo: "parametro_invalido",
          ms: Date.now() - inicio,
        });
        return { ok: false, motivo: "parametro_invalido" } as const;
      }
      const entrada = validacao.data;
      const resultado = await corpo(entrada);
      const ms = Date.now() - inicio;

      const ehFalha =
        typeof resultado === "object" &&
        resultado !== null &&
        (resultado as unknown as { ok?: unknown }).ok === false;

      // Registra o resultado sem vazar dado de cliente: só campos seguros.
      const campos: Record<string, unknown> = { ferramenta, ok: !ehFalha, ms };
      if (ehFalha) {
        const falha = resultado as { motivo?: unknown; status?: unknown };
        campos.motivo = falha.motivo;
        if (typeof falha.status === "number") {
          campos.status = falha.status;
        }
      }
      // `porta` é o id do modelo do caminho (ex.: :id), não o valor do cliente.
      // Só lida quando a entrada validada é um objeto com `porta` string
      // (ex.: `ler_porta`, `propor_mudanca`). Uma entrada string (`"abc"`)
      // não gera `porta`.
      if (
        entrada !== null &&
        typeof entrada === "object" &&
        typeof (entrada as unknown as { porta?: unknown }).porta === "string"
      ) {
        campos.porta = (entrada as unknown as { porta: string }).porta;
      }

      logger.info("assistente.ferramentas.resultado", campos);
      return resultado;
    } catch (erro) {
      logger.warn("assistente.ferramentas.falhou", {
        ferramenta,
        detalhe: erro instanceof Error ? erro.message : String(erro),
      });
      logger.info("assistente.ferramentas.resultado", {
        ferramenta,
        ok: false,
        motivo: "indisponivel",
        ms: Date.now() - inicio,
      });
      return { ok: false, motivo: "indisponivel" } as const;
    }
  };
}
