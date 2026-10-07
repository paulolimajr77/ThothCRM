# Arquivar o que foi perdido e dar prazo de guarda ao contato sem resposta

**Data:** 07/10/2026 · **Status:** desenho para revisão (nada implementado)

**Medido contra** `origin/main` `c71a27af7` (07/10/2026: código, `baseline.sql` e testes) e, só em leitura, contra o banco de uma instalação na versão 1.66.0. Onde os dois diferem, vale a `main`; o que a spec cita da instalação é schema ou contagem agregada, nunca dado de pessoa.

## Resumo (em português de balcão)

Quem usa o CRM para prospectar a frio acumula gente que nunca respondeu. Hoje essas
pessoas ficam para sempre: o negócio vai para "Perdido", mas a **conversa continua na
lista do Inbox** e o **contato continua no cadastro sem prazo nenhum**. Este desenho tem
duas partes, que se entregam separadas:

1. **Tirar do Inbox a conversa de quem foi perdido** — uma ação de lote para o que já
   existe e uma ação de automação para não acumular de novo.
2. **Um prazo opcional de guarda**: depois de N dias sem a pessoa falar, o contato é
   anonimizado (a função de anonimização que já existe), e nada mais.

As duas partes são **opt-in**: quem não ligar nada tem o produto exatamente como está.

## Problema

Medido em uma instalação com prospecção ativa (07/10/2026; contagens agregadas, sem
dados pessoais):

- Conversas de negócios já em "Perdido" continuam abertas ou com a IA ligada e aparecem
  no Inbox. Não existe ação para arquivá-las em lote: a rota
  `PATCH /api/v1/conversations/[id]` muda **uma** conversa por chamada.
- O quadro de negócios só tem 4 ações em lote — `move`, `assign`, `tag`, `delete`
  (`lib/schemas/leads.ts`, `bulkLeadActionSchema`). `delete` é `DELETE` de verdade
  (`app/api/v1/leads/bulk/route.ts`, "crm_leads has no `is_archived` column").
