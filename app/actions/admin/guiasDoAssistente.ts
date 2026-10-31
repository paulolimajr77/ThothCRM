"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSkillsPool } from "@/lib/ai/skills/db";
import { insertSkillVersion, PREFIXO_DOS_GUIAS_DO_ASSISTENTE, setSkillPointer } from "@/lib/agent-engine/agent/skills";
import { audit } from "@/lib/audit";
import { escritaDeAdminOuRecusa } from "@/lib/auth/escritaDeAdminOuRecusa";
import type { RecusaDeEscritaDeAdmin } from "@/lib/auth/recusa-de-escrita-de-admin";
import { ipDoCliente } from "@/lib/http/ip-do-cliente";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Edita um guia do assistente interno (`assistente-*`, skill de PLATAFORMA). Esses guias
 * não são do agente que atende o cliente: só o administrador da plataforma (admin pleno +
 * MFA) os muda, e a mudança vale para todas as empresas. Cada edição cria uma versão
 * nova e move o ponteiro: a anterior continua guardada. O matcher não muda por aqui.
 */
export type ResultadoDoGuiaDoAssistente =
  | { ok: true; version_id: string }
  | { ok: false; error: "invalid_input" | "not_found" | "write_failed" }
  | RecusaDeEscritaDeAdmin;

const schema = z
  .object({
    name: z.string().min(1).max(120),
    // Uma linha só: a descrição entra no índice de skills e uma quebra monta cabeçalho falso.
    description: z.string().trim().min(1).max(500).regex(/^[^\r\n]*$/),
    body: z.string().min(1).max(60_000),
  })
  .strict();

export async function salvarGuiaDoAssistente(
  input: z.infer<typeof schema>,
): Promise<ResultadoDoGuiaDoAssistente> {
  const escrita = await escritaDeAdminOuRecusa();
  if (!escrita.ok) return escrita;
  const parsed = schema.safeParse(input);
  if (!parsed.success || !parsed.data.name.startsWith(PREFIXO_DOS_GUIAS_DO_ASSISTENTE)) {
    return { ok: false, error: "invalid_input" };
  }
  const { name, description, body } = parsed.data;

  const banco = createAdminClient();
  const ponteiro = await banco
    .from("skill_pointers")
    .select("version_id")
    .is("organization_id", null)
    .eq("name", name)
    .maybeSingle();
  if (ponteiro.error) return { ok: false, error: "write_failed" };
  if (!ponteiro.data) return { ok: false, error: "not_found" };
  const atual = await banco
    .from("skill_versions")
    .select("matcher, manifest")
    .eq("id", ponteiro.data.version_id)
    .maybeSingle();
  if (atual.error || !atual.data) return { ok: false, error: "write_failed" };

  let versionId: string;
  try {
    const pool = getSkillsPool();
    const versao = await insertSkillVersion(pool, {
      tenantId: null,
      name,
      description,
      body,
      matcher: atual.data.matcher as never,
      manifest: Array.isArray(atual.data.manifest) ? atual.data.manifest : [],
    });
    await setSkillPointer(pool, { tenantId: null, name, versionId: versao.id });
    versionId = versao.id;
  } catch (err) {
    logger.error("admin.guia_do_assistente: falha ao gravar", { name, error: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: "write_failed" };
  }

  const hdrs = await headers();
  await audit({
    action: "platform.assistant_guide_saved",
    actorUserId: escrita.ctx.user.id,
    organizationId: null,
    resourceType: "skill_versions",
    resourceId: versionId,
    bypassedRls: true,
    actingAsPlatformAdmin: true,
    metadata: { name },
    requestId: hdrs.get("x-request-id"),
    ip: ipDoCliente(hdrs),
    userAgent: hdrs.get("user-agent"),
  });
  revalidatePath("/admin/guias-do-assistente");
  return { ok: true, version_id: versionId };
}
