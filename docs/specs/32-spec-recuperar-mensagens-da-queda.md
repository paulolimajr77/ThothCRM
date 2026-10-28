---
title: "Spec Técnica 32 — Quando o número volta de uma queda, as conversas do período entram sozinhas (só de quem já tem ficha)"
parent: 00-prd-master.md
type: spec
scope: canais (WAHA), importação do histórico, Central
status: draft
version: 0.2.0
owner: arquitetura
created_at: 2026-10-28
related:
  - 28-spec-status-do-whatsapp-nao-volta.md
---

# Spec 32 — Quando o número volta de uma queda, as conversas do período entram sozinhas

Status: **PROPOSTA**. O código citado é o da `main` em `f13d26f6b` (28/10/2026). O estado foi
medido nesse dia numa instalação em produção, só com leitura, sempre filtrando por
`organization_id`, numa organização com um número WAHA ativo.

## O problema, em duas frases

1. Quando o número cai (a conexão vai para `FAILED` e só volta com QR novo), a empresa continua
   atendendo pelo celular. Nada do que entra ou sai nesse período chega ao CRM, nem depois que o
   número volta. O servidor do canal tem essas mensagens, mas ninguém as busca.
2. A importação do histórico, que já existe, busca essas mensagens, mas só quando alguém aperta o
   botão. E ela traz **todo mundo**: cria ficha para cada número que falou com o celular. Quem quer
   só completar as conversas dos clientes do CRM não tem essa opção.

## O que foi medido

### No banco (uma organização, últimos 30 dias, 28/10/2026)

| # | Medição | Resultado |
|---|---|---|
| B1 | Saídas de `WORKING` do número, pelo par de `channel_session.status_changed` (`from_status = 'WORKING'` até o próximo `to_status = 'WORKING'`) | 147: **142 com menos de 10 s**, 3 entre 10 s e 1 min, **2 de cerca de 24 h** |
| B2 | As 2 quedas longas | As duas passaram por `FAILED → STOPPED → STARTING → SCAN_QR_CODE` e só voltaram com QR novo |
| B3 | Mensagens no CRM durante a queda mais recente (24 h) | **0** |
| B4 | Mensagens no servidor do canal no mesmo período (lidas pela API do WAHA: lista de chats, depois as últimas 100 mensagens de cada chat com atividade) | **pelo menos 7 conversas e 26 mensagens**: 16 recebidas e 10 mandadas pelo aparelho. 6 das 7 pessoas já tinham ficha viva no CRM |
| B5 | Mensagens recebidas pelo webhook com atraso (`created_at − sent_at`), fora as importadas | 741, todas abaixo de 5 s. Nenhuma chegou atrasada depois dos 142 reinícios curtos |
| B6 | Prévia da importação de 30 dias, pela tela, na mesma conexão | "Pelo menos 225 conversas, 186 mensagens, 1 áudio e 9 imagens", porque inclui quem não tem ficha |
| B7 | Configuração da sessão no WAHA | `noweb.store = { enabled: true, fullSync: true }` ("Guardar o histórico anterior à vinculação" ligado) |

Leitura: a queda que perde mensagem é a **longa**, que termina em novo pareamento (B1–B3). O
reinício de segundos não deixou rastro de perda (B5). Recuperar só as fichas do CRM teria trazido
as 26 mensagens de 6 conversas, e não as 225 conversas da importação inteira (B4, B6).

### No código

