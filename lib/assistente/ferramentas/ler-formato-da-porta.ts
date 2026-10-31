// @vitest-environment node
import { tool, type Tool } from "ai";
import { z } from "zod";

import { protegida } from "./protegida";
import type { EntradaDasFerramentas } from "./tipos";
import { esquemaDoCorpo } from "./validar-antes-de-propor";

const esquemaDeEntrada = z.strictObject({
  porta: z.string().min(1).max(200),
  metodo: z.enum(["POST", "PATCH", "PUT"]),
});

/** O formato volta inteiro até este tamanho; acima, o modelo é avisado e lê a descrição da porta. */
const LIMITE_DO_FORMATO_EM_BYTES = 24_000;

/** Tira do JSON Schema o que só pesa (`$schema`, `additionalProperties: false`), em qualquer nível. */
function enxugar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(enxugar);
  if (valor === null || typeof valor !== "object") return valor;
  const saida: Record<string, unknown> = {};
  for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
    if (chave === "$schema" || (chave === "additionalProperties" && v === false)) continue;
    saida[chave] = enxugar(v);
  }
  return saida;
}

/**
 * O formato EXATO do corpo que a rota aceita, tirado do MESMO esquema que confere o cartão antes de
 * gravar: nada escrito à mão, então não envelhece. Só as portas com esquema registrado têm formato.
 */
export function formatoDoCorpo(porta: string, metodo: string):
  | { ok: true; formato: unknown }
  | { ok: false; motivo: "sem_formato_registrado" | "formato_grande_demais" } {
  const esquema = esquemaDoCorpo(porta, metodo);
  if (esquema === undefined) return { ok: false, motivo: "sem_formato_registrado" };
  const formato = enxugar(z.toJSONSchema(esquema, { unrepresentable: "any", io: "input" }));
  if (JSON.stringify(formato).length > LIMITE_DO_FORMATO_EM_BYTES) return { ok: false, motivo: "formato_grande_demais" };
  return { ok: true, formato };
}

export function criarLerFormatoDaPorta(_entrada: EntradaDasFerramentas): Tool {
  return tool({
    description:
      "Devolve o formato EXATO do corpo de uma escrita (campos, tipos, obrigatórios, valores aceitos e os tipos " +
      "de passo/nó), tirado do mesmo esquema que a rota usa. Chame ANTES de propor uma escrita numa porta " +
      "(`porta` = id da porta, `metodo` = POST, PATCH ou PUT) e monte o corpo exatamente assim: foi por não " +
      "olhar o formato que faltaram passos como mover o card de etapa num follow-up. Se voltar " +
      "`sem_formato_registrado`, a porta ainda não tem formato: use a descrição dela e a rota confere.",
    inputSchema: esquemaDeEntrada,
    execute: protegida("ler_formato_da_porta", esquemaDeEntrada, async (e) => ({
      porta: e.porta,
      metodo: e.metodo,
      ...formatoDoCorpo(e.porta, e.metodo),
    })),
  });
}
