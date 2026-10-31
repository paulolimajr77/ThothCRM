/**
 * O estado da chave da base de conhecimento, como a tela o recebe.
 *
 * Um só construtor para a página (render de servidor) e para
 * `GET /api/v1/ai/knowledge/chave` (o polling do hook): eram dois blocos iguais,
 * e um campo novo em só um deles faria a tela mudar de resposta no primeiro
 * refetch.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EXPLICACAO_DA_ORIGEM,
  FamiliaDaBaseIlegivelError,
  familiaDaBase,
  provedorDaBase,
  resolverChaveDeEmbedding,
  type ProvedorDaBase,
} from "@/lib/ai/embeddings/chave";

export interface EstadoDaChave {
  pode_indexar: boolean;
  origem: string | null;
  explicacao: string | null;
  chave_em_uso: string | null;
  avisos: string[];
  /** Quem prepara a base: a família gravada ou indexada; sem ela, a da chave. `null` sem nenhuma. */
  provedor: ProvedorDaBase | null;
  /**
   * A base tem família e a chave dela sumiu (removida, desativada, inválida).
   * Outra família com chave NÃO assume sozinha — a tela diz isto e oferece a
   * troca explícita, que refaz a base.
   */
  familia_sem_chave: ProvedorDaBase | null;
  /** Para onde dá para trocar AGORA (há chave utilizável do outro lado); `null` = nenhum. */
  pode_trocar_para: ProvedorDaBase | null;
  credenciais_embedding: Array<{
    id: string;
    provider: "openai" | "openrouter" | "google";
    label: string;
    api_key_last4: string | null;
    validated_at: string | null;
    validation_error: string | null;
    is_active: boolean;
  }>;
}

export const AVISO_DA_FAMILIA_ILEGIVEL =
  "Não consegui confirmar agora com que provedor a base é preparada. Recarregue em instantes.";

export const AVISO_DA_CHAVE_RECUSADA =
  "A última leitura do material falhou: a chave foi recusada. Cadastre uma chave da OpenAI ou do Google em IA › Credenciais e clique em “Preparar tudo de novo”.";

/** Erro de quem recusou a chave (não é falha de rede nem de texto): a chave existe, mas não vale. */
const RECUSA_DE_CHAVE = /user not found|invalid[_ ]api[_ ]key|incorrect api key|unauthorized|authentication|401|403/i;

export async function montarEstadoDaChave(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<EstadoDaChave> {
  // A tela é INFORMAÇÃO: se a família não pôde ser lida, ela ainda mostra a
  // chave e diz que não sabe o provedor — sem oferecer troca nenhuma.
  let familia: ProvedorDaBase | null = null;
  let familiaIlegivel = false;
  try {
    familia = (await familiaDaBase(organizationId))?.familia ?? null;
  } catch (err) {
    if (!(err instanceof FamiliaDaBaseIlegivelError)) throw err;
    familiaIlegivel = true;
  }
  const [chave, { data }] = await Promise.all([
    resolverChaveDeEmbedding(organizationId, "embedding_indexar", { familia }),
    supabase
      .from("ai_provider_credentials_safe")
      .select("id, provider, label, api_key_last4, validated_at, validation_error, is_active")
      .eq("organization_id", organizationId)
      .in("provider", ["openai", "openrouter", "google"])
      .order("created_at", { ascending: true }),
  ]);
  // A tela diz "pronto" pela PRESENÇA da chave. Se a última leitura foi recusada
  // pelo provedor, o visto verde mente: o aviso diz o que fazer.
  const { data: ultima } = await supabase
    .from("ai_knowledge_versions")
    .select("status, error_message")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const chaveRecusada =
    ultima?.status === "failed" && RECUSA_DE_CHAVE.test(String(ultima.error_message ?? ""));
  const credenciais = (data ?? []) as EstadoDaChave["credenciais_embedding"];
  const provedor = familiaIlegivel ? null : (familia ?? (chave ? provedorDaBase(chave) : null));

  // A troca só é oferecida quando a OUTRA família tem chave utilizável agora.
  const outra: ProvedorDaBase | null =
    provedor === "openai" ? "google" : provedor === "google" ? "openai" : null;
  const podeTrocarPara =
    outra &&
    (await resolverChaveDeEmbedding(organizationId, "embedding_indexar", { familia: outra }))
      ? outra
      : null;

  return {
    pode_indexar: chave !== null,
    origem: chave?.origem ?? null,
    explicacao: chave ? EXPLICACAO_DA_ORIGEM[chave.origem] : null,
    chave_em_uso: chave?.rotulo ?? null,
    avisos: [
      ...(chave?.avisos ?? []),
      ...(familiaIlegivel ? [AVISO_DA_FAMILIA_ILEGIVEL] : []),
      ...(chaveRecusada ? [AVISO_DA_CHAVE_RECUSADA] : []),
    ],
    provedor,
    familia_sem_chave: familia !== null && chave === null ? familia : null,
    pode_trocar_para: podeTrocarPara,
    credenciais_embedding: credenciais,
  };
}