| # | Fato | Onde |
|---|---|---|
| C1 | A importação tem os estados `previa → rodando → concluida \| erro \| cancelada`; a rota só muda estado e o cron anda uma rodada por minuto | `app/api/v1/channel-sessions/[id]/historico/route.ts`; `app/api/v1/cron/historico-import/route.ts`; `lib/channels/historico/rodada.ts` |
| C2 | O pedido só aceita `dias ∈ {30, 90, 180, 365}`. A janela é "de `desde` até agora": não há fim (`até`) nem filtro de quem entra. O banco repete a regra no CHECK `dias in (30, 90, 180, 365)` | Zod `corpo` na rota; `importacoes_de_historico` no `supabase/baseline.sql`; `rodada.ts` (`desde: ... - imp.dias * SEGUNDOS_POR_DIA`) |
| C3 | Para cada chat, a rodada chama `fn_upsert_wa_contact`, que acha a ficha por `wa_lid` e depois pelo telefone (com e sem o nono dígito) e, **se não acha, cria** a ficha (`source = 'whatsapp'`) | `rodada.ts`, `garantirContatoEConversa` |
| C4 | Antes de gravar, a rodada pergunta `fn_titular_apagado_a_pedido` e pula a conversa de quem pediu apagamento | `rodada.ts` |
| C5 | Mensagem importada leva `metadata.historico_importado = 'true'`, e a migration 0760 corta por essa chave: não reabre conversa, não abre demanda, não emite `message.received`/`message.sent`/`message.outbound`, não chama IA | `lib/channels/historico/mapear.ts`; bloco da 0760 no `baseline.sql`; cerca `tests/invariants/historico-importado-nao-dispara.test.ts` |
| C6 | Mensagem repetida não entra duas vezes: a rodada consulta antes de gravar as grafias candidatas do `external_id` (ver C19), e `messages_org_external_id_unique (organization_id, external_id)` pega a corrida | `mapear.ts`; `supabase/baseline.sql` |
| C7 | Só uma importação `rodando` por conexão: índice único parcial `importacoes_de_historico_uma_rodando_idx` | `supabase/baseline.sql` |
| C8 | A troca de status grava `channel_sessions.status` e o gatilho emite `channel_session.status_changed` com `from_status`/`to_status`. **Nenhum código consome esse evento**: ele nasce `done`, na lista de "registro" | `lib/waha/ingest.ts` (`handleSessionStatus`); `fn_emit_channel_session_status_changed`, `fn_event_log_e_registro` no baseline; `git grep -n "channel_session.status_changed" origin/main -- lib app workers docker` não devolve nada |
| C9 | O que reage hoje à volta do número não busca mensagem: fecha o aviso da Central (`sincronizarSaudeDaConexao`), reenvia saídas `queued` (`session-reconciler.ts`) | `lib/channels/health.ts`; `lib/agent-engine/edge/crm/session-reconciler.ts` |
| C10 | `last_status_change_at` é regravado por várias rotas (reconectar, varredura de saúde). Não serve para saber "fora desde quando" | `app/api/v1/cron/channel-health/route.ts`, rotas de `channel-sessions` |
| C11 | Achar a ficha pelo telefone **sem criar**: `encontrarContatoPorTelefone` (variantes, `is_merged_into is null`; ver C16). Para chat `@lid` sem telefone, a rodada já tem `resolvePhoneForLid` | `lib/channels/contato-por-telefone.ts`; `rodada.ts` |
| C12 | Avisos da Central têm `kind` num CHECK único (`agent_inbox_items_kind_check`) | `supabase/baseline.sql` |

### Achados de código da revisão (conferidos)

