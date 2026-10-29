"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { escritaDeAdminOuRecusa } from "@/lib/auth/escritaDeAdminOuRecusa";
import type { RecusaDeEscritaDeAdmin } from "@/lib/auth/recusa-de-escrita-de-admin";
import { ipDoCliente } from "@/lib/http/ip-do-cliente";
import {
  apagarModelo,
  hashDaOrigem,
  salvarRevisao,
  tirarModelo,
} from "@/lib/assistente/modelos-de-cliente/repositorio";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * As escritas da tela `/admin/modelos-de-cliente` — o modelo tirado de um
 * cliente real (item 2 da #1995).
 *
 * ── Por que admin da plataforma, e não admin da empresa ─────────────────────
 *
 * Tirar o modelo LÊ uma empresa para entregar a estrutura dela a outras. Só
 * quem administra a instalação enxerga mais de uma empresa; o admin de uma
 * empresa nunca escolhe a origem nem vê modelo de outra. A tabela não tem
 * grant para nenhuma sessão: estas ações usam o cliente de serviço DEPOIS do
 * portão `escritaDeAdminOuRecusa` (admin pleno + MFA).
 *
 * ── Por que auditar ────────────────────────────────────────────────────────
 *
 * "De qual empresa saiu este modelo, e quem liberou o texto?" só tem resposta
 * na trilha: a tabela guarda a origem como hash, de propósito. A linha de
 * auditoria de `tirar` leva a organização de origem; a de `revisar` leva quem
 * revisou e quantos agentes e funis foram liberados.
 */

export type ResultadoDeModeloDeCliente =
  | { ok: true; id?: string; avisos?: string[] }
  | { ok: false; error: "invalid_input" | "origem_ilegivel" | "write_failed" }
  | { ok: false; error: "formato_invalido"; detalhe: string }
  | { ok: false; error: "texto_sensivel"; achados: { onde: string; tipos: string[] }[] }
  | RecusaDeEscritaDeAdmin;

const tirarSchema = z
  .object({
    organization_id: z.string().uuid(),
    nome: z.string().trim().min(1).max(80),
    nicho: z
      .string()
      .regex(/^[a-z_]{1,40}$/)
      .nullable()
      .optional(),
  })
  .strict();

const revisarSchema = z.object({ id: z.string().uuid(), estrutura: z.unknown() }).strict();
const apagarSchema = z.object({ id: z.string().uuid() }).strict();

async function trilha() {
  const hdrs = await headers();
  return { requestId: hdrs.get("x-request-id"), ip: ipDoCliente(hdrs), userAgent: hdrs.get("user-agent") };
}

export async function tirarModeloDeCliente(input: z.infer<typeof tirarSchema>): Promise<ResultadoDeModeloDeCliente> {
  const escrita = await escritaDeAdminOuRecusa();
  if (!escrita.ok) return escrita;
  const parsed = tirarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const banco = createAdminClient();
  const r = await tirarModelo(banco, {
    orgId: parsed.data.organization_id,
    nome: parsed.data.nome,
    nicho: parsed.data.nicho ?? null,
    userId: escrita.ctx.user.id,
  });
  if (!r.ok) return { ok: false, error: r.motivo === "origem_ilegivel" ? "origem_ilegivel" : "write_failed" };

  await audit({
    action: "platform.client_template_created",
    actorUserId: escrita.ctx.user.id,
    organizationId: parsed.data.organization_id,
    resourceType: "config_client_template",
    bypassedRls: true,
    actingAsPlatformAdmin: true,
    resourceId: r.id,
    metadata: { nome: parsed.data.nome, source_hash: hashDaOrigem(parsed.data.organization_id), avisos: r.avisos.length },
    ...(await trilha()),
  });
  revalidatePath("/admin/modelos-de-cliente");
  return { ok: true, id: r.id, avisos: r.avisos };
}

export async function salvarRevisaoDoModelo(input: z.infer<typeof revisarSchema>): Promise<ResultadoDeModeloDeCliente> {
  const escrita = await escritaDeAdminOuRecusa();
  if (!escrita.ok) return escrita;
  const parsed = revisarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const r = await salvarRevisao(createAdminClient(), {
    id: parsed.data.id,
    estrutura: parsed.data.estrutura,
    userId: escrita.ctx.user.id,
  });
  if (!r.ok) {
    if (r.motivo === "formato_invalido") return { ok: false, error: "formato_invalido", detalhe: r.detalhe };
    if (r.motivo === "texto_sensivel") return { ok: false, error: "texto_sensivel", achados: r.achados };
    return { ok: false, error: "write_failed" };
  }

  await audit({
    action: "platform.client_template_reviewed",
    actorUserId: escrita.ctx.user.id,
    resourceType: "config_client_template",
    bypassedRls: true,
    actingAsPlatformAdmin: true,
    resourceId: parsed.data.id,
    metadata: {
      funis: r.estrutura.funis.length,
      agentes: r.estrutura.agentes.length,
      followups: r.estrutura.followups.length,
    },
    ...(await trilha()),
  });
  revalidatePath("/admin/modelos-de-cliente");
  return { ok: true, id: parsed.data.id };
}

export async function apagarModeloDeCliente(input: z.infer<typeof apagarSchema>): Promise<ResultadoDeModeloDeCliente> {
  const escrita = await escritaDeAdminOuRecusa();
  if (!escrita.ok) return escrita;
  const parsed = apagarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  if (!(await apagarModelo(createAdminClient(), parsed.data.id))) return { ok: false, error: "write_failed" };
  await audit({
    action: "platform.client_template_deleted",
    actorUserId: escrita.ctx.user.id,
    resourceType: "config_client_template",
    bypassedRls: true,
    actingAsPlatformAdmin: true,
    resourceId: parsed.data.id,
    metadata: {},
    ...(await trilha()),
  });
  revalidatePath("/admin/modelos-de-cliente");
  return { ok: true };
}
