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
 * Ações que mexem no que JÁ ESTÁ NO AR ou são difíceis de desfazer: nunca vão no "Aprovar tudo", cada uma é
 * decisão separada da pessoa (revisão de segurança, 30/10/2026: o botão não pode publicar sem ela olhar).
 */
const FORA_DO_APROVAR_TUDO: readonly { porta: string; metodo: string }[] = [
  { porta: "ai/agents/:id/publish", metodo: "POST" },
  { porta: "ai/followup-flows/:id/publish", metodo: "POST" },
  { porta: "ai/followup-flows/:id/rollback", metodo: "POST" },
  { porta: "ai/followup-flows/:id/disable", metodo: "POST" },
  { porta: "ai/agents/:id/pause", metodo: "POST" },
  { porta: "contacts/merge", metodo: "POST" },
  { porta: "contacts/bulk", metodo: "POST" },
  { porta: "leads/bulk", metodo: "POST" },
  { porta: "conversations/bulk", metodo: "POST" },
  { porta: "leads/:id/win", metodo: "POST" },
  { porta: "leads/:id/lose", metodo: "POST" },
  { porta: "leads/:id/reactivation", metodo: "POST" },
  { porta: "leads/:id/retomar", metodo: "POST" },
  { porta: "proposals/:id/decide", metodo: "POST" },
  { porta: "financeiro/comandas/:id/estornar", metodo: "POST" },
  { porta: "settings/routing", metodo: "PATCH" },
  { porta: "settings/routing/channels", metodo: "PATCH" },
  { porta: "ai/guardrail-layers", metodo: "PUT" },
  { porta: "ai/knowledge/reindex-all", metodo: "POST" },
  { porta: "ai/skills/:name", metodo: "PUT" },
  { porta: "ai/skills/:name/install", metodo: "POST" },
  { porta: "ai/skills/:name/restore", metodo: "POST" },
  { porta: "ai/followups/enrollments/:id/cancel", metodo: "POST" },
  { porta: "ai/followups/enrollments/:id/skip", metodo: "POST" },
  { porta: "ai/followups/enrollments/:id/snooze", metodo: "POST" },
  { porta: "ai/followups/promises/:id/cancel", metodo: "POST" },
];

function ehAoVivoOuIrreversivel(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
  const p = payload as { porta?: unknown; metodo?: unknown };
  return FORA_DO_APROVAR_TUDO.some((e) => e.porta === p.porta && e.metodo === p.metodo);
}

/**
 * "Aprovar tudo": toda proposta pendente, não vencida, SEM efeito fora do sistema e que não mexa no que já está no ar (segura ou de atenção),
 * na ordem em que foram criadas (criar o agente antes de configurá-lo). Cartão de alerta nunca entra:
 * ele fica sempre para a pessoa decidir um a um. A classificação vem do CÓDIGO (porta+método), não do modelo.
 */
export function idsParaAprovarTudo(propostas: PropostaCandidataAoLote[]): string[] {
  return propostas
    .filter((p) => p.status === "pendente" && p.vencida !== true && !propostaAgeFora(p.payload) && !ehAoVivoOuIrreversivel(p.payload))
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
    .map((p) => p.id);
}
