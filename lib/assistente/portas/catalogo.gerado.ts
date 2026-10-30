// Arquivo gerado por scripts/gerar-catalogo-de-portas.ts. NAO EDITE.
// Rode pnpm portas:gerar para regenerar apos adicionar/remover rotas.

import type { Metodo, PortaDoCatalogo } from "./tipos";

// Todas as portas do catalogo (apenas as nao proibidas).
export const CATALOGO_DE_PORTAS: readonly PortaDoCatalogo[] = [
  {
    id: "ads/meta/accounts",
    caminho: "ads/meta/accounts",
    metodos: ["GET"],
    parametros: [],
    area: "ads",
    resumo: "GET /api/v1/ads/meta/accounts — as contas de anúncio que o token alcança.",
  },
  {
    id: "ads/meta/campaigns",
    caminho: "ads/meta/campaigns",
    metodos: ["GET"],
    parametros: [],
    area: "ads",
    resumo: "GET /api/v1/ads/meta/campaigns — a tabela de campanhas do período.",
  },
  {
    id: "agenda/agendamentos",
    caminho: "agenda/agendamentos",
    metodos: ["GET", "POST", "PATCH", "DELETE"],
    parametros: [],
    area: "agenda",
    resumo: "GET lista os agendamentos; POST marca um agendamento (tipo, contato, horário); PATCH altera, remarca ou muda a situação de um agendamento.",
  },
  {
    id: "agenda/agendamentos/:id",
    caminho: "agenda/agendamentos/[id]",
    metodos: ["GET"],
    parametros: ["id"],
    area: "agenda",
    resumo: "consulta: agenda › agendamentos.",
  },
  {
    id: "agenda/agendamentos/:id/google/meet/deliver",
    caminho: "agenda/agendamentos/[id]/google/meet/deliver",
    metodos: ["POST"],
    parametros: ["id"],
    area: "agenda",
    resumo: "cria ou executa: agenda › agendamentos › google › meet › deliver.",
  },
  {
    id: "agenda/agendamentos/:id/google/meet/resend",
    caminho: "agenda/agendamentos/[id]/google/meet/resend",
    metodos: ["POST"],
    parametros: ["id"],
    area: "agenda",
    resumo: "Reenvio EXPLÍCITO do link, pedido por gente.",
  },
  {
    id: "agenda/agendamentos/:id/google/meet/retry",
    caminho: "agenda/agendamentos/[id]/google/meet/retry",
    metodos: ["POST"],
    parametros: ["id"],
    area: "agenda",
    resumo: "cria ou executa: agenda › agendamentos › google › meet › retry.",
  },
  {
    id: "agenda/agendamentos/:id/google/resolver",
    caminho: "agenda/agendamentos/[id]/google/resolver",
    metodos: ["POST"],
    parametros: ["id"],
    area: "agenda",
    resumo: "cria ou executa: agenda › agendamentos › google › resolver.",
  },
  {
    id: "agenda/agendamentos/:id/google/retry",
    caminho: "agenda/agendamentos/[id]/google/retry",
    metodos: ["POST"],
    parametros: ["id"],
    area: "agenda",
    resumo: "Retentativa usa exatamente as mesmas guardas; nunca faz HTTP no request humano.",
  },
  {
    id: "agenda/aviso",
    caminho: "agenda/aviso",
    metodos: ["GET", "PUT"],
    parametros: [],
    area: "agenda",
    resumo: "GET mostra o aviso de agendamento no WhatsApp do dono; PUT liga/desliga o aviso e define o número que avisa. Só administrador.",
  },
  {
    id: "agenda/aviso/teste",
    caminho: "agenda/aviso/teste",
    metodos: ["POST"],
    parametros: [],
    area: "agenda",
    resumo: "POST /api/v1/agenda/aviso/teste — \"enviar teste\" do aviso de agendamento.",
  },
  {
    id: "agenda/configuracao",
    caminho: "agenda/configuracao",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "agenda",
    resumo: "GET mostra a configuração da agenda (jornada, regras); PATCH altera a configuração da agenda. Alterar exige gerente ou acima.",
  },
  {
    id: "agenda/enderecos",
    caminho: "agenda/enderecos",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "agenda",
    resumo: "GET lista os endereços de atendimento já usados na agenda (aceita busca); POST cadastra um endereço novo de atendimento.",
  },
  {
    id: "agenda/excecoes",
    caminho: "agenda/excecoes",
    metodos: ["GET", "POST", "DELETE"],
    parametros: [],
    area: "agenda",
    resumo: "GET lista as exceções da agenda (folga, feriado, dia bloqueado); POST registra uma exceção, bloqueando um dia ou horário.",
  },
  {
    id: "agenda/google/calendarios",
    caminho: "agenda/google/calendarios",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "agenda",
    resumo: "GET lista as agendas do Google conectadas; PATCH escolhe quais calendários do Google a agenda do CRM usa.",
  },
  {
    id: "agenda/google/calendarios/atualizar",
    caminho: "agenda/google/calendarios/atualizar",
    metodos: ["POST"],
    parametros: [],
    area: "agenda",
    resumo: "POST atualiza a lista de calendários do Google de uma conexão (corpo: connection_id). Só lê do Google; não cria nem apaga evento.",
  },
  {
    id: "agenda/google/desconectar",
    caminho: "agenda/google/desconectar",
    metodos: ["DELETE"],
    parametros: [],
    area: "agenda",
    resumo: "DESCONECTAR A AGENDA DO GOOGLE.",
  },
  {
    id: "agenda/horarios-livres",
    caminho: "agenda/horarios-livres",
    metodos: ["GET"],
    parametros: [],
    area: "agenda",
    resumo: "GET mostra os horários livres para oferecer (event_type_id, de, ate, dono opcional).",
  },
  {
    id: "agenda/pessoas",
    caminho: "agenda/pessoas",
    metodos: ["GET"],
    parametros: [],
    area: "agenda",
    resumo: "GET /api/v1/agenda/pessoas — quem tem agenda, para a Agenda listar as pessoas.",
  },
  {
    id: "agenda/servicos",
    caminho: "agenda/servicos",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "agenda",
    resumo: "GET lista serviços e recursos da agenda e seus bloqueios; POST configura serviço, bloqueia/desbloqueia horário ou cadastra recurso.",
  },
  {
    id: "agenda/servicos/atualizar",
    caminho: "agenda/servicos/atualizar",
    metodos: ["POST"],
    parametros: [],
    area: "agenda",
    resumo: "POST atualiza um serviço da agenda a partir da conexão do calendário (corpo: event_type_id). Ação explícita; quem só lê não dispara.",
  },
  {
    id: "agenda/tipos",
    caminho: "agenda/tipos",
    metodos: ["GET", "POST", "PATCH", "DELETE"],
    parametros: [],
    area: "agenda",
    resumo: "GET lista os tipos de agendamento; POST cria um tipo (nome, categoria, duração); PATCH altera um tipo (duração, intervalos, antecedência).",
  },
  {
    id: "agenda/tipos/reativar",
    caminho: "agenda/tipos/reativar",
    metodos: ["POST"],
    parametros: [],
    area: "agenda",
    resumo: "POST reativa um tipo de agendamento que estava desativado (corpo: id). Gerente ou acima.",
  },
  {
    id: "agenda/vinculos",
    caminho: "agenda/vinculos",
    metodos: ["GET"],
    parametros: [],
    area: "agenda",
    resumo: "consulta: agenda › vínculos.",
  },
  {
    id: "ai/agents",
    caminho: "ai/agents",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "ai",
    resumo: "GET lista os agentes de IA da empresa (publicado, pausado, modelo); POST cria um agente novo (só administrador).",
  },
  {
    id: "ai/agents/:id",
    caminho: "ai/agents/[id]",
    metodos: ["GET", "PATCH", "DELETE"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET mostra um agente de IA; PATCH altera os dados do agente (nome e configuração). Alterar é só para administrador.",
  },
  {
    id: "ai/agents/:id/duplicate",
    caminho: "ai/agents/[id]/duplicate",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST duplica um agente de IA: a cópia nasce com sufixo (cópia) e uma versão em rascunho; não publica nem copia histórico. Administrador.",
  },
  {
    id: "ai/agents/:id/pause",
    caminho: "ai/agents/[id]/pause",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST pausa o agente de IA: ele para de responder, mas a versão publicada continua guardada. Só administrador.",
  },
  {
    id: "ai/agents/:id/proposals",
    caminho: "ai/agents/[id]/proposals",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "Épico Operação Visível (F3) — GET: propostas do flywheel da org para a tela do agente (pendentes e aplicadas; a UI mostra o diff e o botão de aplicar).",
  },
  {
    id: "ai/agents/:id/proposals/:pid/apply",
    caminho: "ai/agents/[id]/proposals/[pid]/apply",
    metodos: ["POST"],
    parametros: ["id", "pid"],
    area: "ai",
    resumo: "Épico Operação Visível (F3) — POST: aplica uma proposta do flywheel como versão NOVA do agente via publish-por-ponteiro (o clique É o gate humano).",
  },
  {
    id: "ai/agents/:id/publish",
    caminho: "ai/agents/[id]/publish",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST publica uma versão em rascunho do agente de IA (corpo: version_id), colocando-a no ar. Confere modelo, número do WhatsApp e ferramentas.",
  },
  {
    id: "ai/agents/:id/reconcile",
    caminho: "ai/agents/[id]/reconcile",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "cria ou executa: ai › agentes de IA › reconcile.",
  },
  {
    id: "ai/agents/:id/runs",
    caminho: "ai/agents/[id]/runs",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET lista as execuções recentes de um agente de IA (o que respondeu, custo). Gerente ou acima.",
  },
  {
    id: "ai/agents/:id/tool-usage",
    caminho: "ai/agents/[id]/tool-usage",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET /api/v1/ai/agents/:id/tool-usage (manager+) O que cada capacidade do agente andou fazendo: quantas vezes foi usada, quantas falharam, quantas vieram de teste e quando foi a última vez.",
  },
  {
    id: "ai/agents/:id/versions",
    caminho: "ai/agents/[id]/versions",
    metodos: ["GET", "POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET lista as versões do agente de IA (gerente); POST cria uma nova versão em rascunho (é o salvar do texto do agente). Só administrador.",
  },
  {
    id: "ai/agents/:id/versions/:vid",
    caminho: "ai/agents/[id]/versions/[vid]",
    metodos: ["GET", "PATCH"],
    parametros: ["id", "vid"],
    area: "ai",
    resumo: "GET mostra uma versão do agente; PATCH edita a versão em rascunho (texto/prompt, ferramentas, limites). Versão já publicada não muda. Horário do follow-up: followup.send_window = { start: \"HH:MM\", end: \"HH:MM\", weekdays: [0 a 6, onde 0 é domingo e 1 segunda] } (o campo é weekdays, não days; uma janela só por agente).",
  },
  {
    id: "ai/agents/:id/versions/:vid/test",
    caminho: "ai/agents/[id]/versions/[vid]/test",
    metodos: ["POST"],
    parametros: ["id", "vid"],
    area: "ai",
    resumo: "POST /api/v1/ai/agents/:id/versions/:vid/test (admin) Spec 10 §4.4.",
  },
  {
    id: "ai/agents/assignable",
    caminho: "ai/agents/assignable",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET lista os agentes de IA que podem receber uma conversa ou negócio (para atribuir). Atendente ou acima.",
  },
  {
    id: "ai/assistente/auditoria",
    caminho: "ai/assistente/auditoria",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "ai",
    resumo: "GET/POST /api/v1/ai/assistente/auditoria — F3: auditoria da configuração da empresa.",
  },
  {
    id: "ai/assistente/chat",
    caminho: "ai/assistente/chat",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "POST /api/v1/ai/assistente/chat — turno de leitura do assistente interno (F1b).",
  },
  {
    id: "ai/assistente/progresso",
    caminho: "ai/assistente/progresso",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/assistente/progresso?turn_id=…&desde=N — o que o assistente já fez NESTE turno (tela aberta, teste começou, resultado do teste).",
  },
  {
    id: "ai/assistente/propostas",
    caminho: "ai/assistente/propostas",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "ai",
    resumo: "GET/POST /api/v1/ai/assistente/propostas — a fila de propostas do assistente (GET, T20) e o registro de UMA proposta `pendente` (POST, T19).",
  },
  {
    id: "ai/assistente/propostas/:id/aplicar",
    caminho: "ai/assistente/propostas/[id]/aplicar",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/assistente/propostas/[id]/aplicar — o CORAÇÃO da T20 (F2b).",
  },
  {
    id: "ai/assistente/propostas/:id/aprovar",
    caminho: "ai/assistente/propostas/[id]/aprovar",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/assistente/propostas/[id]/aprovar — o clique do administrador (F2b, T20): `pendente → aprovada`, com carimbo de QUEM e QUANDO decidiu.",
  },
  {
    id: "ai/assistente/propostas/:id/rejeitar",
    caminho: "ai/assistente/propostas/[id]/rejeitar",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/assistente/propostas/[id]/rejeitar — o \"não\" do administrador (F2b, T20): `pendente → rejeitada`, com carimbo de decisão e o motivo opcional (≤1000 caracteres) gravado em `decision_reason` — insumo estruturado do laço de ret",
  },
  {
    id: "ai/assistente/threads",
    caminho: "ai/assistente/threads",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/assistente/threads — lista pelo cliente de SESSÃO (vale a RLS).",
  },
  {
    id: "ai/assistente/threads/:id/messages",
    caminho: "ai/assistente/threads/[id]/messages",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET /api/v1/ai/assistente/threads/[id]/messages — histórico pelo cliente de SESSÃO (vale a RLS).",
  },
  {
    id: "ai/assistente/transcrever",
    caminho: "ai/assistente/transcrever",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "POST /api/v1/ai/assistente/transcrever — o áudio do campo do chat vira texto.",
  },
  {
    id: "ai/automatico-ativo",
    caminho: "ai/automatico-ativo",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/automatico-ativo — existe atendimento automático nesta org? ## Por que uma rota só para isto O selo de comando do Inbox dizia \"Automático atendendo\" em toda conversa sem dono e sem trava — **sem saber se existe algum automáti",
  },
  {
    id: "ai/budget",
    caminho: "ai/budget",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/budget — o estado do orçamento da org ativa (manager+).",
  },
  {
    id: "ai/cases",
    caminho: "ai/cases",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/cases — lista os casos humanos da org (spec 15 §7, Wave 5).",
  },
  {
    id: "ai/cases/:id",
    caminho: "ai/cases/[id]",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET /api/v1/ai/cases/:id — detalhe do caso + timeline (spec 15 §7, Wave 5).",
  },
  {
    id: "ai/cases/:id/chat",
    caminho: "ai/cases/[id]/chat",
    metodos: ["GET", "POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET/POST /api/v1/ai/cases/:id/chat — a consulta interna da equipe à IA que ABRIU o caso (migration 0281).",
  },
  {
    id: "ai/cases/:id/reply",
    caminho: "ai/cases/[id]/reply",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/cases/:id/reply — a ação do humano sobre um caso aberto (spec 15 §7/§9, Wave 5).",
  },
  {
    id: "ai/cases/alerta",
    caminho: "ai/cases/alerta",
    metodos: ["GET", "PUT", "DELETE"],
    parametros: [],
    area: "ai",
    resumo: "GET/PUT/DELETE /api/v1/ai/cases/alerta — a configuração do aviso de caso no WhatsApp da equipe (migration 0292).",
  },
  {
    id: "ai/cases/alerta/teste",
    caminho: "ai/cases/alerta/teste",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "POST /api/v1/ai/cases/alerta/teste — \"enviar aviso de teste\".",
  },
  {
    id: "ai/evolution",
    caminho: "ai/evolution",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/evolution — o Painel de Evolução da IA (Fase 4 do Harness).",
  },
  {
    id: "ai/followup-flows",
    caminho: "ai/followup-flows",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "ai",
    resumo: "GET lista os fluxos de follow-up da empresa; POST cria um follow-up novo em rascunho, ainda sem enviar nada (gerente ou acima).",
  },
  {
    id: "ai/followup-flows/:id",
    caminho: "ai/followup-flows/[id]",
    metodos: ["GET", "PATCH", "DELETE"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET mostra o follow-up (rascunho, gatilho, regra de passar ao humano); PATCH altera o rascunho do follow-up. Gerente ou acima.",
  },
  {
    id: "ai/followup-flows/:id/disable",
    caminho: "ai/followup-flows/[id]/disable",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST desativa o fluxo de follow-up: ele deixa de rodar. Gerente ou acima.",
  },
  {
    id: "ai/followup-flows/:id/duplicate",
    caminho: "ai/followup-flows/[id]/duplicate",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST duplica um follow-up: a cópia nasce em rascunho, sem publicar e sem enviar mensagem. Gerente ou acima.",
  },
  {
    id: "ai/followup-flows/:id/export",
    caminho: "ai/followup-flows/[id]/export",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET /api/v1/ai/followup-flows/:id/export — o fluxo como ARQUIVO (any member).",
  },
  {
    id: "ai/followup-flows/:id/publish",
    caminho: "ai/followup-flows/[id]/publish",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST valida o rascunho do follow-up e, se estiver certo, publica e coloca o fluxo no ar. Gerente ou acima.",
  },
  {
    id: "ai/followup-flows/:id/rollback",
    caminho: "ai/followup-flows/[id]/rollback",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST volta o follow-up para uma versão publicada anterior (corpo: version_id), sem criar versão nova. Gerente ou acima.",
  },
  {
    id: "ai/followup-flows/from-model",
    caminho: "ai/followup-flows/from-model",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "POST instala um modelo pronto de follow-up como fluxo em rascunho (textos, prazos e gatilho). Não publica nem envia nada.",
  },
  {
    id: "ai/followup-flows/import",
    caminho: "ai/followup-flows/import",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "POST /api/v1/ai/followup-flows/import — cria um fluxo a partir de um ARQUIVO exportado (manager+).",
  },
  {
    id: "ai/followup-flows/modelos-aprovados",
    caminho: "ai/followup-flows/modelos-aprovados",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/followup-flows/modelos-aprovados — os modelos aprovados do canal que um passo de fluxo consegue enviar sozinho (viewer+, como a leitura do fluxo).",
  },
  {
    id: "ai/followups/enrollments",
    caminho: "ai/followups/enrollments",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/followups/enrollments — lista enrollments da org ativa (any member), filtros opcionais `?status=` e `?contact_id=` (uuid).",
  },
  {
    id: "ai/followups/enrollments/:id",
    caminho: "ai/followups/enrollments/[id]",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET /api/v1/ai/followups/enrollments/:id (any member) — o dossiê de UM follow-up: quem é o contato, em que passo está, quando volta a andar, o que já aconteceu (a tabela `followup_enrollment_events`, que existe desde a 0054 e nenhuma tela l",
  },
  {
    id: "ai/followups/enrollments/:id/cancel",
    caminho: "ai/followups/enrollments/[id]/cancel",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/followups/enrollments/:id/cancel (manager+) — encerra um enrollment VIVO (active|waiting_reply|paused_handoff|paused_manual| coletando|dormente) manualmente pela fila.",
  },
  {
    id: "ai/followups/enrollments/:id/pause",
    caminho: "ai/followups/enrollments/[id]/pause",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/followups/enrollments/:id/pause (manager+) — segura o follow-up sem matá-lo.",
  },
  {
    id: "ai/followups/enrollments/:id/resume",
    caminho: "ai/followups/enrollments/[id]/resume",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/followups/enrollments/:id/resume (manager+) — devolve ao relógio o follow-up que uma pessoa pausou.",
  },
  {
    id: "ai/followups/enrollments/:id/skip",
    caminho: "ai/followups/enrollments/[id]/skip",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/followups/enrollments/:id/skip (manager+) — pula o passo em que o follow-up está e o coloca no passo seguinte, para ser avaliado no próximo tick.",
  },
  {
    id: "ai/followups/enrollments/:id/snooze",
    caminho: "ai/followups/enrollments/[id]/snooze",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/followups/enrollments/:id/snooze (manager+) — remarca o próximo passo para o horário que a pessoa escolheu, sem tirar o follow-up do relógio nem mudar o passo em que ele está.",
  },
  {
    id: "ai/followups/promises/:id/cancel",
    caminho: "ai/followups/promises/[id]/cancel",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/followups/promises/:id/cancel (manager+) — a pessoa desmarca um RETORNO agendado (a promessa avulsa, `cron_jobs`), não um enrollment do motor de fluxos.",
  },
  {
    id: "ai/followups/queue",
    caminho: "ai/followups/queue",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET mostra a fila de follow-ups: inscrições em andamento e promessas agendadas de retorno ao cliente.",
  },
  {
    id: "ai/guardrail-layers",
    caminho: "ai/guardrail-layers",
    metodos: ["GET", "PUT"],
    parametros: [],
    area: "ai",
    resumo: "GET/PUT /api/v1/ai/guardrail-layers — as verificações que são escolha da organização.",
  },
  {
    id: "ai/inbox",
    caminho: "ai/inbox",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "Épico Operação Visível (F1) — central de avisos do agente.",
  },
  {
    id: "ai/inbox/:id",
    caminho: "ai/inbox/[id]",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "ai",
    resumo: "Épico Operação Visível (F1) — transição de status de um aviso do agente.",
  },
  {
    id: "ai/inbox/resolve-all",
    caminho: "ai/inbox/resolve-all",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "Épico Operação Visível (F1) — resolve de uma vez TODOS os avisos abertos da org.",
  },
  {
    id: "ai/jev",
    caminho: "ai/jev",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "ai",
    resumo: "GET/PATCH /api/v1/ai/jev — o cartão \"Jev — decisões rápidas\".",
  },
  {
    id: "ai/knowledge/busca",
    caminho: "ai/knowledge/busca",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "\"Perguntar ao acervo\" — a superfície do OPERADOR sobre a MESMA busca que a IA faz.",
  },
  {
    id: "ai/knowledge/chave",
    caminho: "ai/knowledge/chave",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/knowledge/chave — a base de conhecimento consegue indexar? Existe porque a tela de conhecimento prometia \"a indexação começa em instantes\" sem nunca perguntar se havia chave para isso.",
  },
  {
    id: "ai/knowledge/provedor",
    caminho: "ai/knowledge/provedor",
    metodos: ["PUT"],
    parametros: [],
    area: "ai",
    resumo: "PUT /api/v1/ai/knowledge/provedor — quem prepara a base: OpenAI ou Google.",
  },
  {
    id: "ai/knowledge/reindex-all",
    caminho: "ai/knowledge/reindex-all",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "POST /api/v1/ai/knowledge/reindex-all Reindexa TODOS os materiais ativos da organização de uma vez, emitindo `knowledge_source.updated` por fonte (o worker re-processa; nada é apagado).",
  },
  {
    id: "ai/knowledge/sources",
    caminho: "ai/knowledge/sources",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "ai",
    resumo: "GET lista os materiais de consulta (base de conhecimento) da empresa; POST cadastra um material novo, como perguntas e respostas ou texto. Gerente.",
  },
  {
    id: "ai/knowledge/sources/:id",
    caminho: "ai/knowledge/sources/[id]",
    metodos: ["GET", "PATCH", "DELETE"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET mostra um material de consulta (base de conhecimento); PATCH altera nome, perguntas e respostas ou metadados do material. Gerente.",
  },
  {
    id: "ai/knowledge/sources/:id/conteudo",
    caminho: "ai/knowledge/sources/[id]/conteudo",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET /api/v1/ai/knowledge/sources/[id]/conteudo O CONTEÚDO LEGÍVEL DE UM MATERIAL DO ACERVO.",
  },
  {
    id: "ai/knowledge/sources/:id/reindex",
    caminho: "ai/knowledge/sources/[id]/reindex",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST manda ler de novo um material de consulta (reindexar), para a IA enxergar a versão atual. Gerente ou acima.",
  },
  {
    id: "ai/knowledge/sources/:id/trechos",
    caminho: "ai/knowledge/sources/[id]/trechos",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET /api/v1/ai/knowledge/sources/[id]/trechos O que o agente REALMENTE aprendeu deste material.",
  },
  {
    id: "ai/knowledge/sources/upload",
    caminho: "ai/knowledge/sources/upload",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "POST /api/v1/ai/knowledge/sources/upload Envio de arquivo (PDF, Markdown ou texto, até 20 MB) para o acervo da organização.",
  },
  {
    id: "ai/mapas",
    caminho: "ai/mapas",
    metodos: ["GET", "PUT", "DELETE"],
    parametros: [],
    area: "ai",
    resumo: "A chave de MAPAS da organização (Configurações › Provedores, cartão \"Mapas\").",
  },
  {
    id: "ai/mapas/testar",
    caminho: "ai/mapas/testar",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "\"Testar\" a chave de Mapas: geocodifica um ponto público fixo (`PONTO_DE_TESTE`) e diz o que o Google respondeu.",
  },
  {
    id: "ai/memory",
    caminho: "ai/memory",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "ai",
    resumo: "GET mostra a memória geral da empresa (documento ativo, versões, anotações); POST salva um texto novo como nova versão da memória. Só administrador.",
  },
  {
    id: "ai/memory/entries",
    caminho: "ai/memory/entries",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "POST cria uma anotação manual na memória da empresa, com título e texto, já ativa. Gerente ou acima.",
  },
  {
    id: "ai/memory/entries/:id",
    caminho: "ai/memory/entries/[id]",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "ai",
    resumo: "PATCH arquiva ou reativa uma anotação da memória da empresa (status archived ou active). Gerente ou acima.",
  },
  {
    id: "ai/memory/versions/:id",
    caminho: "ai/memory/versions/[id]",
    metodos: ["GET"],
    parametros: ["id"],
    area: "ai",
    resumo: "Épico Operação Visível (F1) — GET: conteúdo de uma versão específica da memória da org, para o Dialog de histórico da UI (Task 6).",
  },
  {
    id: "ai/operator-metrics",
    caminho: "ai/operator-metrics",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/operator-metrics — o papel que organiza o sistema, medido.",
  },
  {
    id: "ai/pacing",
    caminho: "ai/pacing",
    metodos: ["GET", "PUT"],
    parametros: [],
    area: "ai",
    resumo: "GET mostra o ritmo de envio e resposta por número do WhatsApp (anti-bloqueio); PUT ajusta o ritmo de UM número. PUT: gerente ou acima.",
  },
  {
    id: "ai/providers",
    caminho: "ai/providers",
    metodos: ["GET", "PATCH", "PUT"],
    parametros: [],
    area: "ai",
    resumo: "GET/PUT /api/v1/ai/providers — a configuração de IA de cada ponto do sistema.",
  },
  {
    id: "ai/providers/:provider/models",
    caminho: "ai/providers/[provider]/models",
    metodos: ["GET"],
    parametros: ["provider"],
    area: "ai",
    resumo: "GET /api/v1/ai/providers/:provider/models Lê do catálogo curado `ai_models` (tabela GLOBAL, RLS read-all).",
  },
  {
    id: "ai/replies/:id",
    caminho: "ai/replies/[id]",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "cria ou executa: ai › replies.",
  },
  {
    id: "ai/routers",
    caminho: "ai/routers",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "ai",
    resumo: "GET lista os roteadores de agentes (qual agente atende cada assunto); POST cria um roteador para um número do WhatsApp. Só administrador.",
  },
  {
    id: "ai/routers/:id",
    caminho: "ai/routers/[id]",
    metodos: ["GET", "PATCH", "DELETE"],
    parametros: ["id"],
    area: "ai",
    resumo: "GET mostra o roteador de agentes e seus membros; PATCH altera nome, ativo/inativo e agente de reserva. Só administrador altera.",
  },
  {
    id: "ai/routers/:id/members",
    caminho: "ai/routers/[id]/members",
    metodos: ["PUT"],
    parametros: ["id"],
    area: "ai",
    resumo: "PUT troca a lista inteira de agentes do roteador, com o assunto de cada um (nome, descrição, exemplos, funil e etapa). Administrador.",
  },
  {
    id: "ai/routers/:id/test",
    caminho: "ai/routers/[id]/test",
    metodos: ["POST"],
    parametros: ["id"],
    area: "ai",
    resumo: "POST /api/v1/ai/routers/:id/test — classifica uma mensagem de TESTE contra o router (manager+).",
  },
  {
    id: "ai/routing-results",
    caminho: "ai/routing-results",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "consulta: ai › routing results.",
  },
  {
    id: "ai/routing-results/:id",
    caminho: "ai/routing-results/[id]",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "ai",
    resumo: "altera: ai › routing results.",
  },
  {
    id: "ai/runs",
    caminho: "ai/runs",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/runs — as execuções de IA, com o que deu errado.",
  },
  {
    id: "ai/skills",
    caminho: "ai/skills",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/skills Skills instaláveis (Fase 2 do épico harness — spec 2026-07-23).",
  },
  {
    id: "ai/skills/:name",
    caminho: "ai/skills/[name]",
    metodos: ["GET", "PUT", "DELETE"],
    parametros: ["name"],
    area: "ai",
    resumo: "GET /api/v1/ai/skills/[name] — lê o corpo/matcher da skill instalada (editor) PUT /api/v1/ai/skills/[name] — salva nova versão do corpo + move o ponteiro DELETE /api/v1/ai/skills/[name] DELETE desinstala uma skill da org: remove SÓ o `skill",
  },
  {
    id: "ai/skills/:name/install",
    caminho: "ai/skills/[name]/install",
    metodos: ["POST"],
    parametros: ["name"],
    area: "ai",
    resumo: "POST /api/v1/ai/skills/[name]/install Instala (fork-on-install) uma skill do catálogo de PLATAFORMA pro catálogo da org (Task 4, `installPlatformSkill`) — a cópia da org fica independente dali em diante (editar/desinstalar não afeta o catál",
  },
  {
    id: "ai/skills/:name/restore",
    caminho: "ai/skills/[name]/restore",
    metodos: ["POST"],
    parametros: ["name"],
    area: "ai",
    resumo: "POST /api/v1/ai/skills/[name]/restore Restaura uma versão ANTERIOR da skill: move o ponteiro da organização para uma `skill_versions` já existente (Fase 5 do PLANO-CONFIG-UI-AGENTE).",
  },
  {
    id: "ai/skills/:name/versions",
    caminho: "ai/skills/[name]/versions",
    metodos: ["GET"],
    parametros: ["name"],
    area: "ai",
    resumo: "GET /api/v1/ai/skills/[name]/versions Histórico de versões da skill NESTA organização (Fase 5 do PLANO-CONFIG-UI-AGENTE).",
  },
  {
    id: "ai/skills/import",
    caminho: "ai/skills/import",
    metodos: ["POST"],
    parametros: [],
    area: "ai",
    resumo: "POST /api/v1/ai/skills/import Upload de pacote de skill instalável (.zip — Fase 2 do épico harness).",
  },
  {
    id: "ai/style-adjustments",
    caminho: "ai/style-adjustments",
    metodos: ["GET", "PUT"],
    parametros: [],
    area: "ai",
    resumo: "GET mostra os ajustes de estilo das respostas da IA; PUT liga ou desliga um ajuste de estilo (campos ajuste e enabled). PUT: administrador.",
  },
  {
    id: "ai/turn-traces",
    caminho: "ai/turn-traces",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/turn-traces — leitor técnico parcial do traço do turno (#3201).",
  },
  {
    id: "ai/usage",
    caminho: "ai/usage",
    metodos: ["GET"],
    parametros: [],
    area: "ai",
    resumo: "GET /api/v1/ai/usage — observability dashboard for AI invocations.",
  },
  {
    id: "anuncios/google/:org",
    caminho: "anuncios/google/[org]",
    metodos: ["GET"],
    parametros: ["org"],
    area: "anuncios",
    resumo: "Captura o identificador Google repassado pelo botão da landing page.",
  },
  {
    id: "anuncios/meta/:org",
    caminho: "anuncios/meta/[org]",
    metodos: ["GET"],
    parametros: ["org"],
    area: "anuncios",
    resumo: "GET /api/v1/anuncios/meta/[org] — o endereço que captura as UTMs e manda a pessoa para o WhatsApp com um ref curto no texto.",
  },
  {
    id: "attendants/availability",
    caminho: "attendants/availability",
    metodos: ["GET"],
    parametros: [],
    area: "attendants",
    resumo: "GET /api/v1/attendants/availability — roster de atendimento da org (org-wide).",
  },
  {
    id: "attendants/availability/:user_id",
    caminho: "attendants/availability/[user_id]",
    metodos: ["PATCH"],
    parametros: ["user_id"],
    area: "attendants",
    resumo: "PATCH /api/v1/attendants/availability/[user_id] — grava disponibilidade.",
  },
  {
    id: "attendants/presence",
    caminho: "attendants/presence",
    metodos: ["POST"],
    parametros: [],
    area: "attendants",
    resumo: "POST /api/v1/attendants/presence — o EMISSOR do sinal de presença.",
  },
  {
    id: "attendants/sector/:user_id",
    caminho: "attendants/sector/[user_id]",
    metodos: ["PUT"],
    parametros: ["user_id"],
    area: "attendants",
    resumo: "PUT põe o atendente (user_id) num setor, troca ou tira. Corpo: { sector_id } com o id do setor, ou null para tirar do setor. Muda para onde vão as conversas dele (cartão de alerta).",
  },
  {
    id: "attendants/sectors",
    caminho: "attendants/sectors",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "attendants",
    resumo: "GET lista os setores de atendimento; POST cria um setor. Corpo do POST: { name (até o limite do nome), description (opcional) }. Gerente ou administrador.",
  },
  {
    id: "attendants/sectors/:id",
    caminho: "attendants/sectors/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "attendants",
    resumo: "PATCH renomeia/redescreve o setor. Corpo: { name, description } (os dois campos; description pode ser null). Gerente ou administrador.",
  },
  {
    id: "audit",
    caminho: "audit",
    metodos: ["GET"],
    parametros: [],
    area: "audit",
    resumo: "GET /api/v1/audit — list audit log entries for the active organization.",
  },
  {
    id: "audit/export",
    caminho: "audit/export",
    metodos: ["GET"],
    parametros: [],
    area: "audit",
    resumo: "GET /api/v1/audit/export — CSV export of audit entries (up to 10k rows).",
  },
  {
    id: "automation-rules",
    caminho: "automation-rules",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "automation-rules",
    resumo: "GET lista as automações da empresa; POST cria uma automação, que nasce pausada. Automação pode enviar mensagem; gerente.",
  },
  {
    id: "automation-rules/:id",
    caminho: "automation-rules/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "automation-rules",
    resumo: "PATCH altera uma automação, inclusive ligar e desligar (is_active). Uma automação ligada pode enviar mensagens. Gerente.",
  },
  {
    id: "automation-rules/:id/runs",
    caminho: "automation-rules/[id]/runs",
    metodos: ["GET"],
    parametros: ["id"],
    area: "automation-rules",
    resumo: "GET /api/v1/automation-rules/[id]/runs?limit=50 — histórico de execuções, desc.",
  },
  {
    id: "automation-rules/runs",
    caminho: "automation-rules/runs",
    metodos: ["GET"],
    parametros: [],
    area: "automation-rules",
    resumo: "GET /api/v1/automation-rules/runs?limit=50 — histórico de execuções da ORG inteira (cross-rule), desc.",
  },
  {
    id: "automation-rules/runs/:runId/resend",
    caminho: "automation-rules/runs/[runId]/resend",
    metodos: ["POST"],
    parametros: ["runId"],
    area: "automation-rules",
    resumo: "POST /api/v1/automation-rules/runs/[runId]/resend — reexecuta SÓ as ações `call_webhook` da regra do run, contra o evento original (`event_log` do run.event_id).",
  },
  {
    id: "calls",
    caminho: "calls",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "calls",
    resumo: "POST /api/v1/calls Cria a linha em voice_calls (provider='sip') como 'ringing' e origina via ARI.",
  },
  {
    id: "campaign-suppressions",
    caminho: "campaign-suppressions",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "campaign-suppressions",
    resumo: "GET /api/v1/campaign-suppressions — quem está fora de toda campanha.",
  },
  {
    id: "campaign-suppressions/:id",
    caminho: "campaign-suppressions/[id]",
    metodos: ["DELETE"],
    parametros: ["id"],
    area: "campaign-suppressions",
    resumo: "DELETE /api/v1/campaign-suppressions/:id — tira o número da lista de exclusão.",
  },
  {
    id: "campaign-templates",
    caminho: "campaign-templates",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "campaign-templates",
    resumo: "GET lista os textos guardados de campanha; POST guarda um texto novo de campanha (rascunho de mensagem). Não dispara nada. Gerente.",
  },
  {
    id: "campaign-templates/:id",
    caminho: "campaign-templates/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "campaign-templates",
    resumo: "PATCH reescreve um texto guardado de campanha. Não altera campanha já preparada ou enviada. Gerente ou acima.",
  },
  {
    id: "campaigns",
    caminho: "campaigns",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "campaigns",
    resumo: "GET lista as campanhas de mensagens em massa; POST cria uma campanha em rascunho. Campanha manda mensagem a vários clientes. Gerente.",
  },
  {
    id: "campaigns/:id",
    caminho: "campaigns/[id]",
    metodos: ["GET", "PATCH"],
    parametros: ["id"],
    area: "campaigns",
    resumo: "GET mostra uma campanha e seus números; PATCH edita a campanha, mas só enquanto está em rascunho. Gerente ou acima.",
  },
  {
    id: "campaigns/:id/:acao",
    caminho: "campaigns/[id]/[acao]",
    metodos: ["POST"],
    parametros: ["id", "acao"],
    area: "campaigns",
    resumo: "POST executa uma ação de campanha: preparar, iniciar, agendar, pausar, retomar, cancelar, duplicar ou testar. Pode enviar mensagem. Gerente.",
  },
  {
    id: "campaigns/:id/metrics",
    caminho: "campaigns/[id]/metrics",
    metodos: ["GET"],
    parametros: ["id"],
    area: "campaigns",
    resumo: "GET /api/v1/campaigns/:id/metrics — o funil da campanha.",
  },
  {
    id: "campaigns/:id/recipients",
    caminho: "campaigns/[id]/recipients",
    metodos: ["GET"],
    parametros: ["id"],
    area: "campaigns",
    resumo: "GET /api/v1/campaigns/:id/recipients — quem recebeu, quem não, e por quê.",
  },
  {
    id: "campaigns/modelos",
    caminho: "campaigns/modelos",
    metodos: ["GET"],
    parametros: [],
    area: "campaigns",
    resumo: "GET /api/v1/campaigns/modelos?channel_session_id=… — o que uma campanha pode mandar por ESTE número (migration 0710, issue #1330 fatia 4).",
  },
  {
    id: "campaigns/preview",
    caminho: "campaigns/preview",
    metodos: ["POST"],
    parametros: [],
    area: "campaigns",
    resumo: "POST prévia de campanha: mostra quantos clientes receberiam e quem fica de fora. Não grava nem envia nada. Gerente ou acima.",
  },
  {
    id: "channel-schedules",
    caminho: "channel-schedules",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "channel-schedules",
    resumo: "GET lista as janelas de manutenção dos números de WhatsApp; POST agenda uma janela (início, fim, número ou empresa toda). Administrador.",
  },
  {
    id: "channel-schedules/:id",
    caminho: "channel-schedules/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "channel-schedules",
    resumo: "PATCH muda os horários de uma janela de manutenção do número do WhatsApp que ainda não começou. Só administrador.",
  },
  {
    id: "channel-sessions",
    caminho: "channel-sessions",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "channel-sessions",
    resumo: "GET lista os números de WhatsApp (canais) conectados da empresa; conectar um número novo é POST e só administrador.",
  },
  {
    id: "channel-sessions/:id",
    caminho: "channel-sessions/[id]",
    metodos: ["GET", "DELETE"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "GET /api/v1/channel-sessions/[id] — health check AO VIVO de um canal.",
  },
  {
    id: "channel-sessions/:id/acervo",
    caminho: "channel-sessions/[id]/acervo",
    metodos: ["GET", "PATCH"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "A opção por conexão da #999: guardar (ou não) o acervo do histórico do número.",
  },
  {
    id: "channel-sessions/:id/ai-access",
    caminho: "channel-sessions/[id]/ai-access",
    metodos: ["GET", "PATCH"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "Só administradores podem ler os telefones de teste ou mudar o alcance da IA.",
  },
  {
    id: "channel-sessions/:id/disabled",
    caminho: "channel-sessions/[id]/disabled",
    metodos: ["GET", "PATCH"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "Lê se o canal está desativado pelo operador.",
  },
  {
    id: "channel-sessions/:id/groups",
    caminho: "channel-sessions/[id]/groups",
    metodos: ["GET", "PUT"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "GET/PUT /api/v1/channel-sessions/[id]/groups — os grupos do número e a chave de cada um.",
  },
  {
    id: "channel-sessions/:id/historico",
    caminho: "channel-sessions/[id]/historico",
    metodos: ["GET", "POST"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "A importação do histórico do número (#999), pela tela de conexões.",
  },
  {
    id: "channel-sessions/:id/name",
    caminho: "channel-sessions/[id]/name",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "Altera somente o rótulo interno do canal; nenhum nome é enviado ao provedor.",
  },
  {
    id: "channel-sessions/:id/pairing-code",
    caminho: "channel-sessions/[id]/pairing-code",
    metodos: ["POST"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "cria ou executa: canais de WhatsApp (números) › pairing code.",
  },
  {
    id: "channel-sessions/:id/qr",
    caminho: "channel-sessions/[id]/qr",
    metodos: ["GET"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "GET /api/v1/channel-sessions/[id]/qr — proxy do QR de UM canal específico.",
  },
  {
    id: "channel-sessions/:id/reconnect",
    caminho: "channel-sessions/[id]/reconnect",
    metodos: ["POST"],
    parametros: ["id"],
    area: "channel-sessions",
    resumo: "POST /api/v1/channel-sessions/[id]/reconnect — reconecta um canal caído.",
  },
  {
    id: "channel-sessions/disabled",
    caminho: "channel-sessions/disabled",
    metodos: ["PATCH"],
    parametros: [],
    area: "channel-sessions",
    resumo: "AÇÃO EM LOTE da Central de Conexões (issue #2387).",
  },
  {
    id: "channels/graph-partner",
    caminho: "channels/graph-partner",
    metodos: ["GET", "POST", "PATCH"],
    parametros: [],
    area: "channels",
    resumo: "GET /api/v1/channels/graph-partner — estado da conexão + o que colar no provedor.",
  },
  {
    id: "channels/graph-partner/templates",
    caminho: "channels/graph-partner/templates",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "channels",
    resumo: "GET /api/v1/channels/graph-partner/templates — o espelho desta conexão, com os slots.",
  },
  {
    id: "channels/official",
    caminho: "channels/official",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "channels",
    resumo: "GET /api/v1/channels/official — estado da conexão oficial + o que colar na Meta.",
  },
  {
    id: "channels/official/webhook",
    caminho: "channels/official/webhook",
    metodos: ["POST"],
    parametros: [],
    area: "channels",
    resumo: "POST /api/v1/channels/official/webhook — \"tentar de novo\" o registro do webhook.",
  },
  {
    id: "channels/partner",
    caminho: "channels/partner",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "channels",
    resumo: "GET /api/v1/channels/partner — estado da conexão por credencial + o que colar no provedor.",
  },
  {
    id: "channels/partner/templates",
    caminho: "channels/partner/templates",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "channels",
    resumo: "As definições aprovadas do canal INTERMEDIADO — listar, sincronizar, criar.",
  },
  {
    id: "channels/partner/templates/media",
    caminho: "channels/partner/templates/media",
    metodos: ["POST"],
    parametros: [],
    area: "channels",
    resumo: "A imagem do cabeçalho de uma definição do canal INTERMEDIADO — subir do computador, sem colar URL.",
  },
  {
    id: "channels/social",
    caminho: "channels/social",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "channels",
    resumo: "consulta / cria ou executa: channels › social.",
  },
  {
    id: "channels/templates",
    caminho: "channels/templates",
    metodos: ["GET", "POST", "PATCH"],
    parametros: [],
    area: "channels",
    resumo: "GET /api/v1/channels/templates — o espelho local + o CONTRATO derivado de cada um.",
  },
  {
    id: "channels/templates/media",
    caminho: "channels/templates/media",
    metodos: ["POST"],
    parametros: [],
    area: "channels",
    resumo: "A imagem do cabeçalho de uma definição do canal OFICIAL DIRETO (#3635).",
  },
  {
    id: "cobranca/assinatura/cancelar",
    caminho: "cobranca/assinatura/cancelar",
    metodos: ["POST"],
    parametros: [],
    area: "cobranca",
    resumo: "POST /api/v1/cobranca/assinatura/cancelar — a empresa cancela (spec §7f, D-14): o acesso segue até o fim do período pago e não há reembolso automático.",
  },
  {
    id: "cobranca/assinatura/checkout",
    caminho: "cobranca/assinatura/checkout",
    metodos: ["POST"],
    parametros: [],
    area: "cobranca",
    resumo: "POST /api/v1/cobranca/assinatura/checkout — o botão \"Assinar\" (spec da cobrança do revendedor §7b).",
  },
  {
    id: "cobranca/assinatura/gerenciar",
    caminho: "cobranca/assinatura/gerenciar",
    metodos: ["POST"],
    parametros: [],
    area: "cobranca",
    resumo: "POST /api/v1/cobranca/assinatura/gerenciar — o portal do provedor, onde a empresa troca o cartão e vê as faturas (spec §13).",
  },
  {
    id: "cobranca/assinatura/plano",
    caminho: "cobranca/assinatura/plano",
    metodos: ["POST"],
    parametros: [],
    area: "cobranca",
    resumo: "POST /api/v1/cobranca/assinatura/plano — a empresa troca de plano (spec §7e): o MESMO caminho do card do dono (`lib/cobranca/troca.ts`).",
  },
  {
    id: "cobranca/assinatura/sincronizar",
    caminho: "cobranca/assinatura/sincronizar",
    metodos: ["POST"],
    parametros: [],
    area: "cobranca",
    resumo: "POST /api/v1/cobranca/assinatura/sincronizar — \"Já paguei\" e a volta do checkout (`?voltou=1`), spec §7b.4 e §7d.5.",
  },
  {
    id: "companies",
    caminho: "companies",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "companies",
    resumo: "GET lista as empresas (clientes PJ); POST cadastra uma empresa cliente nova. Cadastrar exige gerente ou acima.",
  },
  {
    id: "companies/:id",
    caminho: "companies/[id]",
    metodos: ["GET", "PATCH", "DELETE"],
    parametros: ["id"],
    area: "companies",
    resumo: "GET mostra uma empresa cliente; PATCH altera os dados da empresa (atendente ou acima).",
  },
  {
    id: "companies/:id/enrich",
    caminho: "companies/[id]/enrich",
    metodos: ["POST"],
    parametros: ["id"],
    area: "companies",
    resumo: "POST /api/v1/companies/:id/enrich — reprocessa BrasilAPI (manager+).",
  },
  {
    id: "companies/lookup",
    caminho: "companies/lookup",
    metodos: ["GET"],
    parametros: [],
    area: "companies",
    resumo: "GET /api/v1/companies/lookup?cnpj=...",
  },
  {
    id: "company-people",
    caminho: "company-people",
    metodos: ["POST"],
    parametros: [],
    area: "company-people",
    resumo: "POST vincula uma pessoa a uma empresa cliente (cargo/vínculo). Gerente ou acima.",
  },
  {
    id: "company-people/:id",
    caminho: "company-people/[id]",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "company-people",
    resumo: "PATCH altera o vínculo entre uma pessoa e uma empresa cliente. Atendente ou acima.",
  },
  {
    id: "contact-tags",
    caminho: "contact-tags",
    metodos: ["GET"],
    parametros: [],
    area: "contact-tags",
    resumo: "Sugestões do contato: sem busca mantém compatibilidade; com busca lê a página do vocabulário curado e em uso, com a sessão e a RLS.",
  },
  {
    id: "contacts",
    caminho: "contacts",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "contacts",
    resumo: "GET lista os clientes e contatos; POST cadastra um contato novo (nome, telefone, e-mail, etiquetas). Atendente ou acima para criar.",
  },
  {
    id: "contacts/:id",
    caminho: "contacts/[id]",
    metodos: ["GET", "PATCH", "DELETE"],
    parametros: ["id"],
    area: "contacts",
    resumo: "GET mostra um cliente/contato; PATCH altera os dados do contato, inclusive arquivar. Atendente ou acima.",
  },
  {
    id: "contacts/:id/always-human",
    caminho: "contacts/[id]/always-human",
    metodos: ["POST", "DELETE"],
    parametros: ["id"],
    area: "contacts",
    resumo: "POST marca o contato para atendimento sempre humano: a IA nunca responde a ele, nem após devolução automática. Gerente ou acima.",
  },
  {
    id: "contacts/:id/carteira",
    caminho: "contacts/[id]/carteira",
    metodos: ["GET", "PATCH"],
    parametros: ["id"],
    area: "contacts",
    resumo: "GET mostra a carteira do cliente; PATCH põe ou tira o cliente da carteira de um vendedor (responsável). Gerente ou acima.",
  },
  {
    id: "contacts/:id/compras",
    caminho: "contacts/[id]/compras",
    metodos: ["GET"],
    parametros: ["id"],
    area: "contacts",
    resumo: "GET /api/v1/contacts/[id]/compras — as \"Últimas compras\" do contato (#3179).",
  },
  {
    id: "contacts/:id/crm-summary",
    caminho: "contacts/[id]/crm-summary",
    metodos: ["GET"],
    parametros: ["id"],
    area: "contacts",
    resumo: "GET /api/v1/contacts/[id]/crm-summary — o resumo de CRM do painel do inbox.",
  },
  {
    id: "contacts/:id/hierarquia-do-anuncio",
    caminho: "contacts/[id]/hierarquia-do-anuncio",
    metodos: ["GET"],
    parametros: ["id"],
    area: "contacts",
    resumo: "GET /api/v1/contacts/[id]/hierarquia-do-anuncio — o nome da campanha, do conjunto e do anúncio de onde este contato veio.",
  },
  {
    id: "contacts/:id/person",
    caminho: "contacts/[id]/person",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "contacts",
    resumo: "PATCH liga o contato a uma pessoa do cadastro (person_id), ou desliga com null. Atendente ou acima.",
  },
  {
    id: "contacts/:id/personal",
    caminho: "contacts/[id]/personal",
    metodos: ["POST", "DELETE"],
    parametros: ["id"],
    area: "contacts",
    resumo: "POST marca o contato como pessoal: sai da operação do dia a dia e a IA deixa de atendê-lo. Gerente ou acima.",
  },
  {
    id: "contacts/:id/proposals",
    caminho: "contacts/[id]/proposals",
    metodos: ["GET"],
    parametros: ["id"],
    area: "contacts",
    resumo: "GET /api/v1/contacts/[id]/proposals — o que a IA ouviu e ainda espera decisão.",
  },
  {
    id: "contacts/:id/proposals/:proposal_id",
    caminho: "contacts/[id]/proposals/[proposal_id]",
    metodos: ["POST"],
    parametros: ["id", "proposal_id"],
    area: "contacts",
    resumo: "POST responde a uma sugestão da IA sobre o contato: accept grava no cadastro, dismiss recusa. As duas ficam registradas.",
  },
  {
    id: "contacts/:id/roteiros",
    caminho: "contacts/[id]/roteiros",
    metodos: ["GET"],
    parametros: ["id"],
    area: "contacts",
    resumo: "GET /api/v1/contacts/[id]/roteiros — o que os roteiros de atendimento coletaram deste contato, para a ficha e o painel da conversa (qualquer membro).",
  },
  {
    id: "contacts/:id/timeline",
    caminho: "contacts/[id]/timeline",
    metodos: ["GET"],
    parametros: ["id"],
    area: "contacts",
    resumo: "GET mostra a linha do tempo do cliente: atividades do contato e dos negócios dele.",
  },
  {
    id: "contacts/:id/unblock",
    caminho: "contacts/[id]/unblock",
    metodos: ["POST"],
    parametros: ["id"],
    area: "contacts",
    resumo: "DESFAZ O DESCADASTRO DO CONTATO — o override que a regra W-02 prevê.",
  },
  {
    id: "contacts/:id/vinculos",
    caminho: "contacts/[id]/vinculos",
    metodos: ["GET"],
    parametros: ["id"],
    area: "contacts",
    resumo: "GET /api/v1/contacts/[id]/vinculos — o que a exclusão VAI encontrar, sem apagar nada (issue #1925).",
  },
  {
    id: "contacts/bulk",
    caminho: "contacts/bulk",
    metodos: ["POST"],
    parametros: [],
    area: "contacts",
    resumo: "POST edita contatos em lote: etiqueta, carteira de vendedor ou campo personalizado, numa só chamada.",
  },
  {
    id: "contacts/compare",
    caminho: "contacts/compare",
    metodos: ["GET"],
    parametros: [],
    area: "contacts",
    resumo: "GET /api/v1/contacts/compare?ids=<uuid>,<uuid> — duas fichas lado a lado (Spec 31, PR A).",
  },
  {
    id: "contacts/duplicates",
    caminho: "contacts/duplicates",
    metodos: ["GET"],
    parametros: [],
    area: "contacts",
    resumo: "GET /api/v1/contacts/duplicates — quem é a MESMA pessoa cadastrada duas vezes.",
  },
  {
    id: "contacts/duplicates/dismiss",
    caminho: "contacts/duplicates/dismiss",
    metodos: ["POST"],
    parametros: [],
    area: "contacts",
    resumo: "POST marca duas fichas como NÃO duplicadas (o sistema para de sugerir juntar; não junta nem apaga nada). Corpo: { contact_ids: [id1, id2] } com dois ids diferentes.",
  },
  {
    id: "contacts/import",
    caminho: "contacts/import",
    metodos: ["POST"],
    parametros: [],
    area: "contacts",
    resumo: "POST /api/v1/contacts/import — importa contatos de planilha CSV.",
  },
  {
    id: "contacts/import/agenda",
    caminho: "contacts/import/agenda",
    metodos: ["POST"],
    parametros: [],
    area: "contacts",
    resumo: "POST /api/v1/contacts/import/agenda — o \"Sincronizar agenda do celular\" (#2736).",
  },
  {
    id: "contacts/merge",
    caminho: "contacts/merge",
    metodos: ["POST"],
    parametros: [],
    area: "contacts",
    resumo: "POST unifica dois cadastros da mesma pessoa em um só, movendo conversas e negócios do duplicado. Gerente ou acima.",
  },
  {
    id: "conversation-tags",
    caminho: "conversation-tags",
    metodos: ["GET"],
    parametros: [],
    area: "conversation-tags",
    resumo: "GET /api/v1/conversation-tags — vocabulário canônico de tags de conversa da org ativa (spec 13 §3.3, G3-05).",
  },
  {
    id: "conversations",
    caminho: "conversations",
    metodos: ["GET"],
    parametros: [],
    area: "conversations",
    resumo: "GET lista as conversas do Inbox (atendimentos abertos, fechados), com filtros. Só leitura.",
  },
  {
    id: "conversations/:id",
    caminho: "conversations/[id]",
    metodos: ["GET", "PATCH"],
    parametros: ["id"],
    area: "conversations",
    resumo: "GET mostra uma conversa; PATCH altera a situação e as etiquetas da conversa. Atendente ou acima.",
  },
  {
    id: "conversations/:id/aviso-de-mensagem",
    caminho: "conversations/[id]/aviso-de-mensagem",
    metodos: ["GET"],
    parametros: ["id"],
    area: "conversations",
    resumo: "GET /api/v1/conversations/[id]/aviso-de-mensagem — \"devo avisar ESTA pessoa da mensagem que acabou de chegar nesta conversa?\" → `{ avisar, conteudo }`.",
  },
  {
    id: "conversations/:id/claim",
    caminho: "conversations/[id]/claim",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST o atendente assume a conversa; recusa se outro atendente já assumiu.",
  },
  {
    id: "conversations/:id/close",
    caminho: "conversations/[id]/close",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST fecha (encerra) a conversa. Qualquer atendente com acesso à conversa pode fechar.",
  },
  {
    id: "conversations/:id/draft-reply",
    caminho: "conversations/[id]/draft-reply",
    metodos: ["GET", "POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "GET lê e POST gera o rascunho de resposta da IA para a conversa. Só sugere o texto; não envia mensagem ao cliente.",
  },
  {
    id: "conversations/:id/drafts",
    caminho: "conversations/[id]/drafts",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST cria um rascunho de resposta na conversa (texto e origem), para o atendente revisar. Não envia ao cliente.",
  },
  {
    id: "conversations/:id/drafts/consume",
    caminho: "conversations/[id]/drafts/consume",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST marca o rascunho como usado (draft_id), depois que o atendente enviou o texto. Não envia mensagem.",
  },
  {
    id: "conversations/:id/export",
    caminho: "conversations/[id]/export",
    metodos: ["GET"],
    parametros: ["id"],
    area: "conversations",
    resumo: "consulta: conversas › exportar.",
  },
  {
    id: "conversations/:id/mark-read",
    caminho: "conversations/[id]/mark-read",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST marca a conversa como lida, zerando as mensagens não lidas do atendente.",
  },
  {
    id: "conversations/:id/media",
    caminho: "conversations/[id]/media",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST /api/v1/conversations/[id]/media — upload outbound (multipart).",
  },
  {
    id: "conversations/:id/messages",
    caminho: "conversations/[id]/messages",
    metodos: ["GET"],
    parametros: ["id"],
    area: "conversations",
    resumo: "GET mostra o histórico de mensagens de uma conversa com o cliente. Só leitura.",
  },
  {
    id: "conversations/:id/notes",
    caminho: "conversations/[id]/notes",
    metodos: ["GET", "POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "GET lista as notas internas da conversa; POST anota uma nota interna. A nota nunca vai ao WhatsApp do cliente.",
  },
  {
    id: "conversations/:id/notes/:noteId",
    caminho: "conversations/[id]/notes/[noteId]",
    metodos: ["DELETE"],
    parametros: ["id", "noteId"],
    area: "conversations",
    resumo: "DELETE /api/v1/conversations/[id]/notes/[noteId] — apaga uma nota interna.",
  },
  {
    id: "conversations/:id/notes/media",
    caminho: "conversations/[id]/notes/media",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST /api/v1/conversations/[id]/notes/media — upload do ANEXO DA NOTA INTERNA (issue #1863, F3).",
  },
  {
    id: "conversations/:id/participants",
    caminho: "conversations/[id]/participants",
    metodos: ["GET", "POST", "DELETE"],
    parametros: ["id"],
    area: "conversations",
    resumo: "GET lista; POST adiciona um participante ao atendimento conjunto da conversa (lê e responde, sem virar o dono). Gerente ou acima.",
  },
  {
    id: "conversations/:id/passagens",
    caminho: "conversations/[id]/passagens",
    metodos: ["GET"],
    parametros: ["id"],
    area: "conversations",
    resumo: "GET /api/v1/conversations/[id]/passagens — o que a IA deixou para quem assume.",
  },
  {
    id: "conversations/:id/pause-ai",
    caminho: "conversations/[id]/pause-ai",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST /api/v1/conversations/[id]/pause-ai — a pessoa assume o comando e o atendimento automático para nesta conversa.",
  },
  {
    id: "conversations/:id/reactivate-bot",
    caminho: "conversations/[id]/reactivate-bot",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST /api/v1/conversations/[id]/reactivate-bot Devolve o atendimento ao agente.",
  },
  {
    id: "conversations/:id/release",
    caminho: "conversations/[id]/release",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST solta a conversa que o atendente havia assumido: volta a ficar aberta, sem dono.",
  },
  {
    id: "conversations/:id/retention",
    caminho: "conversations/[id]/retention",
    metodos: ["GET"],
    parametros: ["id"],
    area: "conversations",
    resumo: "GET /api/v1/conversations/[id]/retention — vetos recentes da cadeia before_send para o contato desta conversa (Operação Visível F2-i).",
  },
  {
    id: "conversations/:id/snooze",
    caminho: "conversations/[id]/snooze",
    metodos: ["POST", "DELETE"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST adormece a conversa: define um lembrete para avisar se o cliente não responder em certo prazo.",
  },
  {
    id: "conversations/:id/transfer",
    caminho: "conversations/[id]/transfer",
    metodos: ["GET", "POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST transfere a conversa para outro atendente (reatribui na hora, sem aceite). Atendente ou acima.",
  },
  {
    id: "conversations/:id/usable-for-rag",
    caminho: "conversations/[id]/usable-for-rag",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversations",
    resumo: "POST /api/v1/conversations/[id]/usable-for-rag Agent-toggle for the RAG opt-in flag (LGPD L-08).",
  },
  {
    id: "conversations/bulk",
    caminho: "conversations/bulk",
    metodos: ["POST"],
    parametros: [],
    area: "conversations",
    resumo: "POST ação em lote em conversas: fechar, arquivar, marcar como lida, pausar IA, reativar IA ou transferir.",
  },
  {
    id: "conversations/counts",
    caminho: "conversations/counts",
    metodos: ["GET"],
    parametros: [],
    area: "conversations",
    resumo: "GET conta as conversas por visão do Inbox (minhas, não lidas, sem dono etc.), respeitando o que cada atendente pode ver.",
  },
  {
    id: "conversations/open-with-contact",
    caminho: "conversations/open-with-contact",
    metodos: ["POST"],
    parametros: [],
    area: "conversations",
    resumo: "POST abre a conversa 1:1 com um contato (cartão compartilhado do WhatsApp), reaproveitando a conversa se já existir.",
  },
  {
    id: "conversions/meta-clicks/:id/retry",
    caminho: "conversions/meta-clicks/[id]/retry",
    metodos: ["POST"],
    parametros: ["id"],
    area: "conversions",
    resumo: "Reprocessa uma oportunidade CTWA sem exigir ou fabricar card CRM.",
  },
  {
    id: "demandas/:id",
    caminho: "demandas/[id]",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "demandas",
    resumo: "PATCH define o próximo passo (e quando) de uma demanda interna aberta, ou a encerra.",
  },
  {
    id: "external-db/connections",
    caminho: "external-db/connections",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "external-db",
    resumo: "GET /api/v1/external-db/connections — lista as conexões da org ativa.",
  },
  {
    id: "external-db/connections/:id",
    caminho: "external-db/connections/[id]",
    metodos: ["GET", "PATCH", "DELETE"],
    parametros: ["id"],
    area: "external-db",
    resumo: "GET /api/v1/external-db/connections/:id — detalhe (qualquer autenticado) PATCH /api/v1/external-db/connections/:id — atualiza (admin) DELETE /api/v1/external-db/connections/:id — remove (admin) A senha nunca sai daqui: a leitura vem da `_sa",
  },
  {
    id: "external-db/connections/:id/catalog",
    caminho: "external-db/connections/[id]/catalog",
    metodos: ["GET"],
    parametros: ["id"],
    area: "external-db",
    resumo: "GET /api/v1/external-db/connections/:id/catalog (admin) O catálogo COMPLETO do banco de origem, ignorando as fontes liberadas.",
  },
  {
    id: "external-db/connections/:id/recipes",
    caminho: "external-db/connections/[id]/recipes",
    metodos: ["GET", "PUT"],
    parametros: ["id"],
    area: "external-db",
    resumo: "GET /api/v1/external-db/connections/:id/recipes (qualquer autenticado) PUT /api/v1/external-db/connections/:id/recipes (admin) As INSTÂNCIAS DE RECEITA da conexão: receita escolhida + parâmetros preenchidos na tela (fixos), gravados na colu",
  },
  {
    id: "external-db/connections/:id/recipes/preview",
    caminho: "external-db/connections/[id]/recipes/preview",
    metodos: ["POST"],
    parametros: ["id"],
    area: "external-db",
    resumo: "POST /api/v1/external-db/connections/:id/recipes/preview (admin) Executa UMA instância de receita com parâmetros de busca vindos do corpo (Zod da receita) e devolve as linhas para a tela.",
  },
  {
    id: "external-db/connections/:id/schemas",
    caminho: "external-db/connections/[id]/schemas",
    metodos: ["GET"],
    parametros: ["id"],
    area: "external-db",
    resumo: "GET /api/v1/external-db/connections/:id/schemas (qualquer autenticado) Retrato AO VIVO do catálogo: tabelas, views, colunas, chave primária e estimativa de linhas.",
  },
  {
    id: "external-db/connections/:id/sources",
    caminho: "external-db/connections/[id]/sources",
    metodos: ["GET", "PUT"],
    parametros: ["id"],
    area: "external-db",
    resumo: "GET /api/v1/external-db/connections/:id/sources (qualquer autenticado) PUT /api/v1/external-db/connections/:id/sources (admin) As FONTES LIBERADAS da conexão: o modo (`all` | `list`) e a lista do que o assistente e a grade podem ler.",
  },
  {
    id: "external-db/connections/:id/tables/:schema/:tabela",
    caminho: "external-db/connections/[id]/tables/[schema]/[tabela]",
    metodos: ["GET"],
    parametros: ["id", "schema", "tabela"],
    area: "external-db",
    resumo: "GET /api/v1/external-db/connections/:id/tables/:schema/:tabela Dados paginados de uma tabela/view.",
  },
  {
    id: "external-db/connections/:id/test",
    caminho: "external-db/connections/[id]/test",
    metodos: ["POST"],
    parametros: ["id"],
    area: "external-db",
    resumo: "POST /api/v1/external-db/connections/:id/test (admin) Abre um `Client` descartável (não polui o cache de pools), roda `select 1` e grava o resultado em `last_tested_*`.",
  },
  {
    id: "financeiro/catalogo/:tipo",
    caminho: "financeiro/catalogo/[tipo]",
    metodos: ["GET", "POST", "PATCH", "DELETE"],
    parametros: ["tipo"],
    area: "financeiro",
    resumo: "GET lista; POST cadastra e PATCH altera contas, formas de pagamento e plano de contas (tipo na rota). Escrever: gerente ou acima.",
  },
  {
    id: "financeiro/comandas",
    caminho: "financeiro/comandas",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "financeiro",
    resumo: "GET lista as comandas (vendas do caixa); POST abre uma comanda nova para um cliente ou atendimento.",
  },
  {
    id: "financeiro/comandas/:id",
    caminho: "financeiro/comandas/[id]",
    metodos: ["GET", "PATCH"],
    parametros: ["id"],
    area: "financeiro",
    resumo: "GET mostra a comanda; PATCH dá desconto ou cancela a comanda (cancelar não apaga). Atendente ou acima.",
  },
  {
    id: "financeiro/comandas/:id/estornar",
    caminho: "financeiro/comandas/[id]/estornar",
    metodos: ["POST"],
    parametros: ["id"],
    area: "financeiro",
    resumo: "POST estorna uma comanda já finalizada: lança o contrário no financeiro sem apagar o original. Gerente ou acima.",
  },
  {
    id: "financeiro/comandas/:id/finalizar",
    caminho: "financeiro/comandas/[id]/finalizar",
    metodos: ["POST"],
    parametros: ["id"],
    area: "financeiro",
    resumo: "POST finaliza a comanda: fecha a venda, gera comissão, lança a entrada financeira e a fidelidade, tudo numa transação.",
  },
  {
    id: "financeiro/comandas/:id/itens",
    caminho: "financeiro/comandas/[id]/itens",
    metodos: ["POST"],
    parametros: ["id"],
    area: "financeiro",
    resumo: "POST adiciona um item (produto ou serviço) à comanda e calcula a comissão do item na hora.",
  },
  {
    id: "financeiro/comandas/:id/itens/:itemId",
    caminho: "financeiro/comandas/[id]/itens/[itemId]",
    metodos: ["DELETE"],
    parametros: ["id", "itemId"],
    area: "financeiro",
    resumo: "Remover um item da comanda.",
  },
  {
    id: "financeiro/comandas/faturar-lote",
    caminho: "financeiro/comandas/faturar-lote",
    metodos: ["POST"],
    parametros: [],
    area: "financeiro",
    resumo: "POST fatura em lote atendimentos que ficaram sem comanda (appointment_ids e forma de pagamento). Cada um é uma transação.",
  },
  {
    id: "financeiro/comandas/pendentes",
    caminho: "financeiro/comandas/pendentes",
    metodos: ["GET"],
    parametros: [],
    area: "financeiro",
    resumo: "OS ATENDIMENTOS QUE ACONTECERAM E FICARAM SEM COMANDA.",
  },
  {
    id: "financeiro/fidelidade",
    caminho: "financeiro/fidelidade",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "financeiro",
    resumo: "GET mostra saldo e extrato de pontos de fidelidade de um cliente; POST lança ou resgata pontos (com motivo).",
  },
  {
    id: "financeiro/lancamentos",
    caminho: "financeiro/lancamentos",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "financeiro",
    resumo: "GET lista os lançamentos financeiros (entradas e saídas); POST cria um lançamento que não veio de comanda.",
  },
  {
    id: "financeiro/lancamentos/:id",
    caminho: "financeiro/lancamentos/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "financeiro",
    resumo: "PATCH marca o lançamento financeiro como pago. Lançamento pago não pode mais ser alterado. Atendente ou acima.",
  },
  {
    id: "honorarios/contratos",
    caminho: "honorarios/contratos",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "honorarios",
    resumo: "GET lista; POST cria contrato de honorários (fixo, êxito ou misto) de um caso. Módulo opcional, só se estiver instalado.",
  },
  {
    id: "honorarios/contratos/:id/parcelas",
    caminho: "honorarios/contratos/[id]/parcelas",
    metodos: ["GET", "POST"],
    parametros: ["id"],
    area: "honorarios",
    resumo: "GET lista; POST cria as parcelas de um contrato de honorários (número, vencimento, valor). Módulo opcional.",
  },
  {
    id: "honorarios/parcelas/:id/pagar",
    caminho: "honorarios/parcelas/[id]/pagar",
    metodos: ["POST"],
    parametros: ["id"],
    area: "honorarios",
    resumo: "POST marca a parcela de honorários como paga e lança a entrada no caixa (conta e plano de contas). Módulo opcional.",
  },
  {
    id: "imports",
    caminho: "imports",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "imports",
    resumo: "GET /api/v1/imports — lista lotes da org.",
  },
  {
    id: "imports/:id",
    caminho: "imports/[id]",
    metodos: ["GET"],
    parametros: ["id"],
    area: "imports",
    resumo: "consulta: imports.",
  },
  {
    id: "lead-captures",
    caminho: "lead-captures",
    metodos: ["GET"],
    parametros: [],
    area: "lead-captures",
    resumo: "GET /api/v1/lead-captures — o histórico de leads captados por formulário.",
  },
  {
    id: "leads",
    caminho: "leads",
    metodos: ["POST"],
    parametros: [],
    area: "leads",
    resumo: "POST cria um negócio (card) no funil, ligado a um contato. Atendente ou acima.",
  },
  {
    id: "leads/:id",
    caminho: "leads/[id]",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "leads",
    resumo: "PATCH altera os dados do negócio (valor, campos personalizados etc.). Atendente ou acima.",
  },
  {
    id: "leads/:id/attachments",
    caminho: "leads/[id]/attachments",
    metodos: ["GET", "POST", "DELETE"],
    parametros: ["id"],
    area: "leads",
    resumo: "consulta / cria ou executa / remove: negócios (cards do funil) › attachments.",
  },
  {
    id: "leads/:id/clone",
    caminho: "leads/[id]/clone",
    metodos: ["GET", "POST"],
    parametros: ["id"],
    area: "leads",
    resumo: "GET confere; POST leva o negócio para OUTRO funil, criando uma cópia lá. Mudar de funil não é feito pelo mover de etapa.",
  },
  {
    id: "leads/:id/contatos-relacionados",
    caminho: "leads/[id]/contatos-relacionados",
    metodos: ["GET", "POST", "DELETE"],
    parametros: ["id"],
    area: "leads",
    resumo: "GET lista; POST vincula outra pessoa ao negócio, com o papel dela (por exemplo decisor, cônjuge).",
  },
  {
    id: "leads/:id/conversion/retry",
    caminho: "leads/[id]/conversion/retry",
    metodos: ["POST"],
    parametros: ["id"],
    area: "leads",
    resumo: "cria ou executa: negócios (cards do funil) › conversion › retry.",
  },
  {
    id: "leads/:id/eventos",
    caminho: "leads/[id]/eventos",
    metodos: ["GET"],
    parametros: ["id"],
    area: "leads",
    resumo: "GET /api/v1/leads/[id]/eventos — o que o BANCO registrou deste negócio: as últimas linhas de `event_log` dos três tipos que viram aviso dentro do app (`lead.assigned`, `lead.won`, `lead.lost`), reduzidas ao que a decisão usa (issue #3224).",
  },
  {
    id: "leads/:id/field-proposals",
    caminho: "leads/[id]/field-proposals",
    metodos: ["GET"],
    parametros: ["id"],
    area: "leads",
    resumo: "GET /api/v1/leads/[id]/field-proposals — a FILA de revisão do card (issue #3316).",
  },
  {
    id: "leads/:id/field-proposals/:pid",
    caminho: "leads/[id]/field-proposals/[pid]",
    metodos: ["POST"],
    parametros: ["id", "pid"],
    area: "leads",
    resumo: "POST /api/v1/leads/[id]/field-proposals/[pid] — o HUMANO decide sobre o que a IA leu num documento (issue #3316): `accept` grava no card, `dismiss` recusa.",
  },
  {
    id: "leads/:id/lose",
    caminho: "leads/[id]/lose",
    metodos: ["POST"],
    parametros: ["id"],
    area: "leads",
    resumo: "POST marca o negócio como perdido, com o motivo da perda (obrigatório), movendo-o à etapa de perdido do funil.",
  },
  {
    id: "leads/:id/move",
    caminho: "leads/[id]/move",
    metodos: ["POST"],
    parametros: ["id"],
    area: "leads",
    resumo: "POST muda o negócio de etapa dentro do mesmo funil (mover no funil). Para trocar de funil, use clonar.",
  },
  {
    id: "leads/:id/next-action",
    caminho: "leads/[id]/next-action",
    metodos: ["POST"],
    parametros: ["id"],
    area: "leads",
    resumo: "POST decide a próxima ação que a IA propôs para o negócio: approve aprova ou dismiss descarta (as duas ficam registradas).",
  },
  {
    id: "leads/:id/reactivation",
    caminho: "leads/[id]/reactivation",
    metodos: ["POST"],
    parametros: ["id"],
    area: "leads",
    resumo: "POST decide a proposta de reativar um negócio parado: accept aceita ou dismiss recusa (proposal_id).",
  },
  {
    id: "leads/:id/retomar",
    caminho: "leads/[id]/retomar",
    metodos: ["POST"],
    parametros: ["id"],
    area: "leads",
    resumo: "POST retoma um negócio perdido como negócio NOVO, em funis configurados para reabrir assim.",
  },
  {
    id: "leads/:id/timeline",
    caminho: "leads/[id]/timeline",
    metodos: ["GET"],
    parametros: ["id"],
    area: "leads",
    resumo: "GET mostra a linha do tempo do negócio: atividades registradas nele, mesmo sem contato ligado.",
  },
  {
    id: "leads/:id/win",
    caminho: "leads/[id]/win",
    metodos: ["POST"],
    parametros: ["id"],
    area: "leads",
    resumo: "POST marca o negócio como ganho, movendo-o à etapa de ganho do funil. Repetir não faz mal.",
  },
  {
    id: "leads/at-risk",
    caminho: "leads/at-risk",
    metodos: ["GET"],
    parametros: [],
    area: "leads",
    resumo: "Radar de Risco (desilhamento C1 — doutrina do sistema vivo).",
  },
  {
    id: "leads/bulk",
    caminho: "leads/bulk",
    metodos: ["POST"],
    parametros: [],
    area: "leads",
    resumo: "POST ação em lote em negócios (mover de etapa, atribuir, etiquetar), até 50 por vez. Mover é tudo-ou-nada.",
  },
  {
    id: "leads/import",
    caminho: "leads/import",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "leads",
    resumo: "POST /api/v1/leads/import — o funil a partir da planilha que a empresa já tem.",
  },
  {
    id: "leads/proposals",
    caminho: "leads/proposals",
    metodos: ["GET"],
    parametros: [],
    area: "leads",
    resumo: "GET /api/v1/leads/proposals — as próximas ações da IA, em lista.",
  },
  {
    id: "leads/reactivations",
    caminho: "leads/reactivations",
    metodos: ["GET"],
    parametros: [],
    area: "leads",
    resumo: "GET /api/v1/leads/reactivations — as propostas de retomada VIVAS da org.",
  },
  {
    id: "marca/logo",
    caminho: "marca/logo",
    metodos: ["POST", "DELETE"],
    parametros: [],
    area: "marca",
    resumo: "O logo da marca — subir do computador, sem colar URL.",
  },
  {
    id: "message-template-groups",
    caminho: "message-template-groups",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "message-template-groups",
    resumo: "GET lista os grupos de respostas rápidas; POST cria um. Corpo do POST: { name } (até 60 letras).",
  },
  {
    id: "message-template-groups/:id",
    caminho: "message-template-groups/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "message-template-groups",
    resumo: "PATCH renomeia o grupo. Corpo: { name } (até 60 letras).",
  },
  {
    id: "message-template-groups/:id/ordem",
    caminho: "message-template-groups/[id]/ordem",
    metodos: ["PUT"],
    parametros: ["id"],
    area: "message-template-groups",
    resumo: "PUT reordena os grupos: põe este logo depois de outro. Corpo: { depois_de } com o id do grupo da esquerda, ou null para a primeira posição.",
  },
  {
    id: "message-templates",
    caminho: "message-templates",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "message-templates",
    resumo: "GET lista as respostas rápidas (modelos de mensagem) pessoais e compartilhadas; POST cria uma. Compartilhada exige gerente.",
  },
  {
    id: "message-templates/:id",
    caminho: "message-templates/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "message-templates",
    resumo: "PATCH altera uma resposta rápida: título, texto, atalho, áudio e imagens. Não envia mensagem a ninguém.",
  },
  {
    id: "message-templates/:id/midias",
    caminho: "message-templates/[id]/midias",
    metodos: ["POST"],
    parametros: ["id"],
    area: "message-templates",
    resumo: "POST /api/v1/message-templates/:id/midias — sobe UMA mídia (multipart `file`): uma imagem (#2526) ou o áudio de um recurso (#2833), e a LIGA ao template.",
  },
  {
    id: "message-templates/:id/midias/:indice",
    caminho: "message-templates/[id]/midias/[indice]",
    metodos: ["GET"],
    parametros: ["id", "indice"],
    area: "message-templates",
    resumo: "GET /api/v1/message-templates/:id/midias/:indice — devolve OS BYTES de uma imagem do template (#2526).",
  },
  {
    id: "message-templates/:id/ordem",
    caminho: "message-templates/[id]/ordem",
    metodos: ["PUT"],
    parametros: ["id"],
    area: "message-templates",
    resumo: "PUT reordena as respostas rápidas: põe esta logo depois de outra (depois_de) ou na primeira posição.",
  },
  {
    id: "messages",
    caminho: "messages",
    metodos: ["POST"],
    parametros: [],
    area: "messages",
    resumo: "POST envia mensagem de WhatsApp a um cliente numa conversa (efeito fora do sistema).",
  },
  {
    id: "messages/:id",
    caminho: "messages/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "messages",
    resumo: "PATCH edita o texto de uma mensagem já enviada pelo atendente (efeito no WhatsApp do cliente). Atendente ou acima.",
  },
  {
    id: "messages/:id/forward",
    caminho: "messages/[id]/forward",
    metodos: ["POST"],
    parametros: ["id"],
    area: "messages",
    resumo: "POST encaminha uma mensagem para outra conversa da empresa (envia ao outro cliente). Atendente ou acima.",
  },
  {
    id: "messages/:id/hide",
    caminho: "messages/[id]/hide",
    metodos: ["POST", "DELETE"],
    parametros: ["id"],
    area: "messages",
    resumo: "POST oculta uma mensagem recebida só no CRM, sem apagar no WhatsApp do cliente. Gerente ou acima.",
  },
  {
    id: "messages/:id/retry",
    caminho: "messages/[id]/retry",
    metodos: ["POST"],
    parametros: ["id"],
    area: "messages",
    resumo: "POST reenvia a mensagem que falhou, na mesma linha da conversa (envia ao cliente de novo). Atendente ou acima.",
  },
  {
    id: "metrics/atrito",
    caminho: "metrics/atrito",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "metrics",
    resumo: "GET mostra o Índice de Atrito (quanto atrito há para cliente e equipe); PATCH ajusta a configuração dessa métrica.",
  },
  {
    id: "metrics/attendants",
    caminho: "metrics/attendants",
    metodos: ["GET"],
    parametros: [],
    area: "metrics",
    resumo: "GET /api/v1/metrics/attendants — métricas por responsável (spec 13 §6).",
  },
  {
    id: "metrics/channels",
    caminho: "metrics/channels",
    metodos: ["GET"],
    parametros: [],
    area: "metrics",
    resumo: "GET /api/v1/metrics/channels — o RELATÓRIO POR CANAL (issue #2390).",
  },
  {
    id: "metrics/funil",
    caminho: "metrics/funil",
    metodos: ["GET"],
    parametros: [],
    area: "metrics",
    resumo: "GET /api/v1/metrics/funil — análise do funil (issue #1750).",
  },
  {
    id: "metrics/lost",
    caminho: "metrics/lost",
    metodos: ["GET"],
    parametros: [],
    area: "metrics",
    resumo: "GET /api/v1/metrics/lost — relatório \"Perdas\" (issue #1537).",
  },
  {
    id: "metrics/metas",
    caminho: "metrics/metas",
    metodos: ["GET"],
    parametros: [],
    area: "metrics",
    resumo: "GET /api/v1/metrics/metas — a meta do mês e o progresso contra ela (issue #3025, fatia 1).",
  },
  {
    id: "metrics/serie",
    caminho: "metrics/serie",
    metodos: ["GET"],
    parametros: [],
    area: "metrics",
    resumo: "GET /api/v1/metrics/serie — a evolução dos ganhos no tempo (issue #3024, fatia 1).",
  },
  {
    id: "modulos",
    caminho: "modulos",
    metodos: ["GET"],
    parametros: [],
    area: "modulos",
    resumo: "Catálogo de módulos instaláveis + o que já está instalado nesta instância (ADR-0002, D3).",
  },
  {
    id: "modulos/:modulo/:objeto",
    caminho: "modulos/[modulo]/[objeto]",
    metodos: ["GET"],
    parametros: ["modulo", "objeto"],
    area: "modulos",
    resumo: "GET /api/v1/modulos/{modulo}/{objeto} — as fichas que um módulo de dados guarda.",
  },
  {
    id: "modulos/instalar",
    caminho: "modulos/instalar",
    metodos: ["POST"],
    parametros: [],
    area: "modulos",
    resumo: "Instala um módulo NA INSTÂNCIA (ADR-0002, D3) — administrador da instalação, nunca por organização.",
  },
  {
    id: "notifications/push",
    caminho: "notifications/push",
    metodos: ["GET", "PUT", "DELETE"],
    parametros: [],
    area: "notifications",
    resumo: "GET — chave VAPID pública (ou enabled=false se o operador não configurou) e a opção da empresa para a tela bloqueada, que a bandeja do app aberto aplica.",
  },
  {
    id: "people",
    caminho: "people",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "people",
    resumo: "GET lista as pessoas cadastradas; POST cadastra uma pessoa nova. Cadastrar exige gerente ou acima.",
  },
  {
    id: "people/:id",
    caminho: "people/[id]",
    metodos: ["GET", "PATCH"],
    parametros: ["id"],
    area: "people",
    resumo: "GET mostra uma pessoa; PATCH altera os dados dela. Atendente ou acima.",
  },
  {
    id: "phone-numbers",
    caminho: "phone-numbers",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "phone-numbers",
    resumo: "GET lista; POST cadastra um telefone/número de voz (DID) da empresa. Gerente ou acima.",
  },
  {
    id: "phone-numbers/:id",
    caminho: "phone-numbers/[id]",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "phone-numbers",
    resumo: "PATCH altera um telefone de voz já cadastrado (o número em si e a infra de voz não mudam). Gerente ou acima.",
  },
  {
    id: "pipelines",
    caminho: "pipelines",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "pipelines",
    resumo: "GET lista os funis (nome e identificador); POST cria um funil já com as etapas iniciais. Criar exige gerente ou acima.",
  },
  {
    id: "pipelines/:id",
    caminho: "pipelines/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "pipelines",
    resumo: "PATCH altera o funil: nome, descrição, funil padrão, ordem e arquivar. Gerente ou acima.",
  },
  {
    id: "pipelines/:id/agent-mapping",
    caminho: "pipelines/[id]/agent-mapping",
    metodos: ["GET", "PUT"],
    parametros: ["id"],
    area: "pipelines",
    resumo: "GET mostra; PUT define qual etapa do funil o agente de IA move em cada situação (dica de etapa). Gerente ou acima.",
  },
  {
    id: "pipelines/:id/board",
    caminho: "pipelines/[id]/board",
    metodos: ["GET"],
    parametros: ["id"],
    area: "pipelines",
    resumo: "GET mostra o quadro do funil (kanban): etapas em ordem e negócios abertos, com agente e pontuação.",
  },
  {
    id: "pipelines/:id/config",
    caminho: "pipelines/[id]/config",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "pipelines",
    resumo: "PATCH configura o funil: campos personalizados, motivos de ganho e de perda, vocabulário e entrada do Inbox. Gerente ou acima.",
  },
  {
    id: "pipelines/:id/forecast",
    caminho: "pipelines/[id]/forecast",
    metodos: ["GET"],
    parametros: ["id"],
    area: "pipelines",
    resumo: "GET /api/v1/pipelines/[id]/forecast — previsão ponderada de UM funil (issue #1535).",
  },
  {
    id: "pipelines/:id/leads",
    caminho: "pipelines/[id]/leads",
    metodos: ["GET"],
    parametros: ["id"],
    area: "pipelines",
    resumo: "GET mostra uma página da lista de negócios do funil (page, per_page), com total e se há próxima página.",
  },
  {
    id: "pipelines/:id/stages",
    caminho: "pipelines/[id]/stages",
    metodos: ["GET", "POST"],
    parametros: ["id"],
    area: "pipelines",
    resumo: "GET lista as etapas do funil; POST cria uma etapa nova no fim do funil. Criar exige gerente ou acima.",
  },
  {
    id: "pipelines/:id/stages/:stageId",
    caminho: "pipelines/[id]/stages/[stageId]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id", "stageId"],
    area: "pipelines",
    resumo: "PATCH altera uma etapa do funil: nome, marcar ganho ou perdido, ordem, probabilidade e prazo. Gerente ou acima.",
  },
  {
    id: "pipelines/:id/stages/win-rates",
    caminho: "pipelines/[id]/stages/win-rates",
    metodos: ["GET"],
    parametros: ["id"],
    area: "pipelines",
    resumo: "GET /api/v1/pipelines/[id]/stages/win-rates — a taxa histórica de ganho de CADA etapa, com a amostra junto (issue #1753).",
  },
  {
    id: "pipelines/default",
    caminho: "pipelines/default",
    metodos: ["GET"],
    parametros: [],
    area: "pipelines",
    resumo: "GET mostra o funil padrão da empresa, com as etapas. Atendente ou acima.",
  },
  {
    id: "products",
    caminho: "products",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "products",
    resumo: "GET lista o catálogo de produtos e serviços (aceita busca); POST cadastra um produto ou serviço. Cadastrar exige gerente ou acima.",
  },
  {
    id: "products/:id",
    caminho: "products/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "products",
    resumo: "PATCH altera um produto ou serviço do catálogo (nome, preço etc.). Preço só muda com gerente ou acima.",
  },
  {
    id: "products/:id/fotos",
    caminho: "products/[id]/fotos",
    metodos: ["POST", "PUT"],
    parametros: ["id"],
    area: "products",
    resumo: "POST /api/v1/products/:id/fotos — sobe UMA foto (multipart `file`) e a põe no fim.",
  },
  {
    id: "products/import",
    caminho: "products/import",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "products",
    resumo: "POST /api/v1/products/import — o catálogo a partir da planilha que a loja já tem.",
  },
  {
    id: "proposals",
    caminho: "proposals",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "proposals",
    resumo: "GET lista as propostas comerciais; POST cria uma proposta em rascunho (o número só nasce no envio). Atendente ou acima para criar.",
  },
  {
    id: "proposals/:id",
    caminho: "proposals/[id]",
    metodos: ["GET", "PATCH", "DELETE"],
    parametros: ["id"],
    area: "proposals",
    resumo: "GET mostra a proposta; PATCH altera o rascunho (título, condições, itens). Atendente ou acima.",
  },
  {
    id: "proposals/:id/assistant",
    caminho: "proposals/[id]/assistant",
    metodos: ["POST"],
    parametros: ["id"],
    area: "proposals",
    resumo: "cria ou executa: propostas › assistant.",
  },
  {
    id: "proposals/:id/assistant/apply",
    caminho: "proposals/[id]/assistant/apply",
    metodos: ["POST"],
    parametros: ["id"],
    area: "proposals",
    resumo: "cria ou executa: propostas › assistant › apply.",
  },
  {
    id: "proposals/:id/assistant/disponibilidade",
    caminho: "proposals/[id]/assistant/disponibilidade",
    metodos: ["GET"],
    parametros: ["id"],
    area: "proposals",
    resumo: "GET .../assistant/disponibilidade — N5.",
  },
  {
    id: "proposals/:id/decide",
    caminho: "proposals/[id]/decide",
    metodos: ["POST"],
    parametros: ["id"],
    area: "proposals",
    resumo: "POST registra a decisão do cliente sobre a proposta: aceita ou recusada (com motivo opcional).",
  },
  {
    id: "proposals/:id/documento",
    caminho: "proposals/[id]/documento",
    metodos: ["GET", "PATCH"],
    parametros: ["id"],
    area: "proposals",
    resumo: "GET mostra; PATCH altera o documento da proposta: textos das seções e valores dos campos.",
  },
  {
    id: "proposals/:id/modelo",
    caminho: "proposals/[id]/modelo",
    metodos: ["PATCH"],
    parametros: ["id"],
    area: "proposals",
    resumo: "PATCH troca o modelo da proposta (template_slug), podendo descartar as seções já reescritas. Gerente ou acima.",
  },
  {
    id: "proposals/:id/preencher-com-conversa",
    caminho: "proposals/[id]/preencher-com-conversa",
    metodos: ["POST"],
    parametros: ["id"],
    area: "proposals",
    resumo: "POST preenche a proposta com o que foi dito na conversa do cliente. Gerente ou acima.",
  },
  {
    id: "proposals/:id/previa",
    caminho: "proposals/[id]/previa",
    metodos: ["GET"],
    parametros: ["id"],
    area: "proposals",
    resumo: "\"VER COMO O CLIENTE RECEBE\" — o PDF que o envio faria AGORA, sem enviar.",
  },
  {
    id: "proposals/:id/revise",
    caminho: "proposals/[id]/revise",
    metodos: ["POST"],
    parametros: ["id"],
    area: "proposals",
    resumo: "POST cria a revisão (v2) em rascunho de uma proposta já enviada; a original continua enviada até a nova ser enviada. Gerente.",
  },
  {
    id: "proposals/:id/send",
    caminho: "proposals/[id]/send",
    metodos: ["POST"],
    parametros: ["id"],
    area: "proposals",
    resumo: "N2 — traduz o código de recusa do agendamento em frase legível para a timeline (`proposal_followup_skipped`).",
  },
  {
    id: "prospecting",
    caminho: "prospecting",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "prospecting",
    resumo: "GET lista as empresas candidatas da prospecção; POST age na campanha. O assistente só ajusta ritmo, pausa e seleção; não inicia nem envia.",
  },
  {
    id: "prospecting/agents",
    caminho: "prospecting/agents",
    metodos: ["POST"],
    parametros: [],
    area: "prospecting",
    resumo: "cria ou executa: prospecting › agentes de IA.",
  },
  {
    id: "prospecting/agents/chat",
    caminho: "prospecting/agents/chat",
    metodos: ["POST"],
    parametros: [],
    area: "prospecting",
    resumo: "cria ou executa: prospecting › agentes de IA › chat.",
  },
  {
    id: "prospecting/agents/prepare",
    caminho: "prospecting/agents/prepare",
    metodos: ["POST"],
    parametros: [],
    area: "prospecting",
    resumo: "Save a paused canonical version for the existing test endpoint.",
  },
  {
    id: "prospecting/agents/session",
    caminho: "prospecting/agents/session",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "prospecting",
    resumo: "consulta / altera: prospecting › agentes de IA › session.",
  },
  {
    id: "prospecting/importar",
    caminho: "prospecting/importar",
    metodos: ["POST"],
    parametros: [],
    area: "prospecting",
    resumo: "Quantas recusadas voltam na resposta; o total vai à parte.",
  },
  {
    id: "rastreio/:id",
    caminho: "rastreio/[id]",
    metodos: ["GET"],
    parametros: ["id"],
    area: "rastreio",
    resumo: "consulta: rastreio.",
  },
  {
    id: "reports/activities",
    caminho: "reports/activities",
    metodos: ["GET"],
    parametros: [],
    area: "reports",
    resumo: "GET /api/v1/reports/activities — o que aconteceu na operação num período.",
  },
  {
    id: "reports/financeiro",
    caminho: "reports/financeiro",
    metodos: ["GET"],
    parametros: [],
    area: "reports",
    resumo: "O relatório do faturamento.",
  },
  {
    id: "reports/tags",
    caminho: "reports/tags",
    metodos: ["GET"],
    parametros: [],
    area: "reports",
    resumo: "GET /api/v1/reports/tags — o RELATÓRIO POR ETIQUETA (fatia F1 da #1833): qual assunto ocupou a operação neste período, e quanto tempo ele esperou.",
  },
  {
    id: "settings/agenda-apresentacao",
    caminho: "settings/agenda-apresentacao",
    metodos: ["PATCH"],
    parametros: [],
    area: "settings",
    resumo: "PATCH ajusta o título que aparece na apresentação da agenda (único campo permitido). Gerente ou acima.",
  },
  {
    id: "settings/art15",
    caminho: "settings/art15",
    metodos: ["PATCH"],
    parametros: [],
    area: "settings",
    resumo: "PATCH ajusta o texto do relatório de pedido de dados da LGPD (art. 15) impresso em nome da empresa. Só administrador.",
  },
  {
    id: "settings/assinatura",
    caminho: "settings/assinatura",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "settings",
    resumo: "GET mostra; PATCH altera a assinatura que acompanha as mensagens enviadas. Gerente ou acima.",
  },
  {
    id: "settings/campanhas",
    caminho: "settings/campanhas",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "settings",
    resumo: "GET mostra; PATCH altera as regras gerais de campanha da empresa (padrões). Gerente ou acima.",
  },
  {
    id: "settings/proposal-templates",
    caminho: "settings/proposal-templates",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "settings",
    resumo: "GET lista; POST cria um modelo de proposta comercial, novo ou personalizado a partir de um modelo base.",
  },
  {
    id: "settings/proposal-templates/:slug",
    caminho: "settings/proposal-templates/[slug]",
    metodos: ["GET", "PATCH", "DELETE"],
    parametros: ["slug"],
    area: "settings",
    resumo: "GET mostra; PATCH altera um modelo de proposta comercial (nome, descrição, seções e ordem).",
  },
  {
    id: "settings/proposal-templates/importar",
    caminho: "settings/proposal-templates/importar",
    metodos: ["POST"],
    parametros: [],
    area: "settings",
    resumo: "cria ou executa: configurações › proposal templates › importar.",
  },
  {
    id: "settings/proposals",
    caminho: "settings/proposals",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "settings",
    resumo: "GET mostra; PATCH altera as configurações de propostas: módulo ligado, validade padrão em dias, condições padrão e follow-up.",
  },
  {
    id: "settings/prospeccao",
    caminho: "settings/prospeccao",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "settings",
    resumo: "GET mostra; PATCH altera a personalização da prospecção (voz e vocabulário), preservando o resto. Gerente ou acima.",
  },
  {
    id: "settings/routing",
    caminho: "settings/routing",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "settings",
    resumo: "GET /api/v1/settings/routing — lê a config de ATENDIMENTO (manager+): `organizations.settings.routing` + `settings.visibility_mode`.",
  },
  {
    id: "settings/routing/channels",
    caminho: "settings/routing/channels",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "settings",
    resumo: "consulta / altera: configurações › routing › channels.",
  },
  {
    id: "settings/sons",
    caminho: "settings/sons",
    metodos: ["GET", "POST", "DELETE"],
    parametros: [],
    area: "settings",
    resumo: "/api/v1/settings/sons — os sons dos avisos da Central (a etapa que avisa e o pedido de pessoa), escolhidos pela organização.",
  },
  {
    id: "settings/task-plans",
    caminho: "settings/task-plans",
    metodos: ["GET", "PATCH"],
    parametros: [],
    area: "settings",
    resumo: "GET mostra; PATCH altera os planos de tarefa da empresa. Gerente ou acima.",
  },
  {
    id: "tags/cores",
    caminho: "tags/cores",
    metodos: ["GET"],
    parametros: [],
    area: "tags",
    resumo: "GET /api/v1/tags/cores — as cores das etiquetas da organização ativa (issue #1271, fatia S6 da #852).",
  },
  {
    id: "tags/vocabulario",
    caminho: "tags/vocabulario",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "tags",
    resumo: "GET lista as etiquetas da empresa; POST altera a lista (criar, renomear, unir). Mexe nas etiquetas de todos, até nas regras dos agentes. Gerente.",
  },
  {
    id: "tasks",
    caminho: "tasks",
    metodos: ["GET", "POST"],
    parametros: [],
    area: "tasks",
    resumo: "GET lista as tarefas em ordem de prazo; POST cria uma tarefa (título, prazo, prioridade, cliente ou negócio, responsável).",
  },
  {
    id: "tasks/:id",
    caminho: "tasks/[id]",
    metodos: ["PATCH", "DELETE"],
    parametros: ["id"],
    area: "tasks",
    resumo: "PATCH edita uma tarefa: título, prazo, prioridade, situação (concluir), responsável. Atendente ou acima.",
  },
  {
    id: "team",
    caminho: "team",
    metodos: ["GET"],
    parametros: [],
    area: "team",
    resumo: "GET lista os membros da equipe da empresa (e-mail, nome, papel, último acesso). Gerente ou acima.",
  },
  {
    id: "team/:user_id",
    caminho: "team/[user_id]",
    metodos: ["PATCH"],
    parametros: ["user_id"],
    area: "team",
    resumo: "PATCH /api/v1/team/[user_id] — change a member's role (canonical, G2-02).",
  },
  {
    id: "team/:user_id/interface",
    caminho: "team/[user_id]/interface",
    metodos: ["PATCH"],
    parametros: ["user_id"],
    area: "team",
    resumo: "altera: equipe › interface.",
  },
  {
    id: "team/:user_id/reactivate",
    caminho: "team/[user_id]/reactivate",
    metodos: ["POST"],
    parametros: ["user_id"],
    area: "team",
    resumo: "POST /api/v1/team/[user_id]/reactivate — devolve o acesso de um membro revogado.",
  },
  {
    id: "team/:user_id/revoke",
    caminho: "team/[user_id]/revoke",
    metodos: ["POST"],
    parametros: ["user_id"],
    area: "team",
    resumo: "POST /api/v1/team/[user_id]/revoke — revoke a member.",
  },
  {
    id: "team/:user_id/role",
    caminho: "team/[user_id]/role",
    metodos: ["PATCH"],
    parametros: ["user_id"],
    area: "team",
    resumo: "PATCH /api/v1/team/[user_id]/role — alias for the canonical PATCH /api/v1/team/[user_id] (kept for EPIC-09 callers; logic in ../_shared.ts).",
  },
  {
    id: "team/assignable",
    caminho: "team/assignable",
    metodos: ["GET"],
    parametros: [],
    area: "team",
    resumo: "GET /api/v1/team/assignable — destinos válidos de transferência de conversa (G3-01, ReassignDialog): membros ativos agent+ da org ativa.",
  },
  {
    id: "team/invite",
    caminho: "team/invite",
    metodos: ["POST"],
    parametros: [],
    area: "team",
    resumo: "POST /api/v1/team/invite — bulk-invite up to 20 emails.",
  },
  {
    id: "team/invites/:id/resend",
    caminho: "team/invites/[id]/resend",
    metodos: ["POST"],
    parametros: ["id"],
    area: "team",
    resumo: "POST /api/v1/team/invites/[id]/resend — reenvia um convite pendente.",
  },
  {
    id: "team/invites/:id/revoke",
    caminho: "team/invites/[id]/revoke",
    metodos: ["POST"],
    parametros: ["id"],
    area: "team",
    resumo: "POST /api/v1/team/invites/[id]/revoke — cancela um convite pendente.",
  },
  {
    id: "voice/calls",
    caminho: "voice/calls",
    metodos: ["POST"],
    parametros: [],
    area: "voice",
    resumo: "POST /api/v1/voice/calls — inicia chamada de voz outbound (§5.1 da spec).",
  },
  {
    id: "voice/calls/:id",
    caminho: "voice/calls/[id]",
    metodos: ["DELETE"],
    parametros: ["id"],
    area: "voice",
    resumo: "DELETE /api/v1/voice/calls/[id] — encerra uma chamada ativa (§5.3).",
  },
  {
    id: "voice/calls/:id/accept",
    caminho: "voice/calls/[id]/accept",
    metodos: ["POST"],
    parametros: ["id"],
    area: "voice",
    resumo: "POST /api/v1/voice/calls/[id]/accept — atende uma chamada recebida (§5.2).",
  },
  {
    id: "voice/calls/:id/reject",
    caminho: "voice/calls/[id]/reject",
    metodos: ["POST"],
    parametros: ["id"],
    area: "voice",
    resumo: "POST /api/v1/voice/calls/[id]/reject — recusa uma chamada recebida (§5.2).",
  },
  {
    id: "voice/calls/:id/webrtc",
    caminho: "voice/calls/[id]/webrtc",
    metodos: ["POST"],
    parametros: ["id"],
    area: "voice",
    resumo: "POST /api/v1/voice/calls/[id]/webrtc — relay puro do SDP entre o navegador e o WaCalls (§4.1 da spec).",
  },
  {
    id: "voice/calls/history",
    caminho: "voice/calls/history",
    metodos: ["GET"],
    parametros: [],
    area: "voice",
    resumo: "GET /api/v1/voice/calls/history — histórico de chamadas da organização.",
  },
  {
    id: "voice/events",
    caminho: "voice/events",
    metodos: ["GET"],
    parametros: [],
    area: "voice",
    resumo: "GET /api/v1/voice/events — relay SSE do pareamento de chamada de voz pro navegador (spec §4.2/§5.1).",
  },
  {
    id: "voice/opt-in",
    caminho: "voice/opt-in",
    metodos: ["GET", "PUT"],
    parametros: [],
    area: "voice",
    resumo: "GET/PUT /api/v1/voice/opt-in — a chamada de voz desta organização está ligada? ═══ O QUE ESTA ROTA LIGA, E POR QUE ELA EXISTE ═══ A chamada de voz (spec 18) vincula um SEGUNDO APARELHO ao mesmo número de WhatsApp que já atende, por um camin",
  },
  {
    id: "voice/sessions",
    caminho: "voice/sessions",
    metodos: ["DELETE"],
    parametros: [],
    area: "voice",
    resumo: "DELETE /api/v1/voice/sessions — desconecta a chamada de voz desta organização.",
  },
  {
    id: "voice/sessions/pair",
    caminho: "voice/sessions/pair",
    metodos: ["POST"],
    parametros: [],
    area: "voice",
    resumo: "POST /api/v1/voice/sessions/pair — inicia (ou reinicia) o pareamento de chamada de voz WhatsApp da organização.",
  },
  {
    id: "voice/sessions/status",
    caminho: "voice/sessions/status",
    metodos: ["GET"],
    parametros: [],
    area: "voice",
    resumo: "GET /api/v1/voice/sessions/status — estado do pareamento de chamada de voz da organização ativa.",
  },
  {
    id: "voip/trunk",
    caminho: "voip/trunk",
    metodos: ["GET", "PUT"],
    parametros: [],
    area: "voip",
    resumo: "GET /api/v1/voip/trunk — configuração do trunk SIP da org ativa (manager+), via view segura (nunca expõe a senha cifrada).",
  },
] as const;

// Carregadores de leitura permitida (GET e nao proibido).
// O bundler nao aceita import com caminho variavel, entao cada um e um
// import() de caminho literal, no padrao de proposta-comum.ts.
export const CARREGADORES: Record<string, () => Promise<Record<string, unknown>>> = {
  "ads/meta/accounts": async () => {
    const mod = await import("@/app/api/v1/ads/meta/accounts/route");
    return { GET: mod.GET };
  },
  "ads/meta/campaigns": async () => {
    const mod = await import("@/app/api/v1/ads/meta/campaigns/route");
    return { GET: mod.GET };
  },
  "agenda/agendamentos": async () => {
    const mod = await import("@/app/api/v1/agenda/agendamentos/route");
    return { GET: mod.GET };
  },
  "agenda/agendamentos/:id": async () => {
    const mod = await import("@/app/api/v1/agenda/agendamentos/[id]/route");
    return { GET: mod.GET };
  },
  "agenda/aviso": async () => {
    const mod = await import("@/app/api/v1/agenda/aviso/route");
    return { GET: mod.GET };
  },
  "agenda/configuracao": async () => {
    const mod = await import("@/app/api/v1/agenda/configuracao/route");
    return { GET: mod.GET };
  },
  "agenda/enderecos": async () => {
    const mod = await import("@/app/api/v1/agenda/enderecos/route");
    return { GET: mod.GET };
  },
  "agenda/excecoes": async () => {
    const mod = await import("@/app/api/v1/agenda/excecoes/route");
    return { GET: mod.GET };
  },
  "agenda/google/calendarios": async () => {
    const mod = await import("@/app/api/v1/agenda/google/calendarios/route");
    return { GET: mod.GET };
  },
  "agenda/horarios-livres": async () => {
    const mod = await import("@/app/api/v1/agenda/horarios-livres/route");
    return { GET: mod.GET };
  },
  "agenda/pessoas": async () => {
    const mod = await import("@/app/api/v1/agenda/pessoas/route");
    return { GET: mod.GET };
  },
  "agenda/servicos": async () => {
    const mod = await import("@/app/api/v1/agenda/servicos/route");
    return { GET: mod.GET };
  },
  "agenda/tipos": async () => {
    const mod = await import("@/app/api/v1/agenda/tipos/route");
    return { GET: mod.GET };
  },
  "agenda/vinculos": async () => {
    const mod = await import("@/app/api/v1/agenda/vinculos/route");
    return { GET: mod.GET };
  },
  "ai/agents": async () => {
    const mod = await import("@/app/api/v1/ai/agents/route");
    return { GET: mod.GET };
  },
  "ai/agents/:id": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/route");
    return { GET: mod.GET };
  },
  "ai/agents/:id/proposals": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/proposals/route");
    return { GET: mod.GET };
  },
  "ai/agents/:id/runs": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/runs/route");
    return { GET: mod.GET };
  },
  "ai/agents/:id/tool-usage": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/tool-usage/route");
    return { GET: mod.GET };
  },
  "ai/agents/:id/versions": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/versions/route");
    return { GET: mod.GET };
  },
  "ai/agents/:id/versions/:vid": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/versions/[vid]/route");
    return { GET: mod.GET };
  },
  "ai/agents/assignable": async () => {
    const mod = await import("@/app/api/v1/ai/agents/assignable/route");
    return { GET: mod.GET };
  },
  "ai/assistente/auditoria": async () => {
    const mod = await import("@/app/api/v1/ai/assistente/auditoria/route");
    return { GET: mod.GET };
  },
  "ai/assistente/progresso": async () => {
    const mod = await import("@/app/api/v1/ai/assistente/progresso/route");
    return { GET: mod.GET };
  },
  "ai/assistente/propostas": async () => {
    const mod = await import("@/app/api/v1/ai/assistente/propostas/route");
    return { GET: mod.GET };
  },
  "ai/assistente/threads": async () => {
    const mod = await import("@/app/api/v1/ai/assistente/threads/route");
    return { GET: mod.GET };
  },
  "ai/assistente/threads/:id/messages": async () => {
    const mod = await import("@/app/api/v1/ai/assistente/threads/[id]/messages/route");
    return { GET: mod.GET };
  },
  "ai/automatico-ativo": async () => {
    const mod = await import("@/app/api/v1/ai/automatico-ativo/route");
    return { GET: mod.GET };
  },
  "ai/budget": async () => {
    const mod = await import("@/app/api/v1/ai/budget/route");
    return { GET: mod.GET };
  },
  "ai/cases": async () => {
    const mod = await import("@/app/api/v1/ai/cases/route");
    return { GET: mod.GET };
  },
  "ai/cases/:id": async () => {
    const mod = await import("@/app/api/v1/ai/cases/[id]/route");
    return { GET: mod.GET };
  },
  "ai/cases/:id/chat": async () => {
    const mod = await import("@/app/api/v1/ai/cases/[id]/chat/route");
    return { GET: mod.GET };
  },
  "ai/cases/alerta": async () => {
    const mod = await import("@/app/api/v1/ai/cases/alerta/route");
    return { GET: mod.GET };
  },
  "ai/evolution": async () => {
    const mod = await import("@/app/api/v1/ai/evolution/route");
    return { GET: mod.GET };
  },
  "ai/followup-flows": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/route");
    return { GET: mod.GET };
  },
  "ai/followup-flows/:id": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/[id]/route");
    return { GET: mod.GET };
  },
  "ai/followup-flows/:id/export": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/[id]/export/route");
    return { GET: mod.GET };
  },
  "ai/followup-flows/modelos-aprovados": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/modelos-aprovados/route");
    return { GET: mod.GET };
  },
  "ai/followups/enrollments": async () => {
    const mod = await import("@/app/api/v1/ai/followups/enrollments/route");
    return { GET: mod.GET };
  },
  "ai/followups/enrollments/:id": async () => {
    const mod = await import("@/app/api/v1/ai/followups/enrollments/[id]/route");
    return { GET: mod.GET };
  },
  "ai/followups/queue": async () => {
    const mod = await import("@/app/api/v1/ai/followups/queue/route");
    return { GET: mod.GET };
  },
  "ai/guardrail-layers": async () => {
    const mod = await import("@/app/api/v1/ai/guardrail-layers/route");
    return { GET: mod.GET };
  },
  "ai/inbox": async () => {
    const mod = await import("@/app/api/v1/ai/inbox/route");
    return { GET: mod.GET };
  },
  "ai/jev": async () => {
    const mod = await import("@/app/api/v1/ai/jev/route");
    return { GET: mod.GET };
  },
  "ai/knowledge/chave": async () => {
    const mod = await import("@/app/api/v1/ai/knowledge/chave/route");
    return { GET: mod.GET };
  },
  "ai/knowledge/sources": async () => {
    const mod = await import("@/app/api/v1/ai/knowledge/sources/route");
    return { GET: mod.GET };
  },
  "ai/knowledge/sources/:id": async () => {
    const mod = await import("@/app/api/v1/ai/knowledge/sources/[id]/route");
    return { GET: mod.GET };
  },
  "ai/knowledge/sources/:id/conteudo": async () => {
    const mod = await import("@/app/api/v1/ai/knowledge/sources/[id]/conteudo/route");
    return { GET: mod.GET };
  },
  "ai/knowledge/sources/:id/trechos": async () => {
    const mod = await import("@/app/api/v1/ai/knowledge/sources/[id]/trechos/route");
    return { GET: mod.GET };
  },
  "ai/mapas": async () => {
    const mod = await import("@/app/api/v1/ai/mapas/route");
    return { GET: mod.GET };
  },
  "ai/memory": async () => {
    const mod = await import("@/app/api/v1/ai/memory/route");
    return { GET: mod.GET };
  },
  "ai/memory/versions/:id": async () => {
    const mod = await import("@/app/api/v1/ai/memory/versions/[id]/route");
    return { GET: mod.GET };
  },
  "ai/operator-metrics": async () => {
    const mod = await import("@/app/api/v1/ai/operator-metrics/route");
    return { GET: mod.GET };
  },
  "ai/pacing": async () => {
    const mod = await import("@/app/api/v1/ai/pacing/route");
    return { GET: mod.GET };
  },
  "ai/providers": async () => {
    const mod = await import("@/app/api/v1/ai/providers/route");
    return { GET: mod.GET };
  },
  "ai/providers/:provider/models": async () => {
    const mod = await import("@/app/api/v1/ai/providers/[provider]/models/route");
    return { GET: mod.GET };
  },
  "ai/routers": async () => {
    const mod = await import("@/app/api/v1/ai/routers/route");
    return { GET: mod.GET };
  },
  "ai/routers/:id": async () => {
    const mod = await import("@/app/api/v1/ai/routers/[id]/route");
    return { GET: mod.GET };
  },
  "ai/routing-results": async () => {
    const mod = await import("@/app/api/v1/ai/routing-results/route");
    return { GET: mod.GET };
  },
  "ai/runs": async () => {
    const mod = await import("@/app/api/v1/ai/runs/route");
    return { GET: mod.GET };
  },
  "ai/skills": async () => {
    const mod = await import("@/app/api/v1/ai/skills/route");
    return { GET: mod.GET };
  },
  "ai/skills/:name": async () => {
    const mod = await import("@/app/api/v1/ai/skills/[name]/route");
    return { GET: mod.GET };
  },
  "ai/skills/:name/versions": async () => {
    const mod = await import("@/app/api/v1/ai/skills/[name]/versions/route");
    return { GET: mod.GET };
  },
  "ai/style-adjustments": async () => {
    const mod = await import("@/app/api/v1/ai/style-adjustments/route");
    return { GET: mod.GET };
  },
  "ai/turn-traces": async () => {
    const mod = await import("@/app/api/v1/ai/turn-traces/route");
    return { GET: mod.GET };
  },
  "ai/usage": async () => {
    const mod = await import("@/app/api/v1/ai/usage/route");
    return { GET: mod.GET };
  },
  "anuncios/google/:org": async () => {
    const mod = await import("@/app/api/v1/anuncios/google/[org]/route");
    return { GET: mod.GET };
  },
  "anuncios/meta/:org": async () => {
    const mod = await import("@/app/api/v1/anuncios/meta/[org]/route");
    return { GET: mod.GET };
  },
  "attendants/availability": async () => {
    const mod = await import("@/app/api/v1/attendants/availability/route");
    return { GET: mod.GET };
  },
  "attendants/sectors": async () => {
    const mod = await import("@/app/api/v1/attendants/sectors/route");
    return { GET: mod.GET };
  },
  "audit": async () => {
    const mod = await import("@/app/api/v1/audit/route");
    return { GET: mod.GET };
  },
  "audit/export": async () => {
    const mod = await import("@/app/api/v1/audit/export/route");
    return { GET: mod.GET };
  },
  "automation-rules": async () => {
    const mod = await import("@/app/api/v1/automation-rules/route");
    return { GET: mod.GET };
  },
  "automation-rules/:id/runs": async () => {
    const mod = await import("@/app/api/v1/automation-rules/[id]/runs/route");
    return { GET: mod.GET };
  },
  "automation-rules/runs": async () => {
    const mod = await import("@/app/api/v1/automation-rules/runs/route");
    return { GET: mod.GET };
  },
  "calls": async () => {
    const mod = await import("@/app/api/v1/calls/route");
    return { GET: mod.GET };
  },
  "campaign-suppressions": async () => {
    const mod = await import("@/app/api/v1/campaign-suppressions/route");
    return { GET: mod.GET };
  },
  "campaign-templates": async () => {
    const mod = await import("@/app/api/v1/campaign-templates/route");
    return { GET: mod.GET };
  },
  "campaigns": async () => {
    const mod = await import("@/app/api/v1/campaigns/route");
    return { GET: mod.GET };
  },
  "campaigns/:id": async () => {
    const mod = await import("@/app/api/v1/campaigns/[id]/route");
    return { GET: mod.GET };
  },
  "campaigns/:id/metrics": async () => {
    const mod = await import("@/app/api/v1/campaigns/[id]/metrics/route");
    return { GET: mod.GET };
  },
  "campaigns/:id/recipients": async () => {
    const mod = await import("@/app/api/v1/campaigns/[id]/recipients/route");
    return { GET: mod.GET };
  },
  "campaigns/modelos": async () => {
    const mod = await import("@/app/api/v1/campaigns/modelos/route");
    return { GET: mod.GET };
  },
  "channel-schedules": async () => {
    const mod = await import("@/app/api/v1/channel-schedules/route");
    return { GET: mod.GET };
  },
  "channel-sessions": async () => {
    const mod = await import("@/app/api/v1/channel-sessions/route");
    return { GET: mod.GET };
  },
  "channel-sessions/:id": async () => {
    const mod = await import("@/app/api/v1/channel-sessions/[id]/route");
    return { GET: mod.GET };
  },
  "channel-sessions/:id/acervo": async () => {
    const mod = await import("@/app/api/v1/channel-sessions/[id]/acervo/route");
    return { GET: mod.GET };
  },
  "channel-sessions/:id/ai-access": async () => {
    const mod = await import("@/app/api/v1/channel-sessions/[id]/ai-access/route");
    return { GET: mod.GET };
  },
  "channel-sessions/:id/disabled": async () => {
    const mod = await import("@/app/api/v1/channel-sessions/[id]/disabled/route");
    return { GET: mod.GET };
  },
  "channel-sessions/:id/groups": async () => {
    const mod = await import("@/app/api/v1/channel-sessions/[id]/groups/route");
    return { GET: mod.GET };
  },
  "channel-sessions/:id/historico": async () => {
    const mod = await import("@/app/api/v1/channel-sessions/[id]/historico/route");
    return { GET: mod.GET };
  },
  "channel-sessions/:id/qr": async () => {
    const mod = await import("@/app/api/v1/channel-sessions/[id]/qr/route");
    return { GET: mod.GET };
  },
  "channels/graph-partner": async () => {
    const mod = await import("@/app/api/v1/channels/graph-partner/route");
    return { GET: mod.GET };
  },
  "channels/graph-partner/templates": async () => {
    const mod = await import("@/app/api/v1/channels/graph-partner/templates/route");
    return { GET: mod.GET };
  },
  "channels/official": async () => {
    const mod = await import("@/app/api/v1/channels/official/route");
    return { GET: mod.GET };
  },
  "channels/partner": async () => {
    const mod = await import("@/app/api/v1/channels/partner/route");
    return { GET: mod.GET };
  },
  "channels/partner/templates": async () => {
    const mod = await import("@/app/api/v1/channels/partner/templates/route");
    return { GET: mod.GET };
  },
  "channels/social": async () => {
    const mod = await import("@/app/api/v1/channels/social/route");
    return { GET: mod.GET };
  },
  "channels/templates": async () => {
    const mod = await import("@/app/api/v1/channels/templates/route");
    return { GET: mod.GET };
  },
  "companies": async () => {
    const mod = await import("@/app/api/v1/companies/route");
    return { GET: mod.GET };
  },
  "companies/:id": async () => {
    const mod = await import("@/app/api/v1/companies/[id]/route");
    return { GET: mod.GET };
  },
  "companies/lookup": async () => {
    const mod = await import("@/app/api/v1/companies/lookup/route");
    return { GET: mod.GET };
  },
  "contact-tags": async () => {
    const mod = await import("@/app/api/v1/contact-tags/route");
    return { GET: mod.GET };
  },
  "contacts": async () => {
    const mod = await import("@/app/api/v1/contacts/route");
    return { GET: mod.GET };
  },
  "contacts/:id": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/route");
    return { GET: mod.GET };
  },
  "contacts/:id/carteira": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/carteira/route");
    return { GET: mod.GET };
  },
  "contacts/:id/compras": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/compras/route");
    return { GET: mod.GET };
  },
  "contacts/:id/crm-summary": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/crm-summary/route");
    return { GET: mod.GET };
  },
  "contacts/:id/hierarquia-do-anuncio": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/hierarquia-do-anuncio/route");
    return { GET: mod.GET };
  },
  "contacts/:id/proposals": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/proposals/route");
    return { GET: mod.GET };
  },
  "contacts/:id/roteiros": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/roteiros/route");
    return { GET: mod.GET };
  },
  "contacts/:id/timeline": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/timeline/route");
    return { GET: mod.GET };
  },
  "contacts/:id/vinculos": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/vinculos/route");
    return { GET: mod.GET };
  },
  "contacts/compare": async () => {
    const mod = await import("@/app/api/v1/contacts/compare/route");
    return { GET: mod.GET };
  },
  "contacts/duplicates": async () => {
    const mod = await import("@/app/api/v1/contacts/duplicates/route");
    return { GET: mod.GET };
  },
  "conversation-tags": async () => {
    const mod = await import("@/app/api/v1/conversation-tags/route");
    return { GET: mod.GET };
  },
  "conversations": async () => {
    const mod = await import("@/app/api/v1/conversations/route");
    return { GET: mod.GET };
  },
  "conversations/:id": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/route");
    return { GET: mod.GET };
  },
  "conversations/:id/aviso-de-mensagem": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/aviso-de-mensagem/route");
    return { GET: mod.GET };
  },
  "conversations/:id/draft-reply": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/draft-reply/route");
    return { GET: mod.GET };
  },
  "conversations/:id/export": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/export/route");
    return { GET: mod.GET };
  },
  "conversations/:id/messages": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/messages/route");
    return { GET: mod.GET };
  },
  "conversations/:id/notes": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/notes/route");
    return { GET: mod.GET };
  },
  "conversations/:id/participants": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/participants/route");
    return { GET: mod.GET };
  },
  "conversations/:id/passagens": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/passagens/route");
    return { GET: mod.GET };
  },
  "conversations/:id/retention": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/retention/route");
    return { GET: mod.GET };
  },
  "conversations/:id/transfer": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/transfer/route");
    return { GET: mod.GET };
  },
  "conversations/counts": async () => {
    const mod = await import("@/app/api/v1/conversations/counts/route");
    return { GET: mod.GET };
  },
  "external-db/connections": async () => {
    const mod = await import("@/app/api/v1/external-db/connections/route");
    return { GET: mod.GET };
  },
  "external-db/connections/:id": async () => {
    const mod = await import("@/app/api/v1/external-db/connections/[id]/route");
    return { GET: mod.GET };
  },
  "external-db/connections/:id/catalog": async () => {
    const mod = await import("@/app/api/v1/external-db/connections/[id]/catalog/route");
    return { GET: mod.GET };
  },
  "external-db/connections/:id/recipes": async () => {
    const mod = await import("@/app/api/v1/external-db/connections/[id]/recipes/route");
    return { GET: mod.GET };
  },
  "external-db/connections/:id/schemas": async () => {
    const mod = await import("@/app/api/v1/external-db/connections/[id]/schemas/route");
    return { GET: mod.GET };
  },
  "external-db/connections/:id/sources": async () => {
    const mod = await import("@/app/api/v1/external-db/connections/[id]/sources/route");
    return { GET: mod.GET };
  },
  "external-db/connections/:id/tables/:schema/:tabela": async () => {
    const mod = await import("@/app/api/v1/external-db/connections/[id]/tables/[schema]/[tabela]/route");
    return { GET: mod.GET };
  },
  "financeiro/catalogo/:tipo": async () => {
    const mod = await import("@/app/api/v1/financeiro/catalogo/[tipo]/route");
    return { GET: mod.GET };
  },
  "financeiro/comandas": async () => {
    const mod = await import("@/app/api/v1/financeiro/comandas/route");
    return { GET: mod.GET };
  },
  "financeiro/comandas/:id": async () => {
    const mod = await import("@/app/api/v1/financeiro/comandas/[id]/route");
    return { GET: mod.GET };
  },
  "financeiro/comandas/pendentes": async () => {
    const mod = await import("@/app/api/v1/financeiro/comandas/pendentes/route");
    return { GET: mod.GET };
  },
  "financeiro/fidelidade": async () => {
    const mod = await import("@/app/api/v1/financeiro/fidelidade/route");
    return { GET: mod.GET };
  },
  "financeiro/lancamentos": async () => {
    const mod = await import("@/app/api/v1/financeiro/lancamentos/route");
    return { GET: mod.GET };
  },
  "honorarios/contratos": async () => {
    const mod = await import("@/app/api/v1/honorarios/contratos/route");
    return { GET: mod.GET };
  },
  "honorarios/contratos/:id/parcelas": async () => {
    const mod = await import("@/app/api/v1/honorarios/contratos/[id]/parcelas/route");
    return { GET: mod.GET };
  },
  "imports": async () => {
    const mod = await import("@/app/api/v1/imports/route");
    return { GET: mod.GET };
  },
  "imports/:id": async () => {
    const mod = await import("@/app/api/v1/imports/[id]/route");
    return { GET: mod.GET };
  },
  "lead-captures": async () => {
    const mod = await import("@/app/api/v1/lead-captures/route");
    return { GET: mod.GET };
  },
  "leads/:id/attachments": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/attachments/route");
    return { GET: mod.GET };
  },
  "leads/:id/clone": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/clone/route");
    return { GET: mod.GET };
  },
  "leads/:id/contatos-relacionados": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/contatos-relacionados/route");
    return { GET: mod.GET };
  },
  "leads/:id/eventos": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/eventos/route");
    return { GET: mod.GET };
  },
  "leads/:id/field-proposals": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/field-proposals/route");
    return { GET: mod.GET };
  },
  "leads/:id/timeline": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/timeline/route");
    return { GET: mod.GET };
  },
  "leads/at-risk": async () => {
    const mod = await import("@/app/api/v1/leads/at-risk/route");
    return { GET: mod.GET };
  },
  "leads/import": async () => {
    const mod = await import("@/app/api/v1/leads/import/route");
    return { GET: mod.GET };
  },
  "leads/proposals": async () => {
    const mod = await import("@/app/api/v1/leads/proposals/route");
    return { GET: mod.GET };
  },
  "leads/reactivations": async () => {
    const mod = await import("@/app/api/v1/leads/reactivations/route");
    return { GET: mod.GET };
  },
  "message-template-groups": async () => {
    const mod = await import("@/app/api/v1/message-template-groups/route");
    return { GET: mod.GET };
  },
  "message-templates": async () => {
    const mod = await import("@/app/api/v1/message-templates/route");
    return { GET: mod.GET };
  },
  "message-templates/:id/midias/:indice": async () => {
    const mod = await import("@/app/api/v1/message-templates/[id]/midias/[indice]/route");
    return { GET: mod.GET };
  },
  "metrics/atrito": async () => {
    const mod = await import("@/app/api/v1/metrics/atrito/route");
    return { GET: mod.GET };
  },
  "metrics/attendants": async () => {
    const mod = await import("@/app/api/v1/metrics/attendants/route");
    return { GET: mod.GET };
  },
  "metrics/channels": async () => {
    const mod = await import("@/app/api/v1/metrics/channels/route");
    return { GET: mod.GET };
  },
  "metrics/funil": async () => {
    const mod = await import("@/app/api/v1/metrics/funil/route");
    return { GET: mod.GET };
  },
  "metrics/lost": async () => {
    const mod = await import("@/app/api/v1/metrics/lost/route");
    return { GET: mod.GET };
  },
  "metrics/metas": async () => {
    const mod = await import("@/app/api/v1/metrics/metas/route");
    return { GET: mod.GET };
  },
  "metrics/serie": async () => {
    const mod = await import("@/app/api/v1/metrics/serie/route");
    return { GET: mod.GET };
  },
  "modulos": async () => {
    const mod = await import("@/app/api/v1/modulos/route");
    return { GET: mod.GET };
  },
  "modulos/:modulo/:objeto": async () => {
    const mod = await import("@/app/api/v1/modulos/[modulo]/[objeto]/route");
    return { GET: mod.GET };
  },
  "notifications/push": async () => {
    const mod = await import("@/app/api/v1/notifications/push/route");
    return { GET: mod.GET };
  },
  "people": async () => {
    const mod = await import("@/app/api/v1/people/route");
    return { GET: mod.GET };
  },
  "people/:id": async () => {
    const mod = await import("@/app/api/v1/people/[id]/route");
    return { GET: mod.GET };
  },
  "phone-numbers": async () => {
    const mod = await import("@/app/api/v1/phone-numbers/route");
    return { GET: mod.GET };
  },
  "pipelines": async () => {
    const mod = await import("@/app/api/v1/pipelines/route");
    return { GET: mod.GET };
  },
  "pipelines/:id/agent-mapping": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/agent-mapping/route");
    return { GET: mod.GET };
  },
  "pipelines/:id/board": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/board/route");
    return { GET: mod.GET };
  },
  "pipelines/:id/forecast": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/forecast/route");
    return { GET: mod.GET };
  },
  "pipelines/:id/leads": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/leads/route");
    return { GET: mod.GET };
  },
  "pipelines/:id/stages": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/stages/route");
    return { GET: mod.GET };
  },
  "pipelines/:id/stages/win-rates": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/stages/win-rates/route");
    return { GET: mod.GET };
  },
  "pipelines/default": async () => {
    const mod = await import("@/app/api/v1/pipelines/default/route");
    return { GET: mod.GET };
  },
  "products": async () => {
    const mod = await import("@/app/api/v1/products/route");
    return { GET: mod.GET };
  },
  "products/import": async () => {
    const mod = await import("@/app/api/v1/products/import/route");
    return { GET: mod.GET };
  },
  "proposals": async () => {
    const mod = await import("@/app/api/v1/proposals/route");
    return { GET: mod.GET };
  },
  "proposals/:id": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/route");
    return { GET: mod.GET };
  },
  "proposals/:id/assistant/disponibilidade": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/assistant/disponibilidade/route");
    return { GET: mod.GET };
  },
  "proposals/:id/documento": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/documento/route");
    return { GET: mod.GET };
  },
  "proposals/:id/previa": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/previa/route");
    return { GET: mod.GET };
  },
  "prospecting": async () => {
    const mod = await import("@/app/api/v1/prospecting/route");
    return { GET: mod.GET };
  },
  "prospecting/agents/session": async () => {
    const mod = await import("@/app/api/v1/prospecting/agents/session/route");
    return { GET: mod.GET };
  },
  "rastreio/:id": async () => {
    const mod = await import("@/app/api/v1/rastreio/[id]/route");
    return { GET: mod.GET };
  },
  "reports/activities": async () => {
    const mod = await import("@/app/api/v1/reports/activities/route");
    return { GET: mod.GET };
  },
  "reports/financeiro": async () => {
    const mod = await import("@/app/api/v1/reports/financeiro/route");
    return { GET: mod.GET };
  },
  "reports/tags": async () => {
    const mod = await import("@/app/api/v1/reports/tags/route");
    return { GET: mod.GET };
  },
  "settings/assinatura": async () => {
    const mod = await import("@/app/api/v1/settings/assinatura/route");
    return { GET: mod.GET };
  },
  "settings/campanhas": async () => {
    const mod = await import("@/app/api/v1/settings/campanhas/route");
    return { GET: mod.GET };
  },
  "settings/proposal-templates": async () => {
    const mod = await import("@/app/api/v1/settings/proposal-templates/route");
    return { GET: mod.GET };
  },
  "settings/proposal-templates/:slug": async () => {
    const mod = await import("@/app/api/v1/settings/proposal-templates/[slug]/route");
    return { GET: mod.GET };
  },
  "settings/proposals": async () => {
    const mod = await import("@/app/api/v1/settings/proposals/route");
    return { GET: mod.GET };
  },
  "settings/prospeccao": async () => {
    const mod = await import("@/app/api/v1/settings/prospeccao/route");
    return { GET: mod.GET };
  },
  "settings/routing": async () => {
    const mod = await import("@/app/api/v1/settings/routing/route");
    return { GET: mod.GET };
  },
  "settings/routing/channels": async () => {
    const mod = await import("@/app/api/v1/settings/routing/channels/route");
    return { GET: mod.GET };
  },
  "settings/sons": async () => {
    const mod = await import("@/app/api/v1/settings/sons/route");
    return { GET: mod.GET };
  },
  "settings/task-plans": async () => {
    const mod = await import("@/app/api/v1/settings/task-plans/route");
    return { GET: mod.GET };
  },
  "tags/cores": async () => {
    const mod = await import("@/app/api/v1/tags/cores/route");
    return { GET: mod.GET };
  },
  "tags/vocabulario": async () => {
    const mod = await import("@/app/api/v1/tags/vocabulario/route");
    return { GET: mod.GET };
  },
  "tasks": async () => {
    const mod = await import("@/app/api/v1/tasks/route");
    return { GET: mod.GET };
  },
  "team": async () => {
    const mod = await import("@/app/api/v1/team/route");
    return { GET: mod.GET };
  },
  "team/assignable": async () => {
    const mod = await import("@/app/api/v1/team/assignable/route");
    return { GET: mod.GET };
  },
  "voice/calls/history": async () => {
    const mod = await import("@/app/api/v1/voice/calls/history/route");
    return { GET: mod.GET };
  },
  "voice/events": async () => {
    const mod = await import("@/app/api/v1/voice/events/route");
    return { GET: mod.GET };
  },
  "voice/opt-in": async () => {
    const mod = await import("@/app/api/v1/voice/opt-in/route");
    return { GET: mod.GET };
  },
  "voice/sessions/status": async () => {
    const mod = await import("@/app/api/v1/voice/sessions/status/route");
    return { GET: mod.GET };
  },
  "voip/trunk": async () => {
    const mod = await import("@/app/api/v1/voip/trunk/route");
    return { GET: mod.GET };
  },
};

