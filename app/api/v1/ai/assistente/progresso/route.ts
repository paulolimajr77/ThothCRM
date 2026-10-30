/**
 * GET /api/v1/ai/assistente/progresso?turn_id=…&desde=N — o que o assistente já
 * fez NESTE turno (tela aberta, teste começou, resultado do teste).
 *
 * Só lê a memória do processo (`progresso-do-turno.ts`); não toca no banco nem
 * no modelo. Organização e pessoa saem da sessão, nunca da query: ninguém lê o
 * andamento de outro. Sem nada para mostrar devolve lista vazia, nunca erro.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { recusarSeAssistenteDesligado } from "@/lib/assistente/ligado";
import { lerEventosDoTurno } from "@/lib/assistente/progresso-do-turno";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";

const querySchema = z
  .object({
    turn_id: z.string().uuid(),
    desde: z.coerce.number().int().min(0).max(1000).default(0),
  })
  .strict();

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "assistente" });
  if (!authz.ok) return authz.response;
  const desligado = await recusarSeAssistenteDesligado(authz.org.orgId, requestId, authz.user.idioma);
  if (desligado) return desligado;

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return fail("validation_failed", traduzir("Query inválida.", authz.user.idioma), 422, { requestId });
  }
  const { eventos, proximo } = lerEventosDoTurno(
    authz.org.orgId,
    authz.user.id,
    parsed.data.turn_id,
    parsed.data.desde,
  );
  return ok({ eventos, proximo }, { requestId });
}
