import { ESCRITA_PERMITIDA } from "@/lib/assistente/portas/listas";

/**
 * IDs das propostas SEGURAS que podem ser aplicadas em lote, na ordem recebida.
 *
 * Uma proposta é "segura" quando o CÓDIGO (não o modelo) classificou seu risco
 * como `seguro` — ou seja, `risk === "seguro"` —, está `pendente` e não venceu.
 * O `risk` já vem gravado no banco por `riscoDaProposta(kind, payload)` na rota de criação;
 * esta função apenas lê o valor gravado, nunca confia em dado do modelo.
 *
 * Devolve apenas os `id`s, para a tela montar o lote e chamar as rotas de
 * aplicar existentes (`/aprovar` + `/aplicar`) uma por vez.
 */
export interface PropostaCandidataAoLote {
  id: string;
  risk: string;
  status: string;
  vencida?: boolean;
  payload?: unknown;
  created_at?: string;
}

/**
 * Somente propostas com `risk === "seguro"`, `status === "pendente"` e não
 * vencidas, na ordem em que chegam.
 */
export function idsSegurosParaLote(
  propostas: PropostaCandidataAoLote[],
): string[] {
  const ids: string[] = [];
  for (const p of propostas) {
    if (p.risk !== "seguro") continue;
    if (p.status !== "pendente") continue;
    if (p.vencida === true) continue;
    ids.push(p.id);
  }
  return ids;
}

/** Efeito fora do sistema (mensagem, campanha, equipe, automação): a porta+método está marcada `externo`. */
export function propostaAgeFora(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
  const p = payload as { porta?: unknown; metodo?: unknown };
  if (typeof p.porta !== "string" || typeof p.metodo !== "string") return false;
  return ESCRITA_PERMITIDA.some((e) => e.porta === p.porta && e.metodo === p.metodo && e.externo === true);
}

/**
 * "Aprovar tudo": toda proposta pendente, não vencida e SEM efeito fora do sistema (segura ou de atenção),
 * na ordem em que foram criadas (criar o agente antes de configurá-lo). Cartão de alerta nunca entra:
 * ele fica sempre para a pessoa decidir um a um. A classificação vem do CÓDIGO (porta+método), não do modelo.
 */
export function idsParaAprovarTudo(propostas: PropostaCandidataAoLote[]): string[] {
  return propostas
    .filter((p) => p.status === "pendente" && p.vencida !== true && !propostaAgeFora(p.payload))
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
    .map((p) => p.id);
}