- **Nenhuma rotina apaga contato, negócio, conversa ou mensagem de texto.** O cron
  `data-retention` apaga fila de jobs, auditoria, espelho de agenda, nonces de OAuth, conversa do caso,
  passagens, avisos de caso, candidatos de prospecção, observações do Jev, candidatos do
  golden e, desde a migration 0587 (#2140), telemetria de IA, ritmo de envio, cópias enviadas
  e checkpoints superados; o `media-retention` apaga mídia. Contato não está em nenhuma das
  listas.
- Para prospecção a frio (base legal: legítimo interesse) guardar o contato sem prazo é o
  ponto mais frágil da operação. O "5 anos" que existe no produto é da **auditoria**
  (regra L-10, `docs/business-rules/00-business-rules-catalog.md`), não de contato.

## Decisões de desenho

1. **O que se arquiva é a conversa, não o negócio.** O negócio em etapa de perda já é
   terminal e continua contando nas métricas de conversão e de motivo de perda. Arquivar o
   card exigiria uma coluna nova em `crm_leads` (não existe `is_archived`) — fica fora
   desta versão.
2. **A regra de arquivar nasce de um evento que já existe, não de um botão por porta.**
   Um negócio chega a "perdido" por muitas portas (`leads/bulk`, `leads/[id]/lose`,
   `leads/[id]/move`, `leads/_handler.ts`, `handoff-stage-move`, `appointment-stage-move`,
   `agent-stage-sync`, o bloco `move_lead` do follow-up, a capacidade da IA). Todas passam
   pelo `UPDATE` de `crm_leads.status`, e `fn_emit_event_on_lead_change` emite
   `lead.lost` para todas. Consumir `lead.lost` cobre as portas de hoje e as de amanhã.
3. **A regra é uma ação nova no motor de automação que já existe**, e não uma configuração
   nova por funil. O motor já atende `lead.lost` (`lib/automation/engine.ts`) e nenhuma das
   ações atuais fecha ou arquiva conversa (`lib/automation/actions/`: `add-tag`,
   `ai-decide`, `apply-task-plan`, `assign-owner`, `call-webhook`, `create-or-move-lead`,
   `create-task`, `send-ai-message`, `send-whatsapp`, `start-message-flow`).
   Quem não criar a regra não vê diferença.
4. **O prazo de guarda é desligado por padrão e é por organização**, no mesmo formulário
   onde já mora a retenção de mídia (`app/app/settings/tenant/_form.tsx`).
5. **O expurgo reaproveita a anonimização que o produto já tem**
   (`fn_lgpd_cascade_redact_contact`), não cria uma segunda. Anonimizar é irreversível e
   preserva as estatísticas; apagar contato quebraria `conversations.contact_id` e
   `messages.contact_id`, que são `restrict`.
6. **O relógio é a última mensagem DA PESSOA, não `last_activity_at`.** Medido na migration
   0162: `contacts.last_activity_at` é carimbado por mensagem de entrada **e de saída**
   (`greatest(..., p_at)` em `fn_mark_conversation_message`). Com ele, cada follow-up que
   o próprio sistema manda adiaria a eliminação para sempre.

## Parte 1 — Tirar o perdido do Inbox

### 1a. Ação de automação `archive_conversations`

Registrada em `lib/automation/actions/register-all.ts`, junto das outras. Para o contato
do negócio que virou perdido:

- Arquiva (via `fn_service_status`, com `expected_revision`, como a rota faz) cada
  conversa cujo status **não é terminal** (`open`, `pending`, `ai_handling`). Conversa
  `claimed` (um humano a assumiu) **não é arquivada**: a ação registra o motivo e segue.
  Conversa já `closed`/`resolved`/`archived` não é tocada.
- **Não arquiva se o contato tem outro negócio aberto** (em qualquer funil). Perder um
  card não encerra a conversa de quem ainda está sendo atendido por outro.
- Não age em conversa de grupo (`is_group`) nem em contato `kind` diferente de `person`.
- Audita `conversation.archived` com o ator "automação" e referência à regra, uma linha por
  conversa, igual à rota (`app/api/v1/conversations/_handler.ts`).
- Idempotente: uma segunda execução, ou o evento entregue duas vezes, não muda nada.

### 1b. Ação em lote para o que já existe

Na coluna de perda do quadro, ação "Arquivar conversas" sobre os cards selecionados
(a mesma forma dos 50 por chamada de `bulkLeadActionSchema`, com a ação nova
`archive_conversations`), com **as mesmas guardas da 1a**. É o caminho para o acúmulo de
hoje; a 1a impede o acúmulo de amanhã.

### Efeitos que a leitura do código mostrou e que a spec assume

- `fn_service_status` trata `archived` como estado **terminal**: grava
  `service_closed_at`, incrementa `service_revision` e, quando a conversa não tinha
  passagem para humano, zera `bot_silenced_until`. Ele **não** limpa
  `conversations.active_ai_agent_id`, e **não precisa**: quando o cliente escreve de novo,
  o gatilho `trg_demanda_abre_no_inbound` → `fn_service_inbound` reconhece conversa em
  `closed`/`resolved`/`archived`, **reabre** (`status = 'open'`, ou `'claimed'` se a
  organização ligou "a conversa fica com quem atendeu" e havia dono), abre uma demanda
  nova ("Responder à nova mensagem do cliente"), limpa o dono e põe
  `active_ai_agent_id = null` (`supabase/baseline.sql`, `fn_service_inbound`). O robô
  então atende como em qualquer mensagem nova. Mensagem com `sent_at` anterior ao
  encerramento (`m.sent_at <= c.service_closed_at`) **não** reabre. Não há, portanto,
  necessidade de a ação soltar a IA: arquivar uma conversa de perdido e depois receber
  resposta tardia dá um atendimento novo e limpo.
- Em estado terminal, a função grava `proximo_passo = 'Revisar atendimento e registrar o
  desfecho da demanda'` na demanda corrente que ainda esteja aberta. Num lote de perdidos
  isso vira ruído na lista de demandas; o plano decide se a ação fecha a demanda junto.

## Parte 2 — Prazo de guarda do contato sem resposta

### Configuração

`organizations.contact_retention_days int null`: **`null` = desligado** (padrão, e o que
todo `.env`/banco antigo continua tendo). Valor mínimo **180** dias e **teto de 3650**, impostos **dentro do
corpo da função** (`least(greatest(..., 180), 3650)`) e no esquema Zod do formulário. O teto
vem da lição do #2509: `interpretarRetencao` não tem teto, e um número grande demais
(`now() - make_interval(days => 9999999)`) faz o Postgres lançar `timestamp out of range`.
Os dois limites ficam no corpo, como os pisos das irmãs
(`fn_expurgar_auditoria_vencida` etc., `lib/retencao/politica.ts`), para valer até para
quem chama por `psql`. A constante e o piso entram em `lib/retencao/politica.ts`, com o
mesmo teste que compara os dois lados.

Superfície (invariante 6): campo "Eliminar contatos sem resposta após (dias)" no
formulário da organização; vazio = nunca. Ao ligar, a tela mostra **quantos contatos
seriam anonimizados na próxima rodada** (contagem de leitura, com a mesma consulta da
função) e pede confirmação dizendo que é **irreversível** — o mesmo padrão do
interruptor de mídia.

### Quem é elegível (todas as condições)

1. Pertence à organização com o prazo ligado; `is_anonymized = false`.
2. `kind = 'person'` e `is_personal = false`. (`is_personal` é "contato de vida pessoal,
   escondido da operação"; o expurgo não toca o que o gerente marcou assim.)
3. **Sem fala da pessoa há N dias:** `greatest(max(conversations.last_inbound_at),
   contacts.created_at) < now() - N dias`. Contato que nunca respondeu conta a partir da
   criação.
4. **Sem relação comercial viva ou passada:** nenhum negócio `open` ou `won`; nenhuma
   linha em `sales`, `orders`, `calendar_appointments`, `crm_proposals`, `loyalty_ledger`.
   (Obrigações fiscais e de garantia não se resolvem por prazo de prospecção.)
5. **Sem cadência ou pendência em andamento:** nenhum `followup_enrollments` vivo
   (`active`, `waiting_reply`, `paused_handoff`, `paused_manual`, `coletando`), nenhum
   `agent_cases` em `awaiting_human`/`awaiting_lead`/`escalated`, nenhum `crm_tasks`
   `pending`/`in_progress`, nenhum `lgpd_requests` `received`/`processing`, nenhum
   `cron_jobs` ainda ativo para o contato (retorno prometido).
6. **Não bloqueado (`is_blocked = false`).** Ver "Quem pediu para parar".

### Quem pediu para parar

A função de anonimização apaga `phone_number` e mantém `is_blocked`. Sem o número, nada
liga o bloqueio a um novo cadastro do mesmo telefone: reimportar o número cria um contato
novo **sem** bloqueio, e a prospecção abordaria quem pediu PARAR.

Medido: o PARAR escrito pelo cliente grava **só** `contacts.is_blocked` (a regra mora em
`lib/opt-out/deteccao.ts`, que não referencia `campaign_suppressions`). A lista de exclusão
de campanha (`campaign_suppressions`, com `recipient_address_hash`) é alimentada pela rota
manual `app/api/v1/campaign-suppressions` (papel `manager`) e lida por
`lib/campanhas/exclusoes.ts` e `lib/campanhas/rodada.ts`, que checam **as duas**: o
bloqueio do contato (`pulado:opt_out`) e o hash do endereço (`pulado:suprimido`). Logo, o
único registro automático de "não me procure" é o próprio contato bloqueado, com o
telefone — exatamente o que a anonimização apagaria.

Por isso a v1 **não elimina contato bloqueado**: esse é o dado mínimo que o produto guarda
para honrar o pedido, e guardá-lo é o uso legítimo. Anonimizar um bloqueado continua
possível pelo pedido formal do titular. Uma v2 poderia gravar o hash do telefone em
`campaign_suppressions` no momento da anonimização e só então liberar o bloqueado.

### Execução

- Nova `public.fn_expurgar_contatos_sem_resposta(p_limite int)`, `security definer`,
  `set search_path = public, pg_temp`, **sem seletor de linha** além das condições acima:
  nenhum parâmetro de organização, contato ou ator. Para cada elegível chama
  `fn_lgpd_cascade_redact_contact(org, contato, gen_random_uuid())` — a **mesma** função
  que o pedido formal e o `POST /api/v1/lgpd/anonymize` usam.
- No cron `app/api/v1/cron/data-retention/route.ts` (diário), **como passo próprio, com o
  seu `try`, depois de `varrerRedacoesIncompletas`** (a varredura de anonimização pendente,
  SLA D+15, que já vive nessa rota) e fora de `podarHistorico`. Motivo medido: hoje cada
  `drenar(...)` que lança derruba a rota inteira e a varredura de LGPD pula o dia — o
  acoplamento que o #2508 descreve e que o #2140 já ampliou com quatro drenos. Um passo novo
  **não** pode entrar nessa fila de falhas. A varredura existente também completa, na
  rodada seguinte, qualquer resíduo que a minha função deixe, porque ela é a mesma que
  `lib/lgpd/cascata.ts` oferece ao pedido formal (#1659).
- Em lotes. O `drenar(...)`
  das irmãs passa `p_retencao_dias` + `p_limite`; esta função recebe **só `p_limite`**
  (o prazo é por organização, está na coluna), como já faz `fn_enfileirar_midia_vencida`
  na mesma rota — o contrato do `drenar` ganha esse segundo formato.
- **Tamanho do lote arbitrado em 25 contatos por chamada** (e o teto de 20 chamadas por
  rodada que o cron já usa, `MAX_LOTES`), porque anonimizar um contato toca cerca de trinta
  tabelas por dentro de uma transação, enquanto as irmãs apagam em massa com
  `TAMANHO_DO_LOTE = 1000`. É arbitragem de projeto, não medição: o custo por contato só se
  mede escrevendo, e o teste de banco do plano o mede num Postgres descartável. O acúmulo
  drena em dias.
- **Dois índices parciais novos** na mesma migration, porque a consulta de elegibilidade
  faz `not exists` por contato em `crm_tasks` e `crm_proposals`, e nenhuma das duas tem
  índice em `contact_id` (medido em `pg_indexes`; as demais — `conversations`, `crm_leads`,
  `sales`, `orders`, `calendar_appointments`, `loyalty_ledger`, `followup_enrollments`,
  `lgpd_requests` — têm): `crm_tasks (organization_id, contact_id) where status in
  ('pending','in_progress')` e `crm_proposals (organization_id, contact_id)`.
- Doutrina de função nova: `revoke execute ... from public, anon` **e** `from
  authenticated`, `grant execute ... to service_role` (entrar na varredura de
  `tests/invariants/hardening-definer-varredura.test.ts`).
- Cada contato anonimizado já gera a linha densa `lgpd.redact_executed` (ator nulo,
  `bypassed_rls = true`, medido no corpo da função). A função acrescenta uma linha
  `retention.contacts_sweep_run` com a contagem, para que o expurgo **registre a própria
  erosão**, como `retention.sweep_run` faz.
- Cron que não encontra ninguém **não audita** (CLAUDE.md, "Audit log").

### O que muda quando o expurgo erra (invariante 7)

- Erro de eligibilidade para o lado seguro (deixar de eliminar) custa só espaço.
- Erro para o lado perigoso (eliminar quem voltaria a falar) perde nome, telefone e texto;
  quem escrever de novo vira contato novo. É por isso que o piso é 180 dias, o relógio é
  a fala da pessoa, e o padrão é desligado.
- A tela do formulário mostra "última rodada: X contatos em DD/MM", lido de
  `api_audit_log`. Sem essa linha o expurgo seria invisível a quem o ligou.

## Fatos medidos no código e no banco que o desenho usa

- `conversations.status` aceita `open, pending, resolved, claimed, ai_handling, closed,
  archived`; `closed`, `resolved` e `archived` são terminais em `fn_service_status`.
- `crm_leads` **não tem** `is_archived`; `contacts` também não. `contacts.is_anonymized` e
  `anonymized_at` existem.
- `fn_lgpd_cascade_redact_contact(p_organization_id, p_contact_id, p_request_id)` + 16
  gatilhos em `contacts` ligados a `is_anonymized` (seção acima). A função devolve
  `already_anonymized` se já feito; anula `phone_number`, `email`, `cpf`, `birthdate`,
  `consent`, `tags`; redige mensagens, metadados de conversa, atividades, título e campos
  dos negócios (preservando etapa e valor), pedidos, propostas, campanhas, comandas,
  notas internas, chamadas de voz, candidatos de prospecção, casos, demandas, avisos e
  passagens; enfileira a mídia em `storage_redaction_queue`.
- Chaves estrangeiras para `contacts` com `cascade`: `calendar_appointments`,
  `campaign_recipients`, `demandas`, `followup_enrollments`, `lead_notes`, `lead_state`,
  `loyalty_ledger`, `send_ledger`, entre outras. `conversations.contact_id` e
  `messages.contact_id` são `restrict`.
- `lead.lost` é emitido por `trg`/`fn_emit_event_on_lead_change` em todo `UPDATE` de
  `crm_leads.status` para `lost`, com `lead_id` e `lost_reason` no payload.
- Retenção hoje: `RETENCAO_FILA_DIAS_PADRAO` 90, `RETENCAO_AUDITORIA_DIAS_PADRAO` 1825,
  `RETENCAO_PROSPECCAO_DIAS_PADRAO` 365 (candidatos), `RETENCAO_MIDIA_DIAS_PADRAO` 365
  (`lib/retencao/politica.ts`).
- Numa instalação medida: 123 contatos, 0 bloqueados, 0 anonimizados, nenhum com atividade
  anterior a 12 meses, **47 com `last_activity_at` nulo** (o relógio precisa de `coalesce`
  com `created_at`), 0 vendas e 0 pedidos.

## A anonimização cobre quase tudo; o que sobra entra na Parte 2

A anonimização **não** é só a função `fn_lgpd_cascade_redact_contact`: há **16 gatilhos**
em `contacts` que reagem a `is_anonymized` (contados lendo o `baseline.sql` da `main`) e redigem o resto
(`trg_redigir_conversas_ao_anonimizar` — mensagens, `lead_notes`, `lead_state`,
`lead_checkpoints`, `ai_agent_runs.tool_calls`, `social_identity`;
`trg_apagar_rascunhos_ao_anonimizar` — `ai_reply_drafts`;
`trg_redigir_agenda_ao_anonimizar` — `calendar_appointments`; propostas, tarefas, B2B,
captações, exclusões e campanhas, módulos, Meet e Google, entre outros). A medição por
nome, contra o texto de todas essas funções, deixou **cinco tabelas ligadas a contato que
nenhuma delas cita**, e a spec trata cada uma:

| Tabela (coluna) | O que guarda | Decisão |
|---|---|---|
| `cron_jobs` (`payload`: `promise`, `promised_at`, `proposal_id`, `reason`, `source`) | o que foi prometido à pessoa | **Elegibilidade:** contato com `cron_jobs` ativo não entra. **Cascata:** redigir `promise` e `reason` dos já encerrados. |
| `lead_state_transitions` (`reason`) | texto livre do motivo da mudança de estágio (medido: textos de até 145 caracteres) | **Cascata:** `reason = null`. |
| `google_ads_click_refs` (`gclid`, `gbraid`, `wbraid`, `query_raw`) e `meta_ads_click_refs` (`utm`, `query_raw`) | identificadores de clique e a busca da pessoa, ligados por `contact_id` | **Cascata:** anular os campos. |
| `before_send_traces` (`trace`) | medido: lista de `{code, gate, verdict, detail}`; `detail` com até 34 caracteres e só sinalizadores (ex.: `{"ligados": ...}`) | **Sem ação:** não carrega texto da pessoa. Um teste vigia que `detail` nunca receba corpo de mensagem. |
| `llm_calls` (`error_message`) | erro técnico do provedor (medido: `User not found.`, `Delay was aborted`) | **Sem ação.** |
| `outbound_copies` | texto enviado **sem `contact_id`**, fora da cascata por desenho (comentário de `lib/retencao/politica.ts`, migration 0587) | **Sem ação aqui:** a `main` já a poda aos 30 dias; não há como ligá-la ao contato. |
| `lgpd_requests`, `send_ledger` | registro legal do próprio pedido; só hash do corpo | **Sem ação, de propósito:** o pedido é o comprovante do direito exercido. |
| `loyalty_ledger` (`reason`) | texto livre de motivo de pontos (0 linhas na instalação medida; a coluna existe) | **Elegibilidade:** contato com linha em `loyalty_ledger` não entra (já é cliente). |

A cascata nova é **um gatilho a mais** no mesmo padrão (função `security definer`, disparo
na virada de `is_anonymized`, idempotente), na mesma migration. Ela também corrige o pedido
formal de privacidade, que hoje deixa esses campos como estão.

## Living System Checklist

- **Quem alimenta:** 1a — evento `lead.lost` (`fn_emit_event_on_lead_change` → `event_log`
  → motor de automação). 1b — a seleção do operador no quadro. Parte 2 — o cron diário
  `data-retention`, lendo `organizations.contact_retention_days`.
- **Quem eu alimento:** 1a/1b — a lista do Inbox (aba "Arquivadas") e a auditoria. Parte 2
  — `storage_redaction_queue` (mídia), as métricas (que seguem somando, porque a linha
  fica) e a tela de Configurações.
- **Registro emitido:** `conversation.archived` por conversa; `lgpd.redact_executed` por
  contato; `retention.contacts_sweep_run` por rodada com efeito.
- **Onde aparece:** aba "Arquivadas" do Inbox (`components/inbox/InboxFilters.tsx`);
  "última rodada" no formulário da organização; regra de automação na tela de automações.
- **Porta:** nenhuma tela nova. A regra vive na tela de automações e o campo no formulário
  da organização; nada entra em `lib/navigation/catalogo.ts`.
- **Anti-morte:** peça de limpeza, não de demanda. A guarda é a condição 5 da
  elegibilidade: contato com cadência, caso ou tarefa abertos nunca é tocado.
- **Configuração:** campo no formulário da organização (ver + mudar + contagem prévia);
  se estiver desligado, a tela diz "nunca eliminar".
- **Continuidade IA↔humano:** a 1a não arquiva conversa `claimed` (humano atendendo) nem
  de contato com outro negócio aberto. Conversa arquivada reabre sozinha, com a IA
  zerada e demanda nova, se a pessoa escrever de novo (`fn_service_inbound`).
- **Laço de retorno:** ver "O que muda quando o expurgo erra".
- **Mapa:** `docs/architecture/` ganha a aresta `lead.lost → archive_conversations` e a
  aresta `data-retention → fn_expurgar_contatos_sem_resposta → fn_lgpd_cascade_redact_contact`.

## Relação com o que já existe e com o que está aberto

- **#1659 (mesclado):** os dois caminhos de anonimizar redigem na mesma função. A Parte 2
  não cria um terceiro; chama essa.
- **Migrations 0432 e 0557 / #1534 (mesclados):** a retenção de mídia é o precedente de prazo
  por organização no formulário da organização, com interruptor. Aqui o interruptor é o
  próprio valor (`null` = desligado), porque não há instalação antiga a preservar.
- **#2508 (aberto):** isolar cada dreno do cron e tirar a varredura de LGPD do alcance da falha
  da poda. A Parte 2 já nasce isolada (passo próprio, `try` próprio) para não depender dele
  nem piorá-lo; se o #2508 mudar o formato do cron, o passo novo acompanha.
- **#2509 (aberto):** `interpretarRetencao` sem teto. O prazo novo traz teto próprio (3650 dias);
  não depende do conserto do #2509, que cobre as variáveis de ambiente.
- **#2140 (mesclado):** quatro drenos novos de retenção, que mostram o formato atual da rota.

## Destino (doutrina de extensões)

**Núcleo.** Pergunta da doutrina: "se nenhuma organização ativar isto, a operação comum
continua inteira?" — sim, nas duas partes: a ação de automação só existe se alguém criar a
regra e o prazo é `null` por padrão. Não é nicho de segmento: retenção e arquivamento
valem para qualquer organização, e mexem em autoridade (anonimização) que extensão não
pode ter.

## Fora desta versão

- Coluna de arquivado no negócio (`crm_leads`) e no contato.
- Aviso prévio por e-mail aos administradores antes da primeira rodada.
- Prazo diferente por origem do contato (prospecção a frio × indicação).
- Eliminar contato bloqueado.
- Desfazer anonimização (continua irreversível, `lgpd_anonymization_irreversible`).

## Valores arbitrados (escolha de projeto, não medição)

- **Piso de 180 dias** do prazo de guarda: pareceu o menor valor em que uma cadência
  de prospecção e uma resposta tardia ainda estão dentro do prazo. Os pisos irmãos são 7 a
  90 dias, mas aqueles apagam cache e rastro técnico; este é irreversível e sobre pessoa.
- **Sugestão de 365 dias** na tela, só como texto de ajuda (o campo vem vazio).
- **Teto de 3650 dias** (dez anos): o menor número "enorme" que nenhum operador precisa ultrapassar e que o Postgres subtrai de `now()` sem erro.
- **Lote de 25** contatos por chamada (justificativa em "Execução").
- **Papel da ação em lote: `agent`**, o mesmo piso de fechar conversa
  (`requireRole("agent")` em `app/api/v1/conversations/[id]/route.ts` e em
  `app/api/v1/leads/bulk/route.ts`), depois de `requireSupportWrite()`; a ação nova entra no
  gate `tests/unit/suporte-cobertura-de-efeitos.test.ts`.

## Plano de prova

- **Banco (`pnpm test:db`):** isolamento entre duas organizações (o expurgo de uma não
  toca a outra, com a organização ligada e a outra desligada); cada exclusão da
  elegibilidade com um contato-controle que **deve** ser eliminado; piso 180 aplicado
  mesmo com valor menor gravado direto; `revoke` do hardening; idempotência da segunda
  rodada; `update.sh` sobre banco com dados.
- **Unitário:** a ação `archive_conversations` — conversa `claimed` intacta, contato com
  outro negócio aberto intacto, evento duplicado sem efeito; coerência de
  `lib/retencao/politica.ts` com a função.
- **Sabotagem:** reverter cada guarda e ver o teste correspondente ficar vermelho.
- **Tela (DoD 12):** instalação fresca estilo VPS, pela interface: ligar o prazo e ver a
  contagem prévia; criar a regra de automação, perder um negócio e ver a conversa ir para
  "Arquivadas"; arquivar em lote pela coluna de perda. Evidência em `evidence/<entrega>/`.
- **Migration:** arquivo versionado + apêndice idempotente no `supabase/baseline.sql` +
  linha `-- manifest:` (número a alocar com `pnpm checar:colisao-de-migration`).
- **Release:** fragmento em `.changes/` (`capacidade_nova`; o texto é nota pública).
- **i18n:** todo texto novo nos idiomas mantidos em `lib/i18n/traducoes/`.
- **Cascata completada (banco):** contato com `cron_jobs` ativo, `lead_state_transitions.reason`, cliques de anúncio e `cron_jobs.payload` encerrado — antes da anonimização com texto, depois sem; e o pedido formal (`POST /api/v1/lgpd/anonymize`) passa a cobrir os mesmos campos.
- **Reabertura (banco):** conversa arquivada de perdido que recebe mensagem posterior ao encerramento volta `open`, com `active_ai_agent_id` nulo e demanda nova; mensagem anterior ao encerramento não reabre.
- **Plano de execução com volume (banco):** `EXPLAIN` da consulta de elegibilidade num banco descartável com dezenas de milhares de contatos, com os dois índices novos presentes, e medição do custo de anonimizar um lote de 25 — fixando o tamanho do lote com dado, não com palpite.
- **Isolamento do cron (unitário):** a função nova que lança não impede `varrerRedacoesIncompletas` nem as podas anteriores de gravarem a própria auditoria; e um valor acima de 3650 ou abaixo de 180 vira o limite, com aviso, no formulário e na função.