// Carregadores de escrita permitida (apenas ESCRITA_PERMITIDA).
// O bundler nao aceita import com caminho variavel, entao cada um e um
// import() de caminho literal, no padrao de proposta-comum.ts.
export const CARREGADORES_DE_ESCRITA: Record<string, () => Promise<Record<string, unknown>>> = {
  "ai/agents": async () => {
    const mod = await import("@/app/api/v1/ai/agents/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/agents/:id": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "ai/routers": async () => {
    const mod = await import("@/app/api/v1/ai/routers/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/routers/:id": async () => {
    const mod = await import("@/app/api/v1/ai/routers/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "ai/memory": async () => {
    const mod = await import("@/app/api/v1/ai/memory/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/knowledge/sources": async () => {
    const mod = await import("@/app/api/v1/ai/knowledge/sources/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/knowledge/sources/:id": async () => {
    const mod = await import("@/app/api/v1/ai/knowledge/sources/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "ai/knowledge/sources/:id/reindex": async () => {
    const mod = await import("@/app/api/v1/ai/knowledge/sources/[id]/reindex/route");
    return {
      POST: mod.POST,
    };
  },
  "pipelines": async () => {
    const mod = await import("@/app/api/v1/pipelines/route");
    return {
      POST: mod.POST,
    };
  },
  "pipelines/:id": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "pipelines/:id/stages": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/stages/route");
    return {
      POST: mod.POST,
    };
  },
  "pipelines/:id/stages/:stageId": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/stages/[stageId]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "pipelines/:id/config": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/config/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "tags/vocabulario": async () => {
    const mod = await import("@/app/api/v1/tags/vocabulario/route");
    return {
      POST: mod.POST,
    };
  },
  "contacts/:id": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "contacts/:id/personal": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/personal/route");
    return {
      POST: mod.POST,
    };
  },
  "leads": async () => {
    const mod = await import("@/app/api/v1/leads/route");
    return {
      POST: mod.POST,
    };
  },
  "leads/:id": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "leads/:id/move": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/move/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/followup-flows": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/followup-flows/:id": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "ai/followup-flows/from-model": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/from-model/route");
    return {
      POST: mod.POST,
    };
  },
  "tasks": async () => {
    const mod = await import("@/app/api/v1/tasks/route");
    return {
      POST: mod.POST,
    };
  },
  "tasks/:id": async () => {
    const mod = await import("@/app/api/v1/tasks/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "agenda/agendamentos": async () => {
    const mod = await import("@/app/api/v1/agenda/agendamentos/route");
    return {
      POST: mod.POST,
      PATCH: mod.PATCH,
    };
  },
  "agenda/configuracao": async () => {
    const mod = await import("@/app/api/v1/agenda/configuracao/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "campaign-templates": async () => {
    const mod = await import("@/app/api/v1/campaign-templates/route");
    return {
      POST: mod.POST,
    };
  },
  "campaign-templates/:id": async () => {
    const mod = await import("@/app/api/v1/campaign-templates/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "prospecting": async () => {
    const mod = await import("@/app/api/v1/prospecting/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/agents/:id/publish": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/publish/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/followup-flows/:id/publish": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/[id]/publish/route");
    return {
      POST: mod.POST,
    };
  },
  "agenda/aviso": async () => {
    const mod = await import("@/app/api/v1/agenda/aviso/route");
    return {
      PUT: mod.PUT,
    };
  },
  "agenda/enderecos": async () => {
    const mod = await import("@/app/api/v1/agenda/enderecos/route");
    return {
      POST: mod.POST,
    };
  },
  "agenda/excecoes": async () => {
    const mod = await import("@/app/api/v1/agenda/excecoes/route");
    return {
      POST: mod.POST,
    };
  },
  "agenda/servicos": async () => {
    const mod = await import("@/app/api/v1/agenda/servicos/route");
    return {
      POST: mod.POST,
    };
  },
  "agenda/servicos/atualizar": async () => {
    const mod = await import("@/app/api/v1/agenda/servicos/atualizar/route");
    return {
      POST: mod.POST,
    };
  },
  "agenda/tipos": async () => {
    const mod = await import("@/app/api/v1/agenda/tipos/route");
    return {
      POST: mod.POST,
      PATCH: mod.PATCH,
    };
  },
  "agenda/tipos/reativar": async () => {
    const mod = await import("@/app/api/v1/agenda/tipos/reativar/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/agents/:id/duplicate": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/duplicate/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/agents/:id/pause": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/pause/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/agents/:id/versions": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/versions/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/agents/:id/versions/:vid": async () => {
    const mod = await import("@/app/api/v1/ai/agents/[id]/versions/[vid]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "ai/followup-flows/:id/disable": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/[id]/disable/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/followup-flows/:id/duplicate": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/[id]/duplicate/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/followup-flows/:id/rollback": async () => {
    const mod = await import("@/app/api/v1/ai/followup-flows/[id]/rollback/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/memory/entries": async () => {
    const mod = await import("@/app/api/v1/ai/memory/entries/route");
    return {
      POST: mod.POST,
    };
  },
  "ai/memory/entries/:id": async () => {
    const mod = await import("@/app/api/v1/ai/memory/entries/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "ai/pacing": async () => {
    const mod = await import("@/app/api/v1/ai/pacing/route");
    return {
      PUT: mod.PUT,
    };
  },
  "ai/routers/:id/members": async () => {
    const mod = await import("@/app/api/v1/ai/routers/[id]/members/route");
    return {
      PUT: mod.PUT,
    };
  },
  "ai/style-adjustments": async () => {
    const mod = await import("@/app/api/v1/ai/style-adjustments/route");
    return {
      PUT: mod.PUT,
    };
  },
  "channel-schedules": async () => {
    const mod = await import("@/app/api/v1/channel-schedules/route");
    return {
      POST: mod.POST,
    };
  },
  "channel-schedules/:id": async () => {
    const mod = await import("@/app/api/v1/channel-schedules/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "companies": async () => {
    const mod = await import("@/app/api/v1/companies/route");
    return {
      POST: mod.POST,
    };
  },
  "companies/:id": async () => {
    const mod = await import("@/app/api/v1/companies/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "company-people": async () => {
    const mod = await import("@/app/api/v1/company-people/route");
    return {
      POST: mod.POST,
    };
  },
  "company-people/:id": async () => {
    const mod = await import("@/app/api/v1/company-people/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "people": async () => {
    const mod = await import("@/app/api/v1/people/route");
    return {
      POST: mod.POST,
    };
  },
  "people/:id": async () => {
    const mod = await import("@/app/api/v1/people/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "phone-numbers": async () => {
    const mod = await import("@/app/api/v1/phone-numbers/route");
    return {
      POST: mod.POST,
    };
  },
  "phone-numbers/:id": async () => {
    const mod = await import("@/app/api/v1/phone-numbers/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "contacts/:id/person": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/person/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "contacts/:id/carteira": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/carteira/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "contacts/:id/always-human": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/always-human/route");
    return {
      POST: mod.POST,
    };
  },
  "leads/:id/win": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/win/route");
    return {
      POST: mod.POST,
    };
  },
  "leads/:id/lose": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/lose/route");
    return {
      POST: mod.POST,
    };
  },
  "leads/:id/next-action": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/next-action/route");
    return {
      POST: mod.POST,
    };
  },
  "message-templates": async () => {
    const mod = await import("@/app/api/v1/message-templates/route");
    return {
      POST: mod.POST,
    };
  },
  "message-templates/:id": async () => {
    const mod = await import("@/app/api/v1/message-templates/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "message-templates/:id/ordem": async () => {
    const mod = await import("@/app/api/v1/message-templates/[id]/ordem/route");
    return {
      PUT: mod.PUT,
    };
  },
  "pipelines/:id/agent-mapping": async () => {
    const mod = await import("@/app/api/v1/pipelines/[id]/agent-mapping/route");
    return {
      PUT: mod.PUT,
    };
  },
  "products": async () => {
    const mod = await import("@/app/api/v1/products/route");
    return {
      POST: mod.POST,
    };
  },
  "products/:id": async () => {
    const mod = await import("@/app/api/v1/products/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "settings/agenda-apresentacao": async () => {
    const mod = await import("@/app/api/v1/settings/agenda-apresentacao/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "settings/art15": async () => {
    const mod = await import("@/app/api/v1/settings/art15/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "settings/assinatura": async () => {
    const mod = await import("@/app/api/v1/settings/assinatura/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "settings/campanhas": async () => {
    const mod = await import("@/app/api/v1/settings/campanhas/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "settings/proposal-templates": async () => {
    const mod = await import("@/app/api/v1/settings/proposal-templates/route");
    return {
      POST: mod.POST,
    };
  },
  "settings/proposal-templates/:slug": async () => {
    const mod = await import("@/app/api/v1/settings/proposal-templates/[slug]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "settings/proposals": async () => {
    const mod = await import("@/app/api/v1/settings/proposals/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "settings/prospeccao": async () => {
    const mod = await import("@/app/api/v1/settings/prospeccao/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "settings/task-plans": async () => {
    const mod = await import("@/app/api/v1/settings/task-plans/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "metrics/atrito": async () => {
    const mod = await import("@/app/api/v1/metrics/atrito/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "demandas/:id": async () => {
    const mod = await import("@/app/api/v1/demandas/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "contacts": async () => {
    const mod = await import("@/app/api/v1/contacts/route");
    return {
      POST: mod.POST,
    };
  },
  "contacts/:id/proposals/:proposal_id": async () => {
    const mod = await import("@/app/api/v1/contacts/[id]/proposals/[proposal_id]/route");
    return {
      POST: mod.POST,
    };
  },
  "contacts/bulk": async () => {
    const mod = await import("@/app/api/v1/contacts/bulk/route");
    return {
      POST: mod.POST,
    };
  },
  "contacts/merge": async () => {
    const mod = await import("@/app/api/v1/contacts/merge/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "conversations/:id/claim": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/claim/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/close": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/close/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/draft-reply": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/draft-reply/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/drafts": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/drafts/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/drafts/consume": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/drafts/consume/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/mark-read": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/mark-read/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/notes": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/notes/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/participants": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/participants/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/release": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/release/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/snooze": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/snooze/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/:id/transfer": async () => {
    const mod = await import("@/app/api/v1/conversations/[id]/transfer/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/bulk": async () => {
    const mod = await import("@/app/api/v1/conversations/bulk/route");
    return {
      POST: mod.POST,
    };
  },
  "conversations/open-with-contact": async () => {
    const mod = await import("@/app/api/v1/conversations/open-with-contact/route");
    return {
      POST: mod.POST,
    };
  },
  "leads/:id/clone": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/clone/route");
    return {
      POST: mod.POST,
    };
  },
  "leads/:id/contatos-relacionados": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/contatos-relacionados/route");
    return {
      POST: mod.POST,
    };
  },
  "leads/:id/reactivation": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/reactivation/route");
    return {
      POST: mod.POST,
    };
  },
  "leads/:id/retomar": async () => {
    const mod = await import("@/app/api/v1/leads/[id]/retomar/route");
    return {
      POST: mod.POST,
    };
  },
  "leads/bulk": async () => {
    const mod = await import("@/app/api/v1/leads/bulk/route");
    return {
      POST: mod.POST,
    };
  },
  "proposals": async () => {
    const mod = await import("@/app/api/v1/proposals/route");
    return {
      POST: mod.POST,
    };
  },
  "proposals/:id": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "proposals/:id/decide": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/decide/route");
    return {
      POST: mod.POST,
    };
  },
  "proposals/:id/documento": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/documento/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "proposals/:id/modelo": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/modelo/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "proposals/:id/preencher-com-conversa": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/preencher-com-conversa/route");
    return {
      POST: mod.POST,
    };
  },
  "proposals/:id/revise": async () => {
    const mod = await import("@/app/api/v1/proposals/[id]/revise/route");
    return {
      POST: mod.POST,
    };
  },
  "financeiro/catalogo/:tipo": async () => {
    const mod = await import("@/app/api/v1/financeiro/catalogo/[tipo]/route");
    return {
      POST: mod.POST,
      PATCH: mod.PATCH,
    };
  },
  "financeiro/comandas": async () => {
    const mod = await import("@/app/api/v1/financeiro/comandas/route");
    return {
      POST: mod.POST,
    };
  },
  "financeiro/comandas/:id": async () => {
    const mod = await import("@/app/api/v1/financeiro/comandas/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "financeiro/comandas/:id/estornar": async () => {
    const mod = await import("@/app/api/v1/financeiro/comandas/[id]/estornar/route");
    return {
      POST: mod.POST,
    };
  },
  "financeiro/comandas/:id/finalizar": async () => {
    const mod = await import("@/app/api/v1/financeiro/comandas/[id]/finalizar/route");
    return {
      POST: mod.POST,
    };
  },
  "financeiro/comandas/:id/itens": async () => {
    const mod = await import("@/app/api/v1/financeiro/comandas/[id]/itens/route");
    return {
      POST: mod.POST,
    };
  },
  "financeiro/comandas/faturar-lote": async () => {
    const mod = await import("@/app/api/v1/financeiro/comandas/faturar-lote/route");
    return {
      POST: mod.POST,
    };
  },
  "financeiro/fidelidade": async () => {
    const mod = await import("@/app/api/v1/financeiro/fidelidade/route");
    return {
      POST: mod.POST,
    };
  },
  "financeiro/lancamentos": async () => {
    const mod = await import("@/app/api/v1/financeiro/lancamentos/route");
    return {
      POST: mod.POST,
    };
  },
  "financeiro/lancamentos/:id": async () => {
    const mod = await import("@/app/api/v1/financeiro/lancamentos/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "honorarios/contratos": async () => {
    const mod = await import("@/app/api/v1/honorarios/contratos/route");
    return {
      POST: mod.POST,
    };
  },
  "honorarios/contratos/:id/parcelas": async () => {
    const mod = await import("@/app/api/v1/honorarios/contratos/[id]/parcelas/route");
    return {
      POST: mod.POST,
    };
  },
  "honorarios/parcelas/:id/pagar": async () => {
    const mod = await import("@/app/api/v1/honorarios/parcelas/[id]/pagar/route");
    return {
      POST: mod.POST,
    };
  },
  "agenda/google/calendarios": async () => {
    const mod = await import("@/app/api/v1/agenda/google/calendarios/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "agenda/google/calendarios/atualizar": async () => {
    const mod = await import("@/app/api/v1/agenda/google/calendarios/atualizar/route");
    return {
      POST: mod.POST,
    };
  },
  "attendants/sectors": async () => {
    const mod = await import("@/app/api/v1/attendants/sectors/route");
    return {
      POST: mod.POST,
    };
  },
  "attendants/sectors/:id": async () => {
    const mod = await import("@/app/api/v1/attendants/sectors/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "attendants/sector/:user_id": async () => {
    const mod = await import("@/app/api/v1/attendants/sector/[user_id]/route");
    return {
      PUT: mod.PUT,
    };
  },
  "message-template-groups": async () => {
    const mod = await import("@/app/api/v1/message-template-groups/route");
    return {
      POST: mod.POST,
    };
  },
  "message-template-groups/:id": async () => {
    const mod = await import("@/app/api/v1/message-template-groups/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "message-template-groups/:id/ordem": async () => {
    const mod = await import("@/app/api/v1/message-template-groups/[id]/ordem/route");
    return {
      PUT: mod.PUT,
    };
  },
  "contacts/duplicates/dismiss": async () => {
    const mod = await import("@/app/api/v1/contacts/duplicates/dismiss/route");
    return {
      POST: mod.POST,
    };
  },
  "messages": async () => {
    const mod = await import("@/app/api/v1/messages/route");
    return {
      POST: mod.POST,
    };
  },
  "messages/:id": async () => {
    const mod = await import("@/app/api/v1/messages/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "messages/:id/forward": async () => {
    const mod = await import("@/app/api/v1/messages/[id]/forward/route");
    return {
      POST: mod.POST,
    };
  },
  "messages/:id/hide": async () => {
    const mod = await import("@/app/api/v1/messages/[id]/hide/route");
    return {
      POST: mod.POST,
    };
  },
  "messages/:id/retry": async () => {
    const mod = await import("@/app/api/v1/messages/[id]/retry/route");
    return {
      POST: mod.POST,
    };
  },
  "campaigns": async () => {
    const mod = await import("@/app/api/v1/campaigns/route");
    return {
      POST: mod.POST,
    };
  },
  "campaigns/:id": async () => {
    const mod = await import("@/app/api/v1/campaigns/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
  "campaigns/:id/:acao": async () => {
    const mod = await import("@/app/api/v1/campaigns/[id]/[acao]/route");
    return {
      POST: mod.POST,
    };
  },
  "campaigns/preview": async () => {
    const mod = await import("@/app/api/v1/campaigns/preview/route");
    return {
      POST: mod.POST,
    };
  },
  "automation-rules": async () => {
    const mod = await import("@/app/api/v1/automation-rules/route");
    return {
      POST: mod.POST,
    };
  },
  "automation-rules/:id": async () => {
    const mod = await import("@/app/api/v1/automation-rules/[id]/route");
    return {
      PATCH: mod.PATCH,
    };
  },
};

