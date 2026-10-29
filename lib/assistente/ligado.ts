/**
 * O assistente interno é LIGADO POR EMPRESA, e só pelo administrador da
 * plataforma (`organizations.settings.assistente.enabled === true`). Padrão:
 * desligado — ausente, malformado ou erro de leitura também desligam.
 *
 * Toda rota de `app/api/v1/ai/assistente/**` chama `recusarSeAssistenteDesligado`
 * logo depois de `requireRole`, com a organização DA SESSÃO (nunca do corpo).
 * Esconder o botão não protege nada: quem protege é isto, no servidor.
 */
import type { NextResponse } from "next/server";

import { fail } from "@/lib/api/wrappers";
import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";
import { capacidadesDaOrganizacao } from "@/lib/organizacao/capacidades";
import { createAdminClient } from "@/lib/supabase/admin";

export async function assistenteLigado(organizationId: string): Promise<boolean> {
  try {
    const ligadas = await capacidadesDaOrganizacao(createAdminClient(), organizationId);
    return ligadas.includes("assistente");
  } catch {
    return false; // falha fechada: sem leitura, desligado
  }
}

/** `null` = pode seguir; senão, a resposta 404 pronta para devolver. */
export async function recusarSeAssistenteDesligado(
  organizationId: string,
  requestId: string,
  idioma: Idioma,
): Promise<NextResponse | null> {
  if (await assistenteLigado(organizationId)) return null;
  return fail("not_found", traduzir("O assistente não está ligado para esta empresa.", idioma), 404, { requestId });
}
