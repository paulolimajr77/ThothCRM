"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { escritaDeAdminOuRecusa } from "@/lib/auth/escritaDeAdminOuRecusa";
import type { RecusaDeEscritaDeAdmin } from "@/lib/auth/recusa-de-escrita-de-admin";
import { ipDoCliente } from "@/lib/http/ip-do-cliente";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Liga ou desliga o assistente interno de UMA empresa. Só o administrador da
 * PLATAFORMA (admin pleno + MFA): o administrador da empresa não liga o
 * assistente sozinho, porque ele gasta crédito de IA da empresa e muda o que
 * a empresa pode fazer pela tela. Grava só `settings.assistente.enabled` da
 * linha do id recebido e preserva as outras chaves de `settings`.
 */
export type ResultadoDoAssistenteDoTenant =
  | { ok: true; ligado: boolean }
  | { ok: false; error: "invalid_input" | "not_found" | "write_failed" }
  | RecusaDeEscritaDeAdmin;

const schema = z.object({ organization_id: z.string().uuid(), ligado: z.boolean() }).strict();

function objeto(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export async function ligarAssistenteDoTenant(
  input: z.infer<typeof schema>,
): Promise<ResultadoDoAssistenteDoTenant> {
  const escrita = await escritaDeAdminOuRecusa();
  if (!escrita.ok) return escrita;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { organization_id: orgId, ligado } = parsed.data;

  const banco = createAdminClient();
  const lida = await banco.from("organizations").select("settings").eq("id", orgId).maybeSingle();
  if (lida.error) return { ok: false, error: "write_failed" };
  if (!lida.data) return { ok: false, error: "not_found" };

  const settings = objeto(lida.data.settings);
  const gravada = await banco
    .from("organizations")
    .update({ settings: { ...settings, assistente: { ...objeto(settings.assistente), enabled: ligado } } })
    .eq("id", orgId);
  if (gravada.error) return { ok: false, error: "write_failed" };

  const hdrs = await headers();
  await audit({
    action: "platform.tenant_assistant_toggled",
    actorUserId: escrita.ctx.user.id,
    organizationId: orgId,
    resourceType: "organization",
    resourceId: orgId,
    bypassedRls: true,
    actingAsPlatformAdmin: true,
    metadata: { ligado },
    requestId: hdrs.get("x-request-id"),
    ip: ipDoCliente(hdrs),
    userAgent: hdrs.get("user-agent"),
  });
  revalidatePath(`/admin/tenants/${orgId}`);
  return { ok: true, ligado };
}
