import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { resolveAuthDual, tetoDeEscritaDoToken } from "@/lib/api/auth-dual";
import { IDIOMA_PADRAO } from "@/lib/i18n/idiomas";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { coverageSchema } from "@/lib/agenda/google/sync-model";
import { googleRpc } from "@/lib/agenda/google/sync-store";
import { canReadCalendar, canWriteCalendar } from "@/lib/agenda/google/transport";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { traduzir } from "@/lib/i18n/dicionario";

export async function GET(req: NextRequest) {
  const requestId = randomUUID();
  const authz = await resolveAuthDual(req, {
    requestId,
    resource: "agenda",
    role: "agent",
    scope: "mcp:read",
  });
  if (!authz.ok) return authz.response;
  const teto = await tetoDeEscritaDoToken(authz, "agenda", requestId);
  if (teto) return teto;
  const t = (texto: string) => traduzir(texto, authz.idioma ?? IDIOMA_PADRAO);
  const db = authz.supabase;
  const { data: connections, error } = await db
    .from("calendar_connections")
    .select("id,account_email,status,last_sync_error,calendar_selection_revision::text")
    .eq("organization_id", authz.organizationId)
    .eq("user_id", authz.actor.type === "user" ? authz.actor.id : null)
    .eq("provider", "google_calendar")
    .order("id");
  if (error)
    return fail("internal_error", t("Não foi possível carregar suas agendas."), 500, { requestId });
  if (!connections?.length) return ok({ connections: [], calendars: [] }, { requestId });
  const { data: calendars, error: ce } = await db
    .from("calendar_connection_calendars")
    .select(
      "id,connection_id,name,time_zone,is_primary,counts_for_conflicts,is_destination,access_role,allowed_conference_types,available,last_sync_at,sync_error,sync_coverage,sync_cursor,catalog_checked_at",
    )
    .eq("organization_id", authz.organizationId)
    .in(
      "connection_id",
      connections.map((c) => c.id),
    )
    .order("name");
  if (ce)
    return fail("internal_error", t("Não foi possível carregar suas agendas."), 500, { requestId });
  return ok(
    {
      connections: connections.map((c) => ({
        ...c,
        calendar_selection_revision: String(c.calendar_selection_revision),
      })),
      calendars: (calendars ?? []).map((c) => ({
        ...c,
        sync_cursor: undefined,
        sync_coverage: coverageSchema.safeParse(c.sync_coverage).success
          ? coverageSchema.parse(c.sync_coverage)
          : null,
        reading: !!c.sync_cursor,
        can_read:
          c.available &&
          connections.some((x) => x.id === c.connection_id && x.status === "healthy") &&
          canReadCalendar(c.access_role ?? ""),
        can_write:
          c.available &&
          connections.some((x) => x.id === c.connection_id && x.status === "healthy") &&
          canWriteCalendar(c.access_role ?? ""),
      })),
    },
    { requestId },
  );
}

const selectionSchema = z
  .object({
    revisions: z
      .array(z.object({ connection_id: z.uuid(), revision: z.string().regex(/^\d+$/) }).strict())
      .max(100),
    sources: z.array(z.uuid()).max(1000),
    destination: z.uuid(),
  })
  .strict();
export async function PATCH(req: Request) {
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
  const t = (texto: string) => traduzir(texto, authz.idioma ?? IDIOMA_PADRAO);
  const parsed = selectionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return fail("validation_failed", t("Confira as agendas escolhidas."), 422, { requestId });
  try {
    await googleRpc(authz.supabase, "fn_google_selection", {
      p_org: authz.organizationId,
      p_revisions: parsed.data.revisions,
      p_sources: parsed.data.sources,
      p_destination: parsed.data.destination,
    });
    void audit({
      action: "agenda.google_selection_updated",
      actorUserId: authz.actor.type === "user" ? authz.actor.id : null,
      actorApiTokenId: authz.apiTokenId ?? null,
      organizationId: authz.organizationId,
      requestId,
      metadata: { sources: parsed.data.sources, destination: parsed.data.destination },
    });
    return ok({ saved: true }, { requestId });
  } catch (e) {
    const stale = e instanceof Error && "code" in e && (e.code === "PT409" || e.code === "40001");
    return fail(
      stale ? "conflict" : "forbidden",
      stale
        ? t("Suas agendas mudaram. Atualize a lista antes de salvar.")
        : t("Escolha agendas disponíveis da sua própria conexão."),
      stale ? 409 : 403,
      { requestId },
    );
  }
}
