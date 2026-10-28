---
title: "Spec Técnica 31 — Sala escolhida em cada agendamento"
parent: 00-prd-master.md
type: spec
scope: agenda
status: draft
version: 0.1.0
owner: arquitetura
created_at: 2026-10-28
related:
  - ../testing/agendas-de-servicos.md
  - ../agenda-configuracao.md
---

# Spec 31 — Sala escolhida em cada agendamento

Issue: #3067, item 1 (os itens 2 — vários responsáveis — e 3 — participante do grupo com contato
próprio — vêm em PRs seguintes, cada um numa branch nova a partir da `main` depois deste entrar;
o item 4, turma, fica fora).

**O problema, em uma frase:** dois profissionais conseguem marcar a mesma sala física no mesmo
horário, porque o agendamento comum só confere a agenda do próprio profissional, e a agenda de
serviços prende a sala ao tipo de atendimento (todo atendimento do tipo ocupa todas as salas do
tipo, inclusive o online).

**O que muda para quem usa:** ao marcar um atendimento presencial, a pessoa escolhe a sala (ou
"Sem sala"). O sistema recusa a sala se, naquele horário, ela já estiver ocupada por **qualquer**
agendamento da organização — de qualquer profissional, comum ou da agenda de serviços — ou
bloqueada. Sala com capacidade maior que 1 aceita até o limite. Atendimento online não ocupa sala.

## 1. Medições que sustentam a spec

Base: `origin/main` em `f13d26f6b` (27/10/2026 14h26), worktree `.claude/worktrees/agenda-sala`.

### 1.1 Uso real (instalação oficial, 28/10/2026 10h40, contado por organização)

| Organização (8 primeiros) | salas | tipos | tipos de serviço | agendamentos | de serviço | presenciais |
|---|---|---|---|---|---|---|
| 59914589 | 0 | 5 | 0 | 9 | 0 | 0 |
| 043c9d27 | 0 | 3 | 0 | 1 | 0 | 1 |
| 11b020c8 | 0 | 3 | 0 | 0 | 0 | 0 |

Nenhuma sala cadastrada e nenhum tipo de serviço ligado: a coluna nova nasce nula para todo
agendamento existente, sem conversão de dado. A tabela `calendar_resources` e a coluna
`service_occurrence_id` existem na oficial (consulta a `to_regclass` e `information_schema`).

### 1.2 Onde a sala vive hoje (migration 0716, a última definição de cada função)

- `calendar_resources(id, organization_id, name, capacity, is_active, revision)` — `0716:54-63`.
  `name` tem `check(length(trim(name)) between 1 and 80)` (`0716:57`).
- A sala é ligada ao **tipo** em `calendar_service_resources` (`0716:64-72`) e copiada para a
  **ocorrência** em `calendar_service_occurrence_resources` por `fn_calendar_service_occurrence`
  (`0716:587-590`): toda ocorrência consome todas as salas do tipo.
- O consumo é medido só em `fn_calendar_service_check` (`0716:494-509`), que só roda para
  agendamento com `service_occurrence_id` (`0716:715-736`).
- O guarda `fn_calendar_service_appointment_guard` (`0716:679-743`) protege só o profissional
  (`0716:737-741`, `professional_unavailable`). Nunca olha sala.
- Bloqueio de sala já existe: `calendar_service_blocks` com `scope_kind='resource'`
  (`0716:139-161`), lido em `0716:496-497`.
- Todas as funções acima têm a última definição no apêndice do `baseline.sql` **idêntica** à da
  migration 0716 (comparação com espaços normalizados, `rfind`): `fn_calendar_service_check`
  (1 definição), `fn_calendar_service_appointment_guard` (1), `fn_calendar_service_occurrence` (1),
  `fn_appointment_change_core` (5 definições; a última, `baseline.sql:57824`, igual à `0716:759`).
  Nenhuma migration posterior à 0716 as redefine (`grep -l` em `supabase/migrations`).