| # | Fato | Onde |
|---|---|---|
| C13 | O CHECK de status só aceita `previa \| rodando \| concluida \| erro \| cancelada`; o índice único só cobre `rodando`; o cron só anda linhas `rodando`; o GET da tela lê só a importação mais recente da conexão | `supabase/baseline.sql` (`importacoes_de_historico`, `importacoes_de_historico_uma_rodando_idx`); `app/api/v1/cron/historico-import/route.ts`; `historico/route.ts` (GET) |
| C14 | O corte da 0760 também tira o `message.received` que alimenta o follow-up de silêncio e a resposta de campanha; a detecção de "PARE" mora no pós-entrada (`lib/channels/pos-entrada.ts`), que a rodada não chama | comentário do bloco 0760 no baseline; `lib/channels/historico/rodada.ts` (cabeçalho) |
| C15 | `fn_upsert_wa_conversation_importada` devolve a conversa existente **intocada**: nem `last_message_at`, nem não lidas, nem dono | `supabase/baseline.sql` |
| C16 | `encontrarContatoPorTelefone` ignora o erro da consulta (erro vira "sem ficha") e não filtra `is_anonymized`; a trava de LGPD da rodada falha fechada | `lib/channels/contato-por-telefone.ts`; `rodada.ts` |
| C17 | Logo depois de um pareamento novo, `resolvePhoneForLid` devolve `null` (a tabela de `@lid` do canal é povoada por atividade) | `lib/waha/client.ts` |
| C18 | A varredura de saúde também grava `status` (a cada 5 min), e o gatilho emite o evento nesse momento. Outros escritores (redes sociais, voz) emitem o mesmo evento | `app/api/v1/cron/channel-health/route.ts`; `docker/scheduler/entrypoint.sh`; `lib/channels/social/store.ts`; `app/api/v1/voice/sessions/pair/route.ts` |
| C19 | O `external_id` do acervo não é idêntico ao do webhook (o sufixo muda). Quem evita a repetição é a consulta por candidatos antes de gravar; o índice único é `DEFERRABLE` e só pega a corrida | `mapear.ts`; `rodada.ts` (`gravarMensagens`) |
| C20 | Avisos da Central: `kind` num CHECK único reconstruído por migration (cerca `tests/unit/kind-check-migration-x-baseline.test.ts`), política por kind em `POLITICAS_DE_AVISO` (completude cobrada na compilação), texto em `lib/ai/agent-inbox-copy.ts`; deduplicação por índice único parcial `(organization_id, kind, ref_id) where status='open'`; o destino vem de `ref_kind` (conexão leva à tela de Conexões, só admin) | `lib/ai/inbox-destino.ts`; `supabase/baseline.sql` |

## O que muda

### 1. A importação ganha "só contatos do CRM" e uma janela com fim

- **Escopo** novo: `todos` (o de hoje) ou `so_crm`. Ele é escolhido na ação `previa` e vale para a
  `importar` dessa mesma linha.
- Com `so_crm`, a conversa do canal só entra se o chat casar com uma **ficha viva** da organização:
  `is_merged_into is null`, `is_anonymized = false` e sem pedido de apagamento (C4).
  - O casamento usa, nesta ordem: o `wa_lid` da ficha; o telefone do chat; os telefones que as
    próprias mensagens trazem (`remoteJidAlt`); `resolvePhoneForLid` (que pode estar vazio logo
    depois de um pareamento novo, C17). Telefones comparados com as variantes do nono dígito.
  - **Falha fechada:** erro na consulta da ficha para a rodada com `erro` (como a trava de LGPD),
    nunca vira "sem ficha" (C16).
  - Não cria ficha e não altera a ficha achada (nem nome, nem `source_metadata`). Chat sem ficha
    conta em `mensagens_ignoradas`.
- **Janela com fim:** a importação passa a ter `desde` e `ate`. A manual continua "de N dias até
  agora" (`dias` preenchido, `desde`/`ate` vazios). A automática (item 2) usa `desde`/`ate` e deixa
  `dias` vazio. O CHECK passa a ser: `(dias in (30, 90, 180, 365) and desde is null and ate is null)
  or (dias is null and desde is not null and ate is not null and desde < ate)`. A rodada não grava
  mensagem fora da janela.
- **Prévia:** respeita o escopo. Com `so_crm`, conta só o que casaria; a resolução de `@lid` gasta
  do mesmo teto de chamadas da prévia (100).
- **Tela:** opção **"Só contatos do CRM"**, ligada por padrão; a prévia mostra o número do escopo
  escolhido.
- Repetida não entra (C19); grupo e status ficam fora; só imagem e áudio baixam; só administrador
  inicia a manual.

### 2. Volta de uma queda dispara a recuperação sozinha

- **Queda** = o par de `channel_session.status_changed` de uma conexão `provider = 'waha'`: saída
  (`from_status = 'WORKING'`) e a próxima volta (`to_status = 'WORKING'`). Nunca
  `last_status_change_at` (C10).
  - Só vale se os dois eventos trazem o **mesmo `phone_number`**. Se o número mudou no
    pareamento novo, não importa nada e abre o aviso do item 3 ("o número da conexão mudou").
  - Só queda de **5 minutos ou mais** (B1, B5).
  - Os eventos podem vir do webhook ou da varredura de saúde, que tem até 5 minutos de atraso
    (C18). Por isso a janela começa **10 minutos antes** do evento de saída e termina **5 minutos
    depois** do evento de volta.
  - Quedas cujas janelas se sobrepõem viram **uma** importação com a janela unida.
  - Queda sem volta ainda não dispara nada. Conexão arquivada ou empresa parada (o cron já pula
    `STATUS_OPERANTE`) não dispara.
