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
 * alguém ponha a porta na lista branca. Motivo:
 * - `messages/` → envio de mensagem outbound (ação irreversível para o
 *   cliente).
 * - `campaigns/` → disparo de campanha (ação em massa, irreversível).
 * - `team/` → convite, mudança de papel e remoção de pessoas da equipe.
 */
export const AREAS_SO_LEITURA: readonly string[] = [
  "messages/",
  "campaigns/",
  "team/",
] as const;

/**
 * Porta branca de escrita. Os 29 pares aprovados pelo Paulo, mais a configuração aberta em 29/10/2026 (ver o bloco no fim).
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
}[] = [
  { porta: "ai/agents", metodo: "POST", descricao: "criar agente" },
  { porta: "ai/agents/:id", metodo: "PATCH", descricao: "alterar agente" },
  { porta: "ai/routers", metodo: "POST", descricao: "criar roteador" },
  { porta: "ai/routers/:id", metodo: "PATCH", descricao: "alterar roteador" },
  { porta: "ai/memory", metodo: "POST", descricao: "salvar nova versão da memória da empresa", risco: "seguro" },
  { porta: "ai/knowledge/sources", metodo: "POST", descricao: "cadastrar material de conhecimento", risco: "seguro" },
  { porta: "ai/knowledge/sources/:id", metodo: "PATCH", descricao: "alterar material de conhecimento" },
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
  { porta: "ai/agents/:id/duplicate", metodo: "POST", descricao: "duplicar agente" },
  { porta: "ai/agents/:id/pause", metodo: "POST", descricao: "pausar agente" },
  { porta: "ai/agents/:id/versions", metodo: "POST", descricao: "criar nova versão (rascunho) do agente — é aqui que o texto do agente muda" },
  { porta: "ai/agents/:id/versions/:vid", metodo: "PATCH", descricao: "alterar a versão rascunho do agente (texto, ferramentas, limites)" },
  { porta: "ai/followup-flows/:id/disable", metodo: "POST", descricao: "desativar fluxo de follow-up" },
  { porta: "ai/followup-flows/:id/duplicate", metodo: "POST", descricao: "duplicar fluxo de follow-up" },
  { porta: "ai/followup-flows/:id/rollback", metodo: "POST", descricao: "voltar o follow-up à versão anterior" },
  { porta: "ai/memory/entries", metodo: "POST", descricao: "criar anotação da memória da empresa" },
  { porta: "ai/memory/entries/:id", metodo: "PATCH", descricao: "alterar anotação da memória" },
  { porta: "ai/mapas", metodo: "PUT", descricao: "ajustar o mapa de campos da IA" },
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
] as const;
