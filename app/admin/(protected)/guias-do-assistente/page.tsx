import { notFound } from "next/navigation";

import { EditorDeGuias, type GuiaDoAssistente } from "@/components/admin/guias/EditorDeGuias";
import { PREFIXO_DOS_GUIAS_DO_ASSISTENTE } from "@/lib/agent-engine/agent/skills";
import { loadAuthUser } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { normalizarIdioma } from "@/lib/i18n/idiomas";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Guias do assistente" };
export const dynamic = "force-dynamic";

/**
 * OS GUIAS DO ASSISTENTE INTERNO (`assistente-*`) — da PLATAFORMA, não da empresa.
 *
 * São o que o assistente de configuração lê para saber como montar cada área. Não são
 * skills do agente que atende o cliente (por isso saíram de IA › Skills). Mudar um guia
 * muda o assistente de todas as empresas desta instalação.
 */
export default async function Page() {
  const usuario = await loadAuthUser();
  if (!usuario?.is_platform_admin) notFound();
  const t = (s: string) => traduzir(s, normalizarIdioma(usuario.locale));

  const admin = createAdminClient();
  const { data: ponteiros } = await admin
    .from("skill_pointers")
    .select("name, version_id")
    .is("organization_id", null)
    .like("name", `${PREFIXO_DOS_GUIAS_DO_ASSISTENTE}%`);
  const ids = (ponteiros ?? []).map((p) => p.version_id);
  const { data: versoes } =
    ids.length > 0 ? await admin.from("skill_versions").select("id, description, body").in("id", ids) : { data: [] };
  const porId = new Map((versoes ?? []).map((v) => [v.id, v]));
  const guias: GuiaDoAssistente[] = (ponteiros ?? [])
    .map((p) => ({
      name: p.name,
      description: porId.get(p.version_id)?.description ?? "",
      body: porId.get(p.version_id)?.body ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6" data-testid="tela-guias-do-assistente">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Guias do assistente")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          {t(
            "O que o assistente interno lê para configurar cada área do sistema. Mudar um guia vale para todas as empresas desta instalação; a versão anterior fica guardada.",
          )}
        </p>
      </div>
      <EditorDeGuias guias={guias} />
    </div>
  );
}
