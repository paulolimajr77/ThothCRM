/**
 * Listas únicas de portas proibidas para o assistente interno.
 *
 * Este arquivo NÃO depende do catálogo (`catalogo.gerado.ts`), para que o
 * gerador (`scripts/gerar-catalogo-de-portas.ts`) e as regras
 * (`lib/assistente/portas/regras.ts`) possam importar dele sem criar ciclo
 * de importação.
 */

export type Metodo = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Verdadeiro quando `id` é exatamente `prefixo` sem a barra final, ou começa
 * com `prefixo`. Evita que "team/" caia fora da raiz "team".
 */
export function casaComPrefixo(id: string, prefixo: string): boolean {
  const semBarra = prefixo.endsWith("/") ? prefixo.slice(0, -1) : prefixo;
  return id === semBarra || id.startsWith(prefixo);
}

/**
 * Prefixos de caminho (já normalizados, sem `/api/v1/`) cujo acesso é sempre
 * recusado, para leitura e escrita.
 *
 * Motivo de cada bloco:
 * - `cron/`, `admin/`, `auth/`, `webhooks/`, `webhook-sources/`, `lgpd/`,
 *   `mcp/`, `system/`, `tenants/`, `onboarding/`, `extensions/`, `health/`
 *   → superfícies de plataforma, infra, webhook de entrada, LGPD,
 *   autenticação, administração de tenant e provisionamento.
 * - `ai/credentials/` → chaves e credenciais de integração da IA.
 * - `settings/api-tokens/` → chaves/credenciais de integração fora de
 *   `ai/credentials/` (tokens `dsk_` de API).
 *
 * `messages/`, `campaigns/` e `team/` saíram daqui: a LEITURA delas é
 * liberada (estão em AREAS_SO_LEITURA). Só a escrita fica barrada.
 */
export const PREFIXOS_PROIBIDOS: readonly string[] = [
  "cron/",
  "admin/",
  "auth/",
  "webhooks/",
  "webhook-sources/",
  "lgpd/",
  "ai/credentials/",
  "mcp/",
  "system/",
  "tenants/",
  "onboarding/",
  "extensions/",
  "health/",
  "settings/api-tokens/",
] as const;

/**
 * Portas exatas (ids normalizados) que nunca são lidas nem escritas, nem
 * entram na lista branca. Comentário do motivo:
 * - `team/invites`: o GET devolve `accept_url`, e quem tem o link entra na
 *   organização.
 * - `messages/:id/media`: o GET redireciona para uma URL assinada do storage,
 *   que não serve ao assistente e não deve ir ao modelo.
 * - `contacts/export`: exporta a base inteira com CPF decifrado
 *   (`decrypt_cpf`).
 * - `contacts/:id/avatar`: redireciona para uma URL assinada do storage.
 * - `conversations/:id/notes/:noteId/media`: redireciona para uma URL
 *   assinada do storage.
 * - `leads/:id/attachments/:attachmentId/media`: redireciona para uma URL
 *   assinada do documento anexado ao negócio.
 */
export const PORTAS_PROIBIDAS: readonly string[] = [
  "team/invites",
  "messages/:id/media",
  "contacts/export",
  "contacts/:id/avatar",
  "conversations/:id/notes/:noteId/media",
  "leads/:id/attachments/:attachmentId/media",
] as const;

/**
 * Sufixos de caminho (OAuth: ida e volta) cujo acesso é sempre recusado.
 * Porta de conectar conta externa nunca é do assistente; chave só pela tela.
 * Aplicado com `id.endsWith(sufixo)`.
 */
export const SUFIXOS_PROIBIDOS: readonly string[] = ["/connect", "/callback"] as const;

/**
 * Verdadeiro se `id` é proibido: casa com algum prefixo proibido, é uma porta
 * proibida exata ou termina com algum sufixo proibido.
 */
export function ehProibida(id: string): boolean {
  return (
    PREFIXOS_PROIBIDOS.some((p) => casaComPrefixo(id, p)) ||
    PORTAS_PROIBIDAS.includes(id) ||
    SUFIXOS_PROIBIDOS.some((s) => id.endsWith(s))
  );
}

/**
 * Áreas cuja LEITURA é liberada mas a ESCRITA é NUNCA permitida, mesmo que
 * alguém ponha a porta na lista branca. Mantém apenas o que nunca deve ser
 * escrito pelo assistente. `messages/`, `campaigns/` e `team/` saíram daqui:
 * agora só as portas exatas de cada área que constam de ESCRITA_PERMITIDA
 * (com `externo: true` quando haja efeito fora do sistema) são liberadas;
 * o resto continua bloqueado pela lista branca.
 */
