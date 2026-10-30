/**
 * Confere o CORPO de uma proposta com o MESMO esquema que a rota usa, ANTES de gravar o cartão.
 *
 * Sem isto, um corpo inválido (ex.: passo do follow-up com texto de comparação vazio) virava um cartão
 * que a pessoa aprovava e que falhava com "422 validation_failed": a pessoa não entende, e o cartão
 * aprovado não se rejeita mais. Agora a recusa volta ao ASSISTENTE, com o campo e o motivo, e ele
 * corrige e propõe de novo; a pessoa nunca vê o cartão quebrado.
 *
 * Só cobre as portas cujo esquema a rota exporta (a rota continua sendo a autoridade: se o esquema
 * daqui deixar passar algo, a rota recusa como antes).
 */
import type { ZodType } from "zod";

import { versionPatchSchema } from "@/lib/ai/agents/validation";
import { createFollowupFlowSchema, patchFollowupFlowSchema } from "@/lib/followup/api-schemas";

const ESQUEMAS: Record<string, ZodType> = {
  "ai/followup-flows|POST": createFollowupFlowSchema,
  "ai/followup-flows/:id|PATCH": patchFollowupFlowSchema,
  "ai/agents/:id/versions/:vid|PATCH": versionPatchSchema,
};

const MAXIMO_DE_PROBLEMAS = 5;

/** `null` = nada a recusar; texto = o que está errado, no formato "campo: motivo". */
export function problemasDoCorpo(porta: string, metodo: string, corpo: unknown): string | null {
  const esquema = ESQUEMAS[`${porta}|${metodo}`];
  if (esquema === undefined) return null;
  const r = esquema.safeParse(corpo ?? {});
  if (r.success) return null;
  return r.error.issues
    .slice(0, MAXIMO_DE_PROBLEMAS)
    .map((p) => `${p.path.length > 0 ? p.path.join(".") : "(corpo)"}: ${p.message}`)
    .join("; ");
}
