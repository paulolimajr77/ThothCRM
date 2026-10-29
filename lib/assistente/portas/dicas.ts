/**
 * Os filtros que as portas de leitura mais usadas aceitam, para o modelo pedir o
 * recorte certo em vez de ler a lista inteira e concluir pelo pedaço cortado.
 *
 * Medido no espelho em 29/10/2026: "Quem faz aniversário esta semana?" leu a lista
 * inteira de contatos (cortada em 24 KB) sem saber do filtro `aniversario=semana`,
 * e "o cliente de Sorocaba" nunca buscou pelo nome.
 *
 * Lista fechada no código. `tests/unit/assistente-dicas-de-filtro.test.ts` reprova a
 * dica que citar um filtro que a porta não lê.
 */
export interface DicaDeFiltro {
  /** Os nomes exatos dos filtros (query string), na ordem em que valem a pena. */
  filtros: readonly string[];
  /** Como usar, em uma frase para o modelo. */
  uso: string;
}

export const DICAS_DE_FILTRO: Readonly<Record<string, DicaDeFiltro>> = {
  contacts: {
    filtros: ["search", "aniversario", "tag", "limit"],
    uso:
      "search procura no nome, telefone e e-mail (use para achar um cliente pelo nome ou pela " +
      "cidade escrita no nome); aniversario=hoje|semana|mes devolve só quem faz aniversário no " +
      "período, no fuso da empresa; limit vai até 100.",
  },
  conversations: {
    filtros: ["search", "contact_id", "status", "assigned_to", "unread", "limit"],
    uso: "contact_id traz as conversas de um contato; search procura pelo nome ou telefone.",
  },
  "agenda/agendamentos": {
    filtros: ["contact_id", "lead_id", "owner_user_id", "dia", "de", "ate", "situacao", "limite"],
    uso: "dia=AAAA-MM-DD ou de/ate para um período; contact_id para os compromissos de um contato.",
  },
  "pipelines/:id/leads": {
    filtros: ["page", "per_page"],
    uso:
      "Os negócios de UM funil, só os que a pessoa vê no quadro (vale para a equipe toda). " +
      "O :id sai de pipelines/default. Cada negócio traz status (open, won = ganho, lost = " +
      "perdido), closed_at e value_cents (valor em centavos); para 'quem fechou' filtre " +
      "status won pelo período de closed_at. per_page vai até 200; page para as próximas.",
  },
  "external-db/connections/:id/tables/:schema/:tabela": {
    filtros: ["limit", "order_by", "order_desc"],
    uso:
      "schema e tabela saem de external-db/connections/:id/sources; para os mais recentes, " +
      "order_by=<coluna de data ou id> e order_desc=true.",
  },
};