- `calendar_appointments` não tem coluna de sala (`baseline.sql:15500` + `ALTER` da 0716 em
  `0716:106-121`). `location_kind` tem CHECK `in_person|phone|whatsapp|video_link|google_meet`
  (`baseline.sql:15575`, igual na oficial).

### 1.3 Quem grava agendamento (todas as portas)

`git grep calendar_appointments` em `app lib components hooks scripts curso`: 119 linhas. Escrita
de produção mora em **um** arquivo, `app/api/v1/agenda/agendamentos/_handler.ts`:

| Porta | Linha | Caminho | Conflito hoje |
|---|---|---|---|
| Criar, tipo de serviço | `_handler.ts:348-349` → `fn_appointment_change(create_service_booking)` (pessoa) ou `fn_calendar_service_book[_group]` (agente/token) | serviço | no banco, por profissional e salas do tipo |
| Criar, tipo comum | `_handler.ts:450` (`insert` direto, service role) | comum | `exigeHorarioLivre` (`_handler.ts:431`) — só o profissional (`lib/agenda/consulta.ts:453`, filtro `owner_user_id`) |
| Remarcar, confirmar, desfecho | `_handler.ts:1290` → `fn_appointment_change` | ambos | serviço: no banco; comum: `exigeHorarioLivre` |
| Cancelar | `_handler.ts:709` | ambos | — |

Quem chama esses handlers: a tela (`hooks/agenda/useMarcarAgendamento.ts:48`,
`components/agenda/DetalheDoCompromisso.tsx:105`, `ReservarServicoNaConversa.tsx:67`), a API v1
(`app/api/v1/agenda/agendamentos/route.ts:307-325`) e as ferramentas MCP que o agente de IA usa
(`lib/mcp/tools/agendamento.ts:756`, `:1095`, `:1134`, `:1165`, `:1201`). Fora dele: crons que só
cancelam pendentes vencidos ou carimbam lembrete (`agenda-expira-pendentes/route.ts:131`,
`agenda-reminder/route.ts:729`), a sincronização Google (`fn_google_appointment`, que remarca por
`fn_appointment_change_core` e devolve `overlap` em PT409 — `0716:945-953`) e seeds do curso/E2E.

Nenhuma rota, tela ou ferramenta aceita sala. O único campo parecido é `location_details`, texto
livre de até 300 caracteres (`route.ts:93`, `agendamento.ts:705`).

### 1.4 Telas

- Sala só se cadastra dentro de "Configurar serviço" (`components/agenda/ConfiguracaoDoServico.tsx:193-199`),
  que só abre para tipo com `service_enabled` (`app/app/settings/tenant/agenda/_client.tsx:448`, `:699`).
  Quem não usa a agenda de serviços não tem onde cadastrar sala.
- Marcar: `/app/agenda` (`app/app/agenda/_client.tsx`), painel `components/agenda/PainelDeMarcacao.tsx`
  sem campo de sala; o hook envia `location_details`, nunca `location_kind` nem sala.
- Detalhe: `DetalheDoCompromisso.tsx:168-170` mostra o local; não edita local nem sala.

### 1.5 Trabalho paralelo (28/10/2026, 72 PRs abertos, `gh pr diff` de todos)

Nenhum PR aberto redefine as funções da 1.2. Tocam o mesmo `_handler.ts`: #3465 (lista de espera,
webtecnica) e #3069 (draft, vitorlacerdadigital) — conflito de texto possível, sem conflito de
regra. Nenhuma issue aberta além da #3067 pede sala; ninguém além de nós assumiu o item 1
(comentários de 28/10 10h22 e 10h23).

## 2. Escopo

**Dentro:** coluna de sala no agendamento; conferência da sala na organização inteira, no banco,
para os dois caminhos (comum e serviço) e nos dois sentidos; escolha da sala ao marcar e troca de
sala no detalhe; cadastro de sala fora da agenda de serviços; API v1 e ferramentas MCP aceitando a
sala; conserto do teto do nome da sala (80 no banco, 100 na API).