export const AREAS_SO_LEITURA: readonly string[] = [] as const;

/**
 * Porta branca de escrita. As 29 entradas aprovadas pelo Paulo, mais a
 * configuração aberta em 29/10/2026 (Ordem "abrir-tudo"): Grupo 2
 * (configuração/operação, cartão normal, risco "atenção") e Grupo 3
 * (efeito fora do sistema, `externo: true`, cartão de alerta, nunca em lote).
 * Cada entrada deve existir no `CATALOGO_DE_PORTAS` com aquele método.
 * Nenhum DELETE entra aqui.
 *
 * `risco: "seguro"` marca o que pode ir no lote "Aplicar as mudanças seguras":
 * lista FECHADA aqui, nunca decidida pelo modelo. Sem a marca, a proposta é
 * de atenção (cartão por cartão). Mesma régua de `RISCO_POR_TIPO`: memória e
 * material de conhecimento, mais tarefa (não fala com ninguém).
 */
export const ESCRITA_PERMITIDA: readonly {
  porta: string;
  metodo: "POST" | "PATCH" | "PUT";
  descricao: string;
  acoes?: readonly string[];
  risco?: "seguro";
  /** true => efeito fora do sistema (mensagem a cliente, campanha, equipe, automação).
   * NUNCA combina com risco: "seguro" e NUNCA entra no lote de aplicação em massa. */
  externo?: boolean;
}[] = [
  { porta: "ai/agents", metodo: "POST", descricao: "criar agente" },
  { porta: "ai/agents/:id", metodo: "PATCH", descricao: "alterar agente" },
  { porta: "ai/routers", metodo: "POST", descricao: "criar roteador" },
  { porta: "ai/routers/:id", metodo: "PATCH", descricao: "alterar roteador" },
  { porta: "ai/memory", metodo: "POST", descricao: "salvar nova versão da memória da empresa", risco: "seguro" },
  { porta: "ai/knowledge/sources", metodo: "POST", descricao: "cadastrar material de conhecimento", risco: "seguro" },
  { porta: "ai/knowledge/sources/:id", metodo: "PATCH", descricao: "alterar material de conhecimento" },
  { porta: "ai/knowledge/sources/:id/reindex", metodo: "POST", descricao: "ler de novo um material de conhecimento" },
  { porta: "pipelines", metodo: "POST", descricao: "criar funil" },
  { porta: "pipelines/:id", metodo: "PATCH", descricao: "alterar funil" },
  { porta: "pipelines/:id/stages", metodo: "POST", descricao: "criar etapa do funil" },
  { porta: "pipelines/:id/stages/:stageId", metodo: "PATCH", descricao: "alterar etapa do funil" },
  { porta: "pipelines/:id/config", metodo: "PATCH", descricao: "configurar o funil: campos personalizados, motivos de ganho e perda, vocabulário, entrada do Inbox" },
  { porta: "tags/vocabulario", metodo: "POST", descricao: "alterar a lista de etiquetas" },
  { porta: "contacts/:id", metodo: "PATCH", descricao: "alterar dados do contato (inclusive arquivar)" },
  { porta: "contacts/:id/personal", metodo: "POST", descricao: "marcar contato como pessoal" },
  { porta: "leads", metodo: "POST", descricao: "criar negócio" },
  { porta: "leads/:id", metodo: "PATCH", descricao: "alterar negócio" },
  { porta: "leads/:id/move", metodo: "POST", descricao: "mudar o negócio de etapa" },
  { porta: "ai/followup-flows", metodo: "POST", descricao: "criar fluxo de follow-up" },
  { porta: "ai/followup-flows/:id", metodo: "PATCH", descricao: "alterar fluxo de follow-up" },
  { porta: "ai/followup-flows/from-model", metodo: "POST", descricao: "instalar follow-up a partir de um modelo pronto" },
  { porta: "tasks", metodo: "POST", descricao: "criar tarefa", risco: "seguro" },
  { porta: "tasks/:id", metodo: "PATCH", descricao: "alterar tarefa" },
  { porta: "agenda/agendamentos", metodo: "POST", descricao: "criar agendamento" },
  { porta: "agenda/agendamentos", metodo: "PATCH", descricao: "alterar agendamento" },
  { porta: "agenda/configuracao", metodo: "PATCH", descricao: "alterar configuração da agenda" },
  { porta: "campaign-templates", metodo: "POST", descricao: "criar rascunho de campanha" },
  { porta: "campaign-templates/:id", metodo: "PATCH", descricao: "alterar rascunho de campanha" },
  // `prospecting` aceita ajustar a campanha de prospecção, mas só as ações que
  // NÃO iniciam conversa nem gravam/apagam nada por conta própria:
  // - start e resume enviam mensagem a quem nunca falou com a empresa (fora);
  // - configure grava chave (fora);
  // - discard_unselected apaga empresas não selecionadas (fora);
  // - search gasta crédito da pesquisa (fora).
  { porta: "prospecting", metodo: "POST", descricao: "ajustar campanha de prospecção (ritmo, pausa, seleção de empresas)", acoes: ["adjust_pace", "pause", "select", "select_in_queue"] },
  { porta: "ai/agents/:id/publish", metodo: "POST", descricao: "publicar agente" },
  { porta: "ai/followup-flows/:id/publish", metodo: "POST", descricao: "publicar follow-up" },
  // Configuração aberta de uma vez (29/10/2026, pedido do Paulo: o assistente precisa alcançar
  // TODA a configuração). Continua tudo por cartão: o administrador aprova cada mudança. Fora
  // por decisão (revisão de segurança 29/10: também provedor/credencial, camadas de proteção, skills, teto de gasto, distribuição e automações, que podem enviar mensagem): mensagem a cliente, dinheiro, credenciais e canais, equipe, cobrança,
  // importação e upload de arquivo, e ações de teste/prévia que gastam ou enviam.
  { porta: "agenda/aviso", metodo: "PUT", descricao: "configurar o aviso de agenda" },
  { porta: "agenda/enderecos", metodo: "POST", descricao: "cadastrar endereço de atendimento" },
  { porta: "agenda/excecoes", metodo: "POST", descricao: "registrar exceção de agenda (folga, feriado)" },
  { porta: "agenda/servicos", metodo: "POST", descricao: "criar serviço da agenda" },
  { porta: "agenda/servicos/atualizar", metodo: "POST", descricao: "atualizar serviço da agenda" },
  { porta: "agenda/tipos", metodo: "POST", descricao: "criar tipo de agendamento" },
  { porta: "agenda/tipos", metodo: "PATCH", descricao: "alterar tipo de agendamento" },
  { porta: "agenda/tipos/reativar", metodo: "POST", descricao: "reativar tipo de agendamento" },
  { porta: "attendants/availability/:user_id", metodo: "PATCH", descricao: "definir a disponibilidade de um atendente" },
  { porta: "campaign-suppressions", metodo: "POST", descricao: "pôr um número na lista de quem fica fora das campanhas" },
  { porta: "settings/routing", metodo: "PATCH", descricao: "alterar as regras de atendimento (roteamento)", externo: true },
  { porta: "settings/routing/channels", metodo: "PATCH", descricao: "alterar o roteamento por canal", externo: true },
  { porta: "ai/knowledge/busca", metodo: "POST", descricao: "perguntar à base de conhecimento (só consulta)" },
  { porta: "ai/routers/:id/test", metodo: "POST", descricao: "testar uma mensagem contra o roteador de IA (só teste)" },
  { porta: "ai/followups/enrollments", metodo: "POST", descricao: "colocar um contato num follow-up (a mensagem sai depois)", externo: true },
  { porta: "ai/followups/enrollments/:id/cancel", metodo: "POST", descricao: "encerrar um follow-up em andamento" },
  { porta: "ai/followups/enrollments/:id/pause", metodo: "POST", descricao: "pausar um follow-up" },
  { porta: "ai/followups/enrollments/:id/resume", metodo: "POST", descricao: "retomar um follow-up pausado" },
  { porta: "ai/followups/enrollments/:id/skip", metodo: "POST", descricao: "pular o passo atual de um follow-up" },
  { porta: "ai/followups/enrollments/:id/snooze", metodo: "POST", descricao: "adiar o próximo passo de um follow-up" },
  { porta: "ai/followups/promises/:id/cancel", metodo: "POST", descricao: "desmarcar um retorno agendado" },
  { porta: "ai/skills/:name", metodo: "PUT", descricao: "editar o texto de um guia (skill) da organização", externo: true },
  { porta: "ai/skills/:name/install", metodo: "POST", descricao: "instalar um guia (skill) do catálogo na organização", externo: true },
  { porta: "ai/skills/:name/restore", metodo: "POST", descricao: "voltar um guia (skill) a uma versão anterior", externo: true },
  { porta: "ai/guardrail-layers", metodo: "PUT", descricao: "ligar ou desligar uma camada de proteção da IA", externo: true },
  { porta: "ai/knowledge/reindex-all", metodo: "POST", descricao: "preparar de novo TODOS os materiais da base (gasta chave de IA)" },
  { porta: "ai/agents/:id/duplicate", metodo: "POST", descricao: "duplicar agente" },
  { porta: "ai/agents/:id/pause", metodo: "POST", descricao: "pausar agente" },
  { porta: "ai/agents/:id/versions", metodo: "POST", descricao: "criar nova versão (rascunho) do agente — é aqui que o texto do agente muda" },
  { porta: "ai/agents/:id/versions/:vid", metodo: "PATCH", descricao: "alterar a versão rascunho do agente (texto, ferramentas, limites)" },
  { porta: "ai/followup-flows/:id/disable", metodo: "POST", descricao: "desativar fluxo de follow-up" },
  { porta: "ai/followup-flows/:id/duplicate", metodo: "POST", descricao: "duplicar fluxo de follow-up" },
  { porta: "ai/followup-flows/:id/rollback", metodo: "POST", descricao: "voltar o follow-up à versão anterior" },
  { porta: "ai/memory/entries", metodo: "POST", descricao: "criar anotação da memória da empresa" },
  { porta: "ai/memory/entries/:id", metodo: "PATCH", descricao: "alterar anotação da memória" },
  { porta: "ai/pacing", metodo: "PUT", descricao: "ajustar o ritmo de resposta da IA" },
  { porta: "ai/routers/:id/members", metodo: "PUT", descricao: "definir quais agentes fazem parte do roteador" },
  { porta: "ai/style-adjustments", metodo: "PUT", descricao: "ajustar o estilo de resposta da IA" },
  { porta: "channel-schedules", metodo: "POST", descricao: "criar horário de atendimento do canal" },
  { porta: "channel-schedules/:id", metodo: "PATCH", descricao: "alterar horário de atendimento do canal" },
  { porta: "companies", metodo: "POST", descricao: "cadastrar empresa (cliente PJ)" },
  { porta: "companies/:id", metodo: "PATCH", descricao: "alterar empresa" },
  { porta: "company-people", metodo: "POST", descricao: "vincular pessoa a empresa" },
  { porta: "company-people/:id", metodo: "PATCH", descricao: "alterar vínculo pessoa-empresa" },
  { porta: "people", metodo: "POST", descricao: "cadastrar pessoa" },
  { porta: "people/:id", metodo: "PATCH", descricao: "alterar pessoa" },
  { porta: "phone-numbers", metodo: "POST", descricao: "cadastrar telefone" },
  { porta: "phone-numbers/:id", metodo: "PATCH", descricao: "alterar telefone" },
  { porta: "contacts/:id/person", metodo: "PATCH", descricao: "ligar contato a uma pessoa" },
  { porta: "contacts/:id/carteira", metodo: "PATCH", descricao: "definir a carteira (responsável) do contato" },
  { porta: "contacts/:id/always-human", metodo: "POST", descricao: "marcar contato para atendimento sempre humano" },
  { porta: "leads/:id/win", metodo: "POST", descricao: "marcar negócio como ganho" },
  { porta: "leads/:id/lose", metodo: "POST", descricao: "marcar negócio como perdido (com motivo)" },
  { porta: "leads/:id/next-action", metodo: "POST", descricao: "definir a próxima ação do negócio" },
  { porta: "message-templates", metodo: "POST", descricao: "criar modelo de mensagem" },
  { porta: "message-templates/:id", metodo: "PATCH", descricao: "alterar modelo de mensagem" },
  { porta: "message-templates/:id/ordem", metodo: "PUT", descricao: "reordenar modelos de mensagem" },
  { porta: "pipelines/:id/agent-mapping", metodo: "PUT", descricao: "definir qual agente atende cada etapa do funil" },
  { porta: "products", metodo: "POST", descricao: "cadastrar produto ou serviço do catálogo" },
  { porta: "products/:id", metodo: "PATCH", descricao: "alterar produto ou serviço" },
  { porta: "settings/agenda-apresentacao", metodo: "PATCH", descricao: "ajustar a apresentação da agenda" },
  { porta: "settings/art15", metodo: "PATCH", descricao: "ajustar a resposta de pedido de dados (LGPD art. 15)" },
  { porta: "settings/assinatura", metodo: "PATCH", descricao: "ajustar a assinatura das mensagens" },
  { porta: "settings/campanhas", metodo: "PATCH", descricao: "ajustar regras gerais de campanha" },
  { porta: "settings/proposal-templates", metodo: "POST", descricao: "criar modelo de proposta comercial" },
  { porta: "settings/proposal-templates/:slug", metodo: "PATCH", descricao: "alterar modelo de proposta comercial" },
  { porta: "settings/proposals", metodo: "PATCH", descricao: "ajustar configurações de propostas comerciais" },
  { porta: "settings/prospeccao", metodo: "PATCH", descricao: "ajustar configurações da prospecção" },
  { porta: "settings/task-plans", metodo: "PATCH", descricao: "ajustar planos de tarefa" },
  { porta: "metrics/atrito", metodo: "PATCH", descricao: "ajustar a métrica de atrito" },
  { porta: "demandas/:id", metodo: "PATCH", descricao: "atualizar uma demanda interna" },
  // ---- Grupo 2: configuração/operação (cartão normal, risco "atenção") ----
  { porta: "contacts", metodo: "POST", descricao: "cadastrar contato" },
  { porta: "contacts/:id/proposals/:proposal_id", metodo: "POST", descricao: "responder proposta do contato" },
  { porta: "contacts/bulk", metodo: "POST", descricao: "edição em lote de contatos" },
  { porta: "contacts/merge", metodo: "POST", descricao: "unificar contatos duplicados" },
  { porta: "conversations/:id", metodo: "PATCH", descricao: "alterar dados da conversa" },
  { porta: "conversations/:id/claim", metodo: "POST", descricao: "assumir a conversa" },
  { porta: "conversations/:id/close", metodo: "POST", descricao: "fechar a conversa" },
  { porta: "conversations/:id/draft-reply", metodo: "POST", descricao: "salvar rascunho de resposta" },
  { porta: "conversations/:id/drafts", metodo: "POST", descricao: "criar rascunho na conversa" },
  { porta: "conversations/:id/drafts/consume", metodo: "POST", descricao: "consumir rascunho da conversa" },
  { porta: "conversations/:id/mark-read", metodo: "POST", descricao: "marcar conversa como lida" },
  { porta: "conversations/:id/notes", metodo: "POST", descricao: "anotar atividade na conversa" },
  { porta: "conversations/:id/participants", metodo: "POST", descricao: "adicionar participante à conversa" },
  { porta: "conversations/:id/release", metodo: "POST", descricao: "liberar a conversa" },
  { porta: "conversations/:id/snooze", metodo: "POST", descricao: "adormecer a conversa por um período" },
  { porta: "conversations/:id/transfer", metodo: "POST", descricao: "transferir a conversa para outro atendente" },
  { porta: "conversations/bulk", metodo: "POST", descricao: "ação em lote em conversas" },
  { porta: "conversations/open-with-contact", metodo: "POST", descricao: "abrir conversa com o contato" },
  { porta: "leads/:id/clone", metodo: "POST", descricao: "clonar negócio" },
  { porta: "leads/:id/contatos-relacionados", metodo: "POST", descricao: "vincular pessoa ao negócio" },
  { porta: "leads/:id/reactivation", metodo: "POST", descricao: "reativar negócio" },
  { porta: "leads/:id/retomar", metodo: "POST", descricao: "retomar negócio parado" },
  { porta: "leads/bulk", metodo: "POST", descricao: "edição em lote de negócios" },
  { porta: "proposals", metodo: "POST", descricao: "criar proposta comercial" },
  { porta: "proposals/:id", metodo: "PATCH", descricao: "alterar proposta comercial" },
  { porta: "proposals/:id/decide", metodo: "POST", descricao: "decidir sobre a proposta" },
  { porta: "proposals/:id/documento", metodo: "PATCH", descricao: "alterar documento da proposta" },
  { porta: "proposals/:id/modelo", metodo: "PATCH", descricao: "alterar modelo da proposta" },
  { porta: "proposals/:id/preencher-com-conversa", metodo: "POST", descricao: "preencher proposta com a conversa" },
  { porta: "proposals/:id/revise", metodo: "POST", descricao: "revisar proposta" },
  { porta: "financeiro/catalogo/:tipo", metodo: "POST", descricao: "cadastrar item do catálogo financeiro" },
  { porta: "financeiro/catalogo/:tipo", metodo: "PATCH", descricao: "alterar item do catálogo financeiro" },
  { porta: "financeiro/comandas", metodo: "POST", descricao: "abrir comanda" },
  { porta: "financeiro/comandas/:id", metodo: "PATCH", descricao: "alterar comanda" },
  { porta: "financeiro/comandas/:id/estornar", metodo: "POST", descricao: "estornar comanda" },
  { porta: "financeiro/comandas/:id/finalizar", metodo: "POST", descricao: "finalizar comanda" },
  { porta: "financeiro/comandas/:id/itens", metodo: "POST", descricao: "adicionar item à comanda" },
  { porta: "financeiro/comandas/faturar-lote", metodo: "POST", descricao: "faturar atendimentos sem comanda" },
  { porta: "financeiro/fidelidade", metodo: "POST", descricao: "lançar fidelidade do cliente" },
  { porta: "financeiro/lancamentos", metodo: "POST", descricao: "criar lançamento financeiro" },
  { porta: "financeiro/lancamentos/:id", metodo: "PATCH", descricao: "alterar lançamento financeiro" },
  { porta: "honorarios/contratos", metodo: "POST", descricao: "criar contrato de honorários" },
  { porta: "honorarios/contratos/:id/parcelas", metodo: "POST", descricao: "criar parcela de honorários" },
  { porta: "honorarios/parcelas/:id/pagar", metodo: "POST", descricao: "marcar parcela de honorários como paga" },
  { porta: "agenda/google/calendarios", metodo: "PATCH", descricao: "alterar calendário Google" },
  { porta: "agenda/google/calendarios/atualizar", metodo: "POST", descricao: "atualizar calendário Google" },
  // ---- Grupo 3: efeito fora do sistema (cartão de ALERTA, aprovação individual, nunca em lote) ----
  // Versão 1.95.0 (aprovado pelo Paulo, 30/10/2026): setores, grupos de respostas rápidas e "não são a
  // mesma pessoa". Colocar uma pessoa num setor muda para onde vão as conversas dela: cartão de alerta.
  { porta: "attendants/sectors", metodo: "POST", descricao: "criar setor de atendimento" },
  { porta: "attendants/sectors/:id", metodo: "PATCH", descricao: "renomear ou redescrever um setor de atendimento" },
  { porta: "attendants/sector/:user_id", metodo: "PUT", descricao: "pôr um atendente num setor, trocar ou tirar do setor", externo: true },
  { porta: "message-template-groups", metodo: "POST", descricao: "criar grupo de respostas rápidas" },
  { porta: "message-template-groups/:id", metodo: "PATCH", descricao: "renomear grupo de respostas rápidas" },
  { porta: "message-template-groups/:id/ordem", metodo: "PUT", descricao: "reordenar os grupos de respostas rápidas" },
  { porta: "contacts/duplicates/dismiss", metodo: "POST", descricao: "marcar duas fichas como NÃO duplicadas" },
  { porta: "messages", metodo: "POST", descricao: "enviar mensagem a um cliente", externo: true },
  { porta: "messages/:id", metodo: "PATCH", descricao: "editar mensagem enviada", externo: true },
  { porta: "messages/:id/forward", metodo: "POST", descricao: "encaminhar mensagem para outra conversa", externo: true },
  { porta: "messages/:id/hide", metodo: "POST", descricao: "ocultar mensagem recebida no CRM", externo: true },
  { porta: "messages/:id/retry", metodo: "POST", descricao: "reenviar mensagem que falhou", externo: true },
  { porta: "campaigns", metodo: "POST", descricao: "criar campanha", externo: true },
  { porta: "campaigns/:id", metodo: "PATCH", descricao: "alterar campanha", externo: true },
  { porta: "campaigns/:id/:acao", metodo: "POST", descricao: "iniciar, pausar ou outra ação de campanha", externo: true },
  { porta: "campaigns/preview", metodo: "POST", descricao: "pré-visualizar campanha", externo: true },
  { porta: "automation-rules", metodo: "POST", descricao: "criar automação (pode enviar mensagem)", externo: true },
  { porta: "automation-rules/:id", metodo: "PATCH", descricao: "alterar automação (pode enviar mensagem)", externo: true },
] as const;
