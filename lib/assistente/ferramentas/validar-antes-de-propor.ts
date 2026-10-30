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
import { z, type ZodType } from "zod";

import { versionPatchSchema } from "@/lib/ai/agents/validation";
import { createFollowupFlowSchema, patchFollowupFlowSchema } from "@/lib/followup/api-schemas";

// Espelho dos campos OBRIGATÓRIOS de `agenda/tipos` (a rota não exporta o esquema; ela continua sendo a autoridade).
const tipoDeAgendamentoPost = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.enum(["consulta", "procedimento", "retorno", "visita", "vistoria", "reuniao", "call", "orcamento", "demonstracao", "outro"]),
  duration_minutes: z.number().int().min(5).max(1440),
  location_kind: z.enum(["in_person", "phone", "whatsapp", "video_link", "google_meet"]),
}).passthrough();

const ESQUEMAS: Record<string, ZodType> = {
  "ai/followup-flows|POST": createFollowupFlowSchema,
  "ai/followup-flows/:id|PATCH": patchFollowupFlowSchema,
  "ai/agents/:id/versions/:vid|PATCH": versionPatchSchema,
  "agenda/tipos|POST": tipoDeAgendamentoPost,
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