**Fora (declarado):** tipo de local por agendamento (presencial num dia, online no outro, no mesmo
tipo — hoje o local vem sempre do tipo, `_handler.ts:465`, `0716:644`); mudar o comportamento das
salas presas ao tipo na agenda de serviços (continuam valendo como hoje); sala nos eventos que vêm
do Google (ver 3.6); vários responsáveis (PR 2); participante com contato próprio (PR 3); turma.

## 3. Desenho

### 3.1 Banco — uma coluna, nenhuma tabela nova

Migration nova (número por `pnpm checar:colisao-de-migration`; hoje a 0810 está livre em main +
PRs abertos) e apêndice idêntico no `baseline.sql`:

```sql
alter table public.calendar_appointments add column if not exists resource_id uuid;
-- FK composta: a sala é da mesma organização do agendamento (o padrão das FKs da 0716).
-- on delete restrict: sala com agendamento não some; desativar é o caminho (is_active).
-- CHECK: só atendimento presencial ocupa sala.
create index if not exists calendar_appointments_resource_time_idx
  on public.calendar_appointments(organization_id, resource_id, starts_at, ends_at)
  where resource_id is not null and status in ('pending','confirmed');
```

Sem tabela nova: nenhuma política nova, nenhuma linha nova na varredura de RLS, nenhum par
`organizations`↔`user_organizations` para a cerca de junção falsa. A coluna herda a RLS e as
políticas restritivas de `calendar_appointments`. Id de sala não é dado pessoal: a anonimização não
muda.

O teto do nome: o CHECK do banco fica em 80 (não se encolhe vocabulário nem regra existente); a
API (`servicos/route.ts:26`) e a RPC `fn_calendar_service_resource` (`0716:1046`) passam a 80.

### 3.2 A regra da sala, num lugar só

Função nova `fn_calendar_resource_occupied(p_org, p_resource, p_start, p_end, p_ignore_appointment,
p_ignore_occurrence)` — `security definer`, `revoke … from public, anon, authenticated`,
`grant … to service_role` — devolve o **pico** de unidades ocupadas na janela, somando:

1. agendamentos com `resource_id = p_resource`, `status in ('pending','confirmed')`, que cruzam a
   janela (cruzamento estrito: encostar não ocupa), contando **uma vez por ocorrência coletiva**
   (participantes da mesma turma dividem a sala) e uma vez por agendamento comum;
2. ocorrências de serviço que seguram a sala pelo tipo (`calendar_service_occurrence_resources`,
   com as `units` delas), como a 0716 já mede;
3. sem dupla contagem quando o mesmo agendamento entra pelos dois lados.

O pico usa a mesma varredura de intervalos da 0716 (`0716:499-507`): consultas disjuntas não se
somam.

Recusa (`PT409`, motivo `resource_unavailable`, já traduzido em `lib/agenda/servicos/motivos.ts`):
sala inativa, sala com bloqueio ativo na janela, ou `pico + 1 > capacity`.

### 3.3 Onde a regra roda

- **Guarda** `fn_calendar_service_appointment_guard`: para todo INSERT/UPDATE que deixa a linha
  ativa com `resource_id` não nulo e muda horário, sala, status ou ocorrência, chama a regra sob a
  trava que já existe por organização (`fn_calendar_service_lock`, `0716:700`). Assim duas marcações
  simultâneas da mesma sala têm um vencedor só, e vale para **todas** as portas da 1.3 — tela, API,
  agente, MCP, Google — porque todas gravam nesta tabela.
- **Serviço** `fn_calendar_service_check`: o laço de salas do tipo (`0716:494-509`) passa a somar
  também os agendamentos que escolheram aquela sala (item 1 da 3.2). Sem isso, a agenda de serviços
  ofereceria um horário que o guarda recusaria depois.
