import { notFound } from "next/navigation";

import { loadAuthUser } from "@/lib/auth/server";
import { NICHOS_DO_ASSISTENTE } from "@/lib/assistente/nichos";
import { lerModelo, listarModelos } from "@/lib/assistente/modelos-de-cliente/repositorio";
import { traduzir } from "@/lib/i18n/dicionario";
import { createAdminClient } from "@/lib/supabase/admin";

import { TelaDeModelosDeCliente } from "./_tela";

export const metadata = { title: "Modelos de cliente" };
export const dynamic = "force-dynamic";

/**
 * Modelos tirados de cliente real (item 2 da #1995): a ESTRUTURA de uma
 * empresa pronta — funis, agentes, follow-ups do catálogo — limpa de dado do
 * cliente, revisada aqui e depois aplicada pelo assistente em outra empresa
 * do mesmo ramo, sempre como proposta que o admin dela aprova.
 *
 * Por que `/admin`: tirar o modelo LÊ uma empresa para entregar a outras.
 * Só quem administra a instalação enxerga mais de uma; para o admin de uma
 * empresa esta tela não existe (`notFound`, mesma decisão de
 * `/admin/destinos-internos`).
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const usuario = await loadAuthUser();
  if (!usuario?.is_platform_admin) notFound();

  const { id } = await searchParams;
  const banco = createAdminClient();
  const [{ data: orgs }, modelos, aberto] = await Promise.all([
    banco.from("organizations").select("id, display_name").order("display_name").limit(500),
    listarModelos(banco),
    typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? lerModelo(banco, id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {traduzir("Modelos de cliente", usuario.idioma)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {traduzir(
            "A estrutura de um cliente pronto (funis, agentes e follow-ups) vira modelo para outro do mesmo ramo. Nada de contato, conversa, conexão ou chave sai da empresa de origem.",
            usuario.idioma,
          )}
        </p>
      </div>
      <TelaDeModelosDeCliente
        organizacoes={((orgs ?? []) as { id: string; display_name: string | null }[]).map((o) => ({
          id: o.id,
          nome: o.display_name ?? "Empresa sem nome",
        }))}
        nichos={NICHOS_DO_ASSISTENTE.map((n) => ({ id: n.id, nome: n.nome }))}
        modelos={modelos ?? []}
        // Os termos do nome da origem ficam no servidor (só a revisão os usa).
        aberto={aberto ? { ...aberto, termos: [] } : null}
      />
    </div>
  );
}
