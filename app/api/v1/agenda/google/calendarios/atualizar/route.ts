import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { resolveAuthDual, tetoDeEscritaDoToken } from "@/lib/api/auth-dual";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshCatalog } from "@/lib/agenda/google/calendar-executor";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
export async function POST(req: NextRequest) {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const requestId = randomUUID();
  const authz = await resolveAuthDual(req, {
    requestId,
    resource: "agenda",
    role: "agent",
    scope: "mcp:write",
  });
  if (!authz.ok) return authz.response;
  const teto = await tetoDeEscritaDoToken(authz, "agenda", requestId);
  if (teto) return teto;
  const parsed = z.object({ connection_id: z.uuid() }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("validation_failed", "Confira a conexão escolhida.", 422, { requestId });
  const { data, error } = await authz.supabase
    .from("calendar_connections")
    .select("id")
    .eq("organization_id", authz.organizationId)
    .eq("user_id", authz.actor.type === "user" ? authz.actor.id : null)
    .eq("id", parsed.data.connection_id)
    .maybeSingle();
  if (error || !data) return fail("not_found", "Conexão indisponível.", 404, { requestId });
  try {
    await refreshCatalog(createAdminClient(), authz.organizationId, data.id);
    void audit({ action: "agenda.google_catalog_updated", actorUserId: authz.actor.type === "user" ? authz.actor.id : null, actorApiTokenId: authz.apiTokenId ?? null, organizationId: authz.organizationId, resourceType: "calendar_connection", resourceId: data.id, requestId });
    return ok({ refreshed: true }, { requestId });
  } catch {
    return fail("conflict", "Não foi possível atualizar. Confira a conexão e tente novamente.", 409, { requestId });
  }
}