- **Quando:** na primeira passada do agendador depois do evento de volta. O sistema olha para trás
  até **7 dias** no `event_log`; queda mais antiga que isso não é recuperada sozinha.
- **Uma por queda, garantido no banco:** a importação da queda guarda o id do evento de saída que a
  abriu, com índice único. Duas passadas ao mesmo tempo não criam duas.
- **Espera:** estado novo **`aguardando`** (troca do CHECK, de `StatusDaImportacao` em `rodada.ts`
  e das transições da rota). A importação da queda nasce `aguardando` e o cron a passa para
  `rodando` quando não houver outra `rodando` na conexão (C7). `cancelar` aceita `aguardando`. A
  tela mostra a manual em curso e, separada, a recuperação que espera; a da queda **não** esconde a
  manual (C13).
- Conexão com "Guardar o histórico" **desligado**: não há o que buscar. Nenhuma importação; abre o
  aviso do item 3 com o motivo.
- Escopo sempre `so_crm`. Origem gravada `queda` (as que existem viram `manual`).

### 3. A mensagem recuperada tem o efeito de "o cliente respondeu", sem resposta automática

A 0760 corta tudo de uma importação de meses (C5, C14). Para a recuperação de uma **queda**
(`origem = queda`), as mensagens **recebidas** passam a ter o efeito de uma resposta real, menos o
que responderia sozinho:

| Efeito | Na recuperação da queda |
|---|---|
| Detecção de "PARE" (`lib/opt-out/deteccao.ts`, a mesma regra da ingestão) | **roda**; bloqueia como na ingestão |
| Follow-up de silêncio e régua de campanha param, porque o cliente respondeu | **sim** |
| A conversa já existente sobe na caixa de entrada: `last_message_at`, prévia e não lidas, se a mensagem recuperada for mais nova que a última da conversa | **sim** (sem mexer em dono nem status; a conversa que não existia nasce como hoje, C15) |
| IA responde, roteador, demanda nova, webhook de saída, push | **não** |

A importação **manual** fica como hoje (corta tudo). O contrato pede o efeito; quem dispara cada
um (função existente ou corte condicional na 0760) é escolha da implementação.

### 4. Quem precisa saber fica sabendo, e o laço se fecha

Dois `kinds` novos na Central, cada um no CHECK único, em `POLITICAS_DE_AVISO` e em
`agent-inbox-copy.ts` (C20):

- **Resumo da recuperação** (`ref_kind = channel_session`, ref = a conexão; vai para o
  administrador, como os outros avisos de conexão). Um aberto por conexão: nova queda com o aviso
  ainda aberto **atualiza** o mesmo aviso, não cria outro. Textos:
  - concluída com mensagens: "Recuperamos N mensagens de M conversas do período em que o número
    ficou fora (<início> a <fim>)";
  - terminou em `erro`: "A recuperação das conversas da queda parou: <erro resumido>", com o atalho
    para retomar;
  - acervo desligado ou número mudou: o motivo, sem importação.
  - Concluída com 0 mensagens: nenhum aviso. Fecha quando o administrador o resolve, ou sozinho
    quando a retomada conclui.
- **Cliente sem resposta na queda** (`ref_kind = conversation`, ref = a conversa; vai para quem
  atende a conversa, como os avisos de conversa). Um por conversa cuja última mensagem recuperada é
  do cliente e não tem resposta depois dela. Fecha sozinho quando sai uma resposta na conversa.

Audit: o início automático grava `channel.historico_import_started` com ator sistema e
`origem = queda`; o fim já é auditado pelo cron.