- **Troca de sala** `fn_appointment_change_core`: aceita `resource_id` no patch (inclusive `null`
  para "Sem sala"); o guarda revalida. Mudança única na função: uma linha no `update … set`.
- O caminho comum (`_handler.ts:450`) grava `resource_id` no insert; a recusa do banco vira 409 com
  a mensagem da sala, sem novo SELECT prévio que pudesse divergir da regra.

As três funções são redefinidas inteiras na migration nova e no apêndice (a cópia do corpo da 0716
com a mudança), para a cerca `apendice-do-baseline-nao-diverge-da-cadeia`.

### 3.4 API e ferramentas

- `POST /api/v1/agenda/agendamentos`: `resource_id: uuid` opcional; `PATCH`: `resource_id: uuid |
  null` opcional (entra no `refine` de "pelo menos um campo").
- Sala inexistente, de outra organização ou com local não presencial: 422 antes do banco; corrida
  perdida: 409 `resource_unavailable`.
- `GET /api/v1/agenda/salas?de&ate[&ignorar]`: lista as salas ativas da organização com `livre`
  para a janela (mesma função da 3.2, por RPC); sessão, papel `viewer`. Bearer segue o padrão da
  casa: entra em `public-paths` só se a rota for de leitura com escopo `mcp:read`, e aplica
  `tetoDeEscritaDoToken` se tiver escrita (não tem).
- MCP: `crm_book_appointment` e `crm_find_and_book_appointment` ganham `resource_id` opcional;
  `crm_list_event_types` não muda. **O prompt do agente não muda**: o agente só escolhe sala se o
  operador o instruir; sem sala, o comportamento é o de hoje.
- Audit: as ações existentes (`agenda.appointment_created`, `agenda.appointment_updated`,
  `_handler.ts:356`, `:497`, `:665`, `:672`) ganham `resource_id` no `metadata`; troca de sala é
  `agenda.appointment_updated`. Cadastro de sala segue `agenda.service_resource` (já auditado).

### 3.5 Telas

- **Salas da organização:** seção "Salas" em `/app/settings/tenant/agenda` (mesma rota, sem rota
  nova nem entrada nova no catálogo), para gerente, usando o `POST /api/v1/agenda/servicos`
  `action: "resource"` que já existe. Mostra nome, capacidade, ativa.
- **Marcar** (`/app/agenda`): quando o tipo é presencial e a organização tem sala ativa, o painel
  mostra "Sala" com "Sem sala" mais as salas, cada uma com "ocupada" desabilitada para o horário
  escolhido (leitura da 3.4). Sem sala cadastrada, nada aparece.
- **Detalhe:** mostra a sala; quem pode editar o agendamento troca a sala.
- Textos novos em `lib/i18n/agenda-servicos.ts` com `es`. A chave "recursos" de
  `agenda-configuracao.ts:11` **não muda** (o e2e `agenda-servicos.spec.ts:239` lê o texto exato).

### 3.6 Limites declarados

- Compromisso marcado direto no Google Agenda **é sincronizado**, mas como ocupação do
  profissional: `calendar_external_events` guarda título, início, fim, situação e se ocupa o horário
  (`baseline.sql:15793-15815`, mais `ical_uid`, `seen_generation`, `recurring_event_id`,
  `original_start_time`) — não guarda o local do evento, e o local do Google é texto livre. Esse
  compromisso bloqueia o profissional (como hoje), não a sala.
- A grade de horários livres continua por profissional; a sala é conferida na escolha e na gravação.
  Um horário livre para o profissional pode ter todas as salas ocupadas — a tela mostra isso na lista
  de salas, e o banco recusa se alguém insistir.
- Agendamentos existentes nascem sem sala; sobreposições antigas não são reclassificadas.

## 4. LGPD

`resource_id` não identifica pessoa; o nome da sala é dado da organização. Anonimizar o contato
não precisa apagar a sala (o gatilho redige `title, description, notes, location_details,
cancellation_reason` e continua assim). O export do titular já leva o agendamento; a sala vai como
id, sem decisão nova.

