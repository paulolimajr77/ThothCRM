import { requireSupportWrite } from "@/lib/impersonate/support";
/**
 * PATCH /api/v1/pipelines/[id]/config — a configuração do funil que não é nome
 * nem etapa: campos personalizados (`settings.fields`), motivos de ganho e de
 * perda, vocabulário, entrada do Inbox e atalhos do card.
 *
 * É a mesma regra da tela Configurações › Funis (`updatePipelineConfig`), em
 * porta de API: o assistente interno não chama server action, só rota, e sem
 * esta porta ele montava o funil e deixava de fora tudo o que faz o funil servir
 * ao nicho (campo próprio, motivo de perda, o que significa "ganho").
 *
 * Auth: sessão por cookie, papel manager+. `organization_id` sai do JWT — nunca
 * do body. A leitura do funil filtra a organização, então funil de outra
 * empresa responde 404 igual ao que não existe.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  mensagemDasRegrasQuePerdemOCampo,
  regrasDeDataQuePerdemOCampo,
} from "@/lib/automation/campo-do-gatilho-de-data";
import { traduzir } from "@/lib/i18n/dicionario";
import { pipelineConfigPatchSchema } from "@/lib/schemas/settings";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

/** Chaves de `settings` que o patch grava como vieram (inclusive lista vazia e zero). */
const CHAVES_DO_SETTINGS = [
  "fields",
  "lost_reasons",
  "won_reasons",
  "won_reason_required",
  "comanda_no_ganho",
  "reabertura",
  "reabertura_campos",
  "entrada_do_inbox",
  "ocultar_encerrados_dias",
  "atalhos",
] as const;

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;

  const { id: pipelineId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  }

  const parsed = pipelineConfigPatchSchema.safeParse(json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Não entendi o que mudar na configuração deste funil."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const pedido = parsed.data;
  const algoParaMudar = pedido.vocabulary !== undefined || CHAVES_DO_SETTINGS.some((k) => pedido[k] !== undefined);
  if (!algoParaMudar) {
    return fail("unprocessable_entity", t("Nada para alterar."), 422, { requestId });
  }

  const supabase = await createClient();

  const { data: linha, error: erroDeLeitura } = await supabase
    .from("crm_pipelines")
    .select("id, name, vocabulary, settings, is_archived")
    .eq("id", pipelineId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (erroDeLeitura) return fail("internal_error", erroDeLeitura.message, 500, { requestId });
  if (!linha) return fail("not_found", t("Funil não encontrado."), 404, { requestId });
  if (linha.is_archived) {
    return fail(
      "state_conflict",
      `O funil «${linha.name}» está arquivado. Tire-o do arquivo antes de configurar.`,
      409,
      { requestId },
    );
  }

  const vocabularioAtual = (linha.vocabulary as Record<string, unknown> | null) ?? {};
  const vocabulario = pedido.vocabulary ? { ...vocabularioAtual, ...pedido.vocabulary } : vocabularioAtual;

  const settingsAtual = (linha.settings as Record<string, unknown> | null) ?? {};
  const settings: Record<string, unknown> = { ...settingsAtual };
  for (const chave of CHAVES_DO_SETTINGS) {
    if (pedido[chave] !== undefined) settings[chave] = pedido[chave];
  }

  // Campo que passa a ser do Contato e que uma regra ativa do gatilho por data
  // lê: a regra seguiria ligada e pararia de disparar em silêncio.
  if (pedido.fields !== undefined) {
    const perdem = await regrasDeDataQuePerdemOCampo(supabase, orgId, pipelineId, settingsAtual, settings);
    if ("erro" in perdem) return fail("internal_error", perdem.erro, 500, { requestId });
    if (perdem.nomes.length > 0) {
      return fail(
        "unprocessable_entity",
        mensagemDasRegrasQuePerdemOCampo(perdem.nomes, authz.user.idioma),
        422,
        { requestId },
      );
    }
  }

  const { error } = await supabase
    .from("crm_pipelines")
    .update({ vocabulary: vocabulario, settings })
    .eq("id", pipelineId)
    .eq("organization_id", orgId);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline.config_updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "pipeline",
    resourceId: pipelineId,
    requestId,
    metadata: {
      vocabulary_changed: !!pedido.vocabulary,
      fields_count: pedido.fields?.length ?? null,
      lost_reasons_count: pedido.lost_reasons?.length ?? null,
      won_reasons_count: pedido.won_reasons?.length ?? null,
      won_reason_required: pedido.won_reason_required ?? null,
      reabertura: pedido.reabertura ?? null,
      entrada_do_inbox_ativa: pedido.entrada_do_inbox?.ativa ?? null,
      ocultar_encerrados_dias: pedido.ocultar_encerrados_dias ?? null,
      atalhos_count: pedido.atalhos?.length ?? null,
    },
  });

  return ok({ id: pipelineId, settings, vocabulary: vocabulario }, { requestId });
}