Schema: colunas novas de `importacoes_de_historico` (`escopo`, `origem`, `desde`, `ate`, id do
evento da queda com índice único), o novo CHECK de `dias`, o estado `aguardando` e os dois `kinds`
saem como migration nova, apêndice idempotente no `supabase/baseline.sql` e linha `-- manifest:`.
As importações que já existem ficam `escopo = todos`, `origem = manual`. Número da migration por
`pnpm checar:colisao-de-migration`. Fragmento em `.changes/`.

## Fora desta spec (de propósito)

- Trazer quem não tem ficha na recuperação automática.
- A IA responder mensagem antiga.
- Meta e Zernio (não têm importação do histórico).
- Queda que voltou antes de qualquer registro de status (sem o par de eventos, não há o que medir).
- Evitar a queda em si.
- Vídeo, documento e figurinha antigos.

## Como provar

Cada caso com a sabotagem que o deixa vermelho.

- **Escopo `so_crm` (unidade da rodada, canal simulado):** chats que casam por telefone, por `@lid`
  com `wa_lid` da ficha e por `remoteJidAlt` entram; chat sem ficha, de ficha mesclada, anonimizada
  ou com pedido de apagamento não entra; nenhuma ficha é criada nem alterada. *Sabotagem:* chamar
  `fn_upsert_wa_contact` em `so_crm` (nasce ficha); tirar o filtro de `is_anonymized`.
- **Falha fechada:** a busca da ficha devolve erro → a rodada termina em `erro`, nenhuma mensagem
  pulada em silêncio. *Sabotagem:* usar `encontrarContatoPorTelefone` como está.
- **Janela:** mensagem depois de `ate` não entra. *Sabotagem:* ignorar `ate`.
- **Prévia `so_crm`:** com 3 chats e 1 ficha, a prévia conta 1. *Sabotagem:* contar todos.
- **Disparo:** par com 4 min → nada; 6 min → 1 importação `aguardando` com a janela certa; o mesmo
  par em duas passadas simultâneas → 1 (índice único). Par com `phone_number` diferente → nada e 1
  aviso. Evento de conexão `zernio_social` → nada. *Sabotagem:* usar `last_status_change_at`; tirar
  o índice único; tirar o filtro de provedor.
- **Espera:** com uma manual `rodando`, a da queda fica `aguardando`, a tela segue mostrando a
  manual, e a da queda começa quando a manual termina. *Sabotagem:* criar a da queda como `previa`.
- **Efeitos da queda:** mensagem recuperada "PARE" bloqueia o contato; mensagem recuperada para o
  follow-up de silêncio pendente; a conversa existente sobe e ganha não lida; a IA não é chamada.
  *Sabotagem:* deixar o corte da 0760 igual para `origem = queda` (o follow-up sai).
- **Avisos:** concluída com mensagens → 1 resumo; segunda queda com o resumo aberto → o mesmo aviso
  atualizado; `erro` na primeira rodada → aviso de erro; conversa com cliente sem resposta → 1
  aviso dela, que fecha quando sai resposta. *Sabotagem:* não emitir aviso em `erro`.
- **Banco (`tests/invariants`):** a importação manual continua sem emitir evento (cerca da 0760);
  sessão de A não importa nada para B (guarda de isolamento).
- **Tela (Playwright):** "Só contatos do CRM" vem ligada e a prévia muda de número ao desligar.
- **Prova real (receiver real):** derrubar a conexão de teste por mais de 5 minutos; pelo aparelho,
  trocar mensagens com um contato que tem ficha e outro que não tem; reconectar. Em alguns minutos
  as do primeiro aparecem na conversa dele, as do segundo não, e a Central mostra o resumo.

## Destino

**Núcleo.** Conexão de WhatsApp e histórico servem a todo nicho, e só o núcleo vê a troca de status
do canal. Régua: se nenhuma organização tiver queda, nada muda.

## Perguntas ao mantenedor

1. O disparo fica no cron `historico-import` (que já roda a cada minuto e lê o `event_log`), ou
   vira consumidor de `channel_session.status_changed`? A segunda opção exige tirar o evento da
   lista de registro (`fn_event_log_e_registro`), onde ele nasce `done`.
2. "Só contatos do CRM" ligado por padrão muda a importação manual para quem já usava. De acordo?