## 5. Testes (o veredito é o CI do fork)

Invariantes, **arquivo novo** `tests/invariants/agenda-sala-por-agendamento.test.ts` (Postgres real):

1. Dois profissionais, mesma sala, mesmo horário, caminho comum: o segundo recebe 409
   `resource_unavailable`.
2. Mesma sala, horários que só encostam: os dois entram.
3. Sala de capacidade 2: o terceiro é recusado.
4. Turma de serviço coletiva numa sala: três participantes ocupam uma vez; um agendamento comum na
   mesma sala e horário é recusado.
5. Sala presa ao tipo (comportamento da 0716) + agendamento comum que escolheu a mesma sala: a
   agenda de serviços passa a ver a sala ocupada.
6. Sala bloqueada e sala inativa: recusa.
7. Corrida: duas transações pela mesma sala, um vencedor.
8. Remarcar para cima de uma sala ocupada: recusa; trocar para "Sem sala": aceita.
9. Duas organizações: sala de outra organização recusada pela FK; leitura `authenticated` não vê a
   coluna do vizinho; a leitura de salas livres não atravessa organização.
10. Local não presencial com sala: recusado pelo CHECK.

Unidade: schemas da rota (`resource_id` opcional/nulo), mapeamento do 409, a leitura de salas.
E2E: spec nova `tests/e2e/agenda-sala-por-agendamento.spec.ts` (cadastra sala, marca com dois
profissionais na mesma sala, a segunda tela mostra "ocupada"), registrada em `SPECS_PARTE_N`.

Sabotagem prevista no PR: tirar a chamada da regra no guarda → casos 1, 3, 4, 7, 8 vermelhos;
tirar a soma da 3.2 item 1 em `fn_calendar_service_check` → caso 5 vermelho.

Cercas que esta mudança aciona e como cumpre: tripla de migration (`-- manifest:` + apêndice no
mesmo commit); apêndice igual à migration e à cadeia; `vocabulario-banco-x-typescript` (sem CHECK
de conjunto novo); i18n espanhol; `rotas-bearer-aplicam-teto-de-escrita`; `audit-resource-id-e-uuid`;
`hardening-definer-varredura` (revoke das duas origens). Nenhum invariante existente é editado.

## 6. Decisões

- Sala é por agendamento, conferida na organização inteira, no banco (Paulo, 28/10/2026 10h45:
  "a reserva teria que ser feita a verificação em todas as agendas").
- Uma coluna em vez de tabela de ligação: um agendamento ocupa no máximo uma sala; tabela nova
  custaria RLS, prova própria e edição de invariante existente, sem caso real que peça duas salas.
- Salas presas ao tipo continuam valendo (compatibilidade com quem já configurou a 0716).
- O agente não ganha instrução nova neste PR.

## 7. Sistema vivo — checklist

- Nada é ilha: a sala ocupada aparece na tela de marcar e no detalhe; a recusa diz qual sala.
- Log visível: criação e troca de sala no audit existente.
- Configuração com superfície: cadastro de sala na tela de tipos, sem depender da agenda de serviços.
- Todo laço se fecha: sala desativada some da escolha e continua no agendamento antigo.

## 8. Entrega

Branch `feat/agenda-sala-por-agendamento` a partir da `main` do Rafael; PR interno no fork para o
CI; depois PR ao Rafael com `Refs #3067` (fecha só o item 1). Fragmento `.changes/` com
`capacidade_nova`. Destino: núcleo (a agenda é núcleo; sem sala cadastrada, nada muda para ninguém).

## 9. Não medido

- Tempo da conferência com muitas salas e agendamentos (o índice parcial da 3.1 é o que o sustenta).
- O comportamento do Google quando a remarcação remota cai numa sala ocupada foi lido no código
  (`0716:945-953`, `overlap`), não executado.
