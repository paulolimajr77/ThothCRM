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
