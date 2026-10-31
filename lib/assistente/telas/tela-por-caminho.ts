/**
 * Qual tela do catálogo de navegação a pessoa está vendo, a partir do caminho.
 *
 * O painel do assistente manda o caminho em que a pessoa está
 * (`contexto.caminho`). Daqui sai a tela (rótulo e descrição que o catálogo
 * já tem) para o `system` do assistente explicar onde ela está — sem jamais
 * mandar o caminho completo com ids para o modelo.
 *
 * Procura a entrada cujo `href` é o MAIOR prefixo do caminho, por segmento
 * inteiro: `/app/ai/agents/123` casa com `/app/ai/agents`; `/app/ai/agentsx`
 * não casa. Sem caminho ou sem casamento → `null`.
 */
import { NAV_CATALOG } from "@/lib/navigation/catalogo";

export interface TelaEmVista {
  nome: string;
  descricao: string;
  href: string;
}

function segmento(caminho: string): string[] {
  return caminho.split("/").filter((s) => s.length > 0);
}

/** A entrada do catálogo cujo `href` é o maior prefixo do `caminho`. */
export function telaPorCaminho(
  caminho: string | undefined | null,
): TelaEmVista | null {
  if (!caminho) return null;
  const partes = segmento(caminho);
  if (partes.length === 0) return null;

  let melhor: TelaEmVista | null = null;
  let melhorSegmentos = 0;

  for (const entrada of NAV_CATALOG) {
    const hPartes = segmento(entrada.href);
    if (hPartes.length === 0 || hPartes.length > partes.length) continue;
    let casa = true;
    for (let i = 0; i < hPartes.length; i += 1) {
      if (hPartes[i] !== partes[i]) {
        casa = false;
        break;
      }
    }
    if (casa && hPartes.length > melhorSegmentos) {
      melhorSegmentos = hPartes.length;
      melhor = {
        nome: entrada.label,
        descricao: entrada.description,
        href: entrada.href,
      };
    }
  }
  return melhor;
}
