import { requireSupportWrite } from "@/lib/impersonate/support";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { resolveAuthDual, tetoDeEscritaDoToken } from "@/lib/api/auth-dual";
import { IDIOMA_PADRAO } from "@/lib/i18n/idiomas";
import { juntarEnderecos, normalizarEndereco, TETO_DE_ENDERECO } from "@/lib/agenda/enderecos";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { traduzir } from "@/lib/i18n/dicionario";

const busca = z.object({ q: z.string().max(100).optional() });
const corpo = z.object({
  address: z.string().trim().min(1).max(TETO_DE_ENDERECO),
});

function ilike(q: string | undefined): string | undefined {
  const termo = q?.replace(/[%_]/g, "").trim();
  return termo ? `%${termo}%` : undefined;
}

export async function GET(req: Request) {
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
  const input = busca.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!input.success) return fail("validation_failed", t("Confira a busca."), 422, { requestId });

  const supabase = authz.supabase;
  const like = ilike(input.data.q);

  const salvosQ = supabase.from("calendar_locations").select("address").eq("organization_id", authz.organizationId);
  const tiposQ = supabase
    .from("calendar_event_types")
    .select("location_details")
    .eq("organization_id", authz.organizationId)
    .not("location_details", "is", null);
  const usadosQ = supabase
    .from("calendar_appointments")
    .select("location_details")
    .eq("organization_id", authz.organizationId)
    .not("location_details", "is", null);

  const [salvos, tipos, usados] = await Promise.all([
    (like ? salvosQ.ilike("address", like) : salvosQ).order("address").limit(50),
    (like ? tiposQ.ilike("location_details", like) : tiposQ).limit(50),
    (like ? usadosQ.ilike("location_details", like) : usadosQ)
      .order("starts_at", { ascending: false })
      .limit(50),
  ]);
  if (salvos.error || tipos.error || usados.error) {
    return fail("internal_error", t("Não foi possível carregar os endereços."), 500, { requestId });
  }

  return ok(
    {
      addresses: juntarEnderecos(
        (salvos.data ?? []).map((l) => l.address),
        [
          ...(tipos.data ?? []).map((t) => t.location_details ?? ""),
          ...(usados.data ?? []).map((a) => a.location_details ?? ""),
        ],
        input.data.q ?? "",
      ),
    },
    { requestId },
  );
}

export async function POST(req: Request) {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
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
  const parsed = corpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("validation_failed", t("Confira o endereço."), 422, { requestId });

  const address = normalizarEndereco(parsed.data.address);
  const supabase = authz.supabase;
  const { data, error } = await supabase
    .from("calendar_locations")
    .insert({
      organization_id: authz.organizationId,
      address,
      created_by: authz.actor.type === "user" ? authz.actor.id : null,
    })
    .select("address")
    .single();

  if (error?.code === "23505") {
    return ok({ address, already_saved: true }, { requestId });
  }
  if (error) {
    return fail("internal_error", t("Não foi possível salvar o endereço."), 500, { requestId });
  }

  void audit({
    action: "agenda.endereco_salvo",
    actorUserId: authz.actor.type === "user" ? authz.actor.id : null,
    actorApiTokenId: authz.apiTokenId ?? null,
    organizationId: authz.organizationId,
    requestId,
    resourceType: "calendar_location",
    metadata: { address },
  });
  return ok({ address: data?.address ?? address, already_saved: false }, { status: 201, requestId });
}
