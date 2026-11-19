---
title: "Spec Técnica 35 — Pacotes de sessões: vender, marcar e dar baixa sem controle paralelo"
parent: 00-prd-master.md
type: spec
scope: módulo opcional novo (pacotes), agenda (duas portas de tela), agente (ferramentas do módulo)
status: draft
version: 0.2.0
owner: arquitetura
created_at: 2026-11-13
related:
  - modulos-dados-declarados-v1.md
  - ../adr/0002-tabelas-de-modulo-num-banco-so.md
---

# Spec 35 — Pacotes de sessões: vender, marcar e dar baixa sem controle paralelo

Status: **PROPOSTA**. O código citado é o da `main` em `9d07be6bd`. O uso real foi medido, só com
leitura, no sistema de agenda que uma clínica de saúde usa hoje.

## O problema, em duas frases

1. Clínica que vende **pacote de sessões** (algumas sessões pagas de uma vez, com desconto) não
   tem onde registrar isso aqui: não há pacote, saldo, nem a ligação "esta sessão é a 3 de 5". O
   agente de IA marca a sessão, mas não sabe se a pessoa tem pacote, quantas sobram, nem quando
   oferecer a renovação.
2. O único contorno é um funil com campos à mão ("compradas", "usadas"), e a baixa de cada sessão
   depende de alguém lembrar. É o controle paralelo que a clínica já tem hoje.

## Quem usa isto

Material público de fornecedores de agenda para clínicas cita como usuários de pacote:
fisioterapia (com o exemplo de 10 sessões), estética, saúde mental e terapia, massagem,
quiropraxia, pilates e personal. Fontes: [Jane](https://jane.app/features/packages-and-memberships),
[Pabau](https://pabau.com/blog/pelvic-floor-therapy-pricing-strategy-packages-vs-per-session/),
[Clinic1st](https://www.clinic1st.com/clinic-prepaid-packages-billing/),
[AdvisoryApps](https://advisoryapps.com/modules/session-package). Não existe levantamento público
com número por especialidade: é uma lista de exemplos, não um ranking.

## O que foi medido

### No uso real (uma clínica, só leitura)

| # | Medição | Resultado |
|---|---|---|
| U1 | Cadastro de pacotes | Poucos pacotes, de poucas sessões cada. Cada um tem nome, referência, preço, desconto calculado contra a soma das sessões avulsas, validade em dias (vazia em quase todos) e o serviço que ele cobre |
| U2 | Venda | O pacote é uma **venda separada** da sessão, com código próprio. A sessão continua com o preço do serviço avulso e sem data de pagamento |
| U3 | Quando o pacote nasce | Semanas depois da 1ª sessão. A recepção escreve um lembrete na nota da 1ª sessão para emitir o pacote |
| U4 | O que a agenda mostra | Cada sessão do pacote leva o contador **n/N** e o código do pacote, no cartão e no detalhe. Sessão avulsa não leva nada |
| U5 | Saldo | Em toda linha olhada do relatório de pacotes, "quantidade disponível" é igual à "emitida", inclusive em pacotes antigos: **o saldo nunca desce**. O que a clínica usa de fato é o contador n/N e a venda registrada |
| U6 | Quem compra e quem usa | O relatório separa "cliente que comprou" de "cliente a utilizar" |
| U7 | Volume | Centenas de pacotes por ano numa única clínica |

### No código

| # | Fato | Onde |
|---|---|---|
| C1 | Não existe pacote de sessões: nenhuma tabela, ferramenta ou tela. "Pacote" no código é grupo de ferramentas do agente | `lib/mcp/tools/pacotes.ts:1-12`; nenhuma tabela de pacote, saldo, crédito ou voucher em `supabase/` |
| C2 | O preço de um item vendável mora no catálogo. Decisão do mantenedor registrada em comentários de 08/11/2026: serviço vira módulo opcional, item segue no catálogo com o próprio preço, o Tipo de agendamento não muda e a agenda não lê preço do catálogo | `supabase/baseline.sql:17735` (`catalog_products`); comentários do mantenedor nas issues #2497 e #3372; base em #3480 (aberto) |
| C3 | Módulo opcional com dados cria as tabelas por função provisionadora fixa, só onde é instalado, e se registra em duas listas | ADR-0002 D2 e D3 (`docs/adr/0002-tabelas-de-modulo-num-banco-so.md:75`, `:82`); `lib/instalacao/modulos.ts:51` (`MODULOS_OPCIONAIS`) e `:88` (`MODULOS_DE_TABELA`) |
| C4 | Precedentes de ligação entre módulo e núcleo: a comanda aponta para o compromisso; e uma coluna do núcleo que aponta para tabela de módulo fica sem FK onde o módulo não está, e a provisionadora devolve a FK | `supabase/migrations/20260920002100_0351_comanda_e_financeiro.sql:39` (`sales.appointment_id`); `supabase/migrations/20261009113329_0619_provisionadora_do_financeiro.sql:1`, `:34-37` (`financial_entries.sale_id`) |
| C5 | O compromisso não tem campo livre para módulo pendurar dado (nenhuma coluna `metadata`) | colunas de `calendar_appointments` em `supabase/baseline.sql` (criação em `:15677` e apêndices) |
| C6 | Precedente de ferramenta do agente que só existe com o módulo instalado, dentro de um grupo de ferramentas | `lib/mcp/tools/catalogo/honorarios.ts:24-36` (`modulo: "honorarios"`, `pacotes: ["atender"]`); `lib/mcp/tools/honorarios.ts:4-17` |
| C7 | Teto de ferramentas por agente | `lib/mcp/tools/selecao-por-pacote.ts:83` (`TETO_TOOLS_POR_AGENTE`) |
| C8 | A ferramenta de marcar do agente não recebe pacote nem qualquer extra de módulo | `lib/mcp/tools/agendamento.ts:698-729` (`marcarShape`); handler `marcarAgendamentoHandler`, `app/api/v1/agenda/agendamentos/_handler.ts:359` |
| C9 | O agente já registra se a sessão aconteceu ou se a pessoa faltou | `crm_set_appointment_outcome`, `lib/mcp/tools/agendamento.ts:1215` |
| C10 | Os estados do compromisso são `pending`, `confirmed`, `cancelled`, `completed`, `no_show` | `supabase/baseline.sql:15752-15754` |
| C11 | Os eventos `appointment.created`, `.confirmed`, `.rescheduled`, `.cancelled`, `.completed` e `.no_show` nascem da **transição real** do estado, uma vez por mudança. A correção de um desfecho (`completed` → `no_show`) emite um evento novo | `gatilhoDaTransicao`, `lib/agenda/laco.ts:105-131` (a correção, `:119-124`); chamada em `app/api/v1/agenda/agendamentos/_handler.ts:493`, `:644` |
| C12 | Remarcar mantém o mesmo compromisso | `app/api/v1/agenda/agendamentos/_handler.ts:674-676` |
| C13 | Consumidores de evento se registram num ponto só, e já há consumidor dos `appointment.*` | `lib/event-log/register-handlers.ts:111-113`; `lib/agenda/aviso-de-agendamento.handler.ts:57-60` |
| C14 | Um módulo pode emitir evento próprio pela função comum | `public.emit_event`, `supabase/baseline.sql:12607` |
| C15 | Os gatilhos de automação são uma lista fechada no código, ligada à entidade que o motor sabe carregar. Evento novo de módulo não vira gatilho sem mudar essa lista e o carregamento | `ENTIDADE_ESPERADA_POR_GATILHO`, `lib/schemas/webhooks.ts:42`; `TRIGGER_EVENTS`, `:223`; regra de fonte única em `lib/automation/gatilhos-em-uma-fonte.test.ts:1-25` |
| C16 | O cartão da agenda não tem ponto onde um módulo mostre algo | `components/agenda/GradeDaAgenda.tsx`; nenhum arquivo de `components/agenda/` cita "modul" |
| C17 | O painel de marcação pela tela também não: monta o corpo e faz `POST` direto | `hooks/agenda/useMarcarAgendamento.ts:47-64`; nenhuma ocorrência de "modul" em `hooks/agenda/` nem em `app/app/agenda/_client.tsx` |
| C18 | O único lugar de tela para módulo hoje é a ficha do contato; os lugares planejados são contato, negócio e conversa, e a parte de ações, eventos e ferramenta de módulo declarado ainda não existe | `components/modulos/FichasDoModulo.tsx:9-19`, montado em `app/app/contacts/[id]/_client.tsx:619`; `docs/specs/modulos-dados-declarados-v1.md:131`, `:135-148` |
| C19 | Precedente de módulo com página própria dentro da agenda, com porta no menu | `app/app/agenda/lista-de-espera/page.tsx`; `lib/navigation/catalogo.ts:212-220` |
| C20 | Módulo com dados declara o que a anonimização faz com as tabelas dele | `public.modulo_secoes_lgpd`, `supabase/baseline.sql:43349`, `:43379`; precedente na 0619 (`:1`) |
| C21 | Cobrança do cliente final existe como módulo opcional (link de pagamento), desligado de fábrica | PR #3590 (mesclado em 10/11/2026); `lib/instalacao/modulos.ts:81` |

### PRs e issues abertos olhados

Comandos: `gh search issues "<termo>" --repo melgarafael/DeskcommCRM` e `gh search prs "<termo>" --repo
melgarafael/DeskcommCRM --state open` para "pacote", "pack de sessões", "package", "créditos de
sessão", "sessões pré-pagas" e "voucher". Nenhum trata de pacote de sessões. Vizinhos: #3480
(serviço como módulo), #3372 e #2497 (preço e serviço), #4086 (pagamento fora do Brasil).

## Destino

**Módulo opcional** `pacotes_de_sessoes` (ADR-0002), mais **duas portas genéricas de tela** no
núcleo, na agenda.

A pergunta da doutrina de extensões: se nenhuma organização ativar, a operação comum continua
inteira? Sim: agenda, marcação, catálogo e comanda seguem iguais. Por isso não é núcleo. Também não
é extensão declarativa: hoje o módulo declarado não reage a evento nem tem ferramenta de escrita do
agente (C18).

Por que não dentro do módulo de serviços (#3480): o saldo é uma conta do **cliente** (comprou 5,
usou 2), não um detalhe do serviço; e o pacote precisa funcionar para quem não usa o módulo de
serviços. O pacote referencia o item do catálogo, o mesmo lugar que o módulo de serviços usa (C2):
os dois convivem sem duplicar preço.

### Alternativa considerada e recusada: o pacote vendido como negócio

O pacote vendido poderia ser um negócio ganho num funil "Pacotes", com o módulo guardando só a
regra e a ligação das sessões. Ganharia de graça a lateral da conversa ("Negócios recentes", até 3
negócios por contato — `app/api/v1/contacts/[id]/crm-summary/route.ts:163-191`), as "Últimas
compras" da ficha e os gatilhos de negócio que já existem (`lib/schemas/webhooks.ts:42-100`).
Foi recusada porque:
- o saldo apareceria no negócio só como **cópia** escrita num campo do funil, com a fonte em outro
  lugar (anti-pattern 2);
- o funil tem **uma** etapa de ganho só (`supabase/baseline.sql:2932`), então "esgotado" e
  "vencido" não seriam etapas, e o estado do pacote ficaria espalhado entre etapa e etiqueta;
- um cliente com vários negócios empurra o pacote para fora dos 3 da lateral.

## O que muda

### 1. O módulo (fatia 1, sem porta no núcleo)

**Registro e schema.** O módulo entra nas duas listas de módulos (C3) e tem a sua função
provisionadora. Toda mudança de schema sai pela tripla da casa: migration, apêndice idempotente no
`baseline.sql` e linha `-- manifest:`. Toda tabela do módulo leva `organization_id` com a policy de
isolamento por organização. Com o módulo instalado só na instalação, as tabelas podem não existir:
nenhuma rota, ferramenta ou consumidor do módulo pode quebrar nesse caso; eles respondem como
módulo desligado.

**Três coisas guardadas:**
- **Regra do pacote**, ligada a um item do catálogo. O item dá nome e preço (C2). A regra diz
  **quantas sessões**, **quais Tipos de agendamento** o pacote cobre e a **validade em dias**
  (opcional). O módulo não guarda preço.
- **Pacote vendido**: quem **comprou** e quem **usa** (dois contatos, podem ser o mesmo — U6), a
  regra de origem, a data da venda e o estado guardado: `aguardando_pagamento`, `ativo` ou
  `cancelado`. Mudar a regra depois **não** muda pacote já vendido (total e validade valem como
  estavam na venda).
- **Sessão do pacote**: a ligação de um compromisso a um pacote, no máximo uma por compromisso (C4,
  C5).

**Estados calculados, nunca guardados por rotina:**
- **esgotado**: as sessões usadas chegaram ao total;
- **vencido**: a validade passou;
- **saldo**: total menos sessões usadas.
Calcular na leitura evita rotina agendada que mantém campo (anti-pattern 5).

**A baixa segue o estado ATUAL do compromisso**, não a soma de eventos. Cada evento `appointment.*`
(C11) faz o módulo reler o compromisso e pôr a sessão no estado correspondente:

| Compromisso | Sessão do pacote |
|---|---|
| `pending` ou `confirmed` | marcada (reserva lugar no pacote) |
| `completed` | usada |
| `no_show` | conforme a decisão P1 |
| `cancelled` | devolvida (não ocupa lugar) |

Assim a correção de um desfecho (C11) corrige a baixa, e o mesmo evento entregue duas vezes não
conta duas vezes. Remarcar não muda nada (C12). O consumidor se registra com os outros (C13) e não
faz chamada de rede.

**Os dois números que a tela mostra:**
- **na sessão**: "3/5" = a posição da sessão entre as sessões vivas do pacote (marcadas ou usadas),
  pela data do compromisso, sobre o total. Cancelar a 3 faz a 4 virar 3: não há buraco nem número
  repetido;
- **no pacote**: "2 de 5 usadas" e o saldo.

**Invariante:** um pacote nunca tem mais sessões vivas (marcadas ou usadas) do que o total, mesmo com
duas marcações ao mesmo tempo (agente e recepção). A sexta é recusada com motivo legível.

**Tela do módulo** (sem porta no núcleo, como a lista de espera — C19), com porta no menu:
- lista por cliente com o saldo, a validade e os pacotes esgotados ou vencendo em destaque (é o
  laço de renovação da fatia 1);
- ações: vender pacote, confirmar pagamento, marcar sessão usando o pacote, estender validade,
  cancelar pacote. Cancelar pede confirmação dizendo o que acontece com as sessões já marcadas
  (`docs/doctrine/destrutivo-pede-confirmacao.md`; ver P5).

**Rotas** do módulo: toda mutação audita, declara `requireSupportWrite(` antes do efeito e responde
como módulo desligado quando ele não está instalado. A venda aceita `Idempotency-Key`.

**Ferramentas do agente**, só com o módulo instalado, no grupo `atender` (molde C6), contando no teto
(C7):
- `crm_list_contact_packages` (leitura): pacotes do contato, com saldo, validade e estado;
- `crm_book_package_session` (escrita): marca pela mesma marcação do núcleo (C8) e liga ao pacote,
  respeitando o invariante. Se a ligação falhar depois da marcação, a sessão **não pode ficar sem
  pacote em silêncio**: a ligação é refeita de forma idempotente e, se não der, abre aviso na
  Central;
- `crm_register_package_sale` (escrita): cria o pacote vendido em `aguardando_pagamento` (ver P3).

**LGPD.** O módulo declara as suas tabelas na anonimização (C20). A anonimização do contato não
apaga pacote nem sessão: a contagem e as datas ficam, como na timeline; o que for texto livre sai.

### 2. Porta genérica: selo do módulo no cartão da agenda (fatia 2, núcleo)

- O cartão e o detalhe do compromisso mostram um **selo curto** que um módulo instalado fornece para
  aquele compromisso (no caso, "3/5"). Hoje não há lugar para isso (C16).
- Genérica: qualquer módulo pode fornecer o selo. Módulo desligado ou que falha: o cartão aparece
  como hoje, sem o selo.

### 3. Porta genérica: escolha do módulo ao marcar pela tela (fatia 3, núcleo)

- O painel de marcação da agenda (C17) ganha um lugar onde um módulo instalado oferece uma escolha
  ligada ao contato (no caso, "usar o pacote X, sessão 4 de 5" ou "avulsa").
- Sem esta porta, a recepção marca pela tela do módulo (fatia 1): funciona, mas obriga a sair da
  agenda.

### 4. Renovação automática por mensagem (fatia 4, depende do mantenedor)

- O módulo passa a emitir `pacote.esgotado` e `pacote.vencendo` (C14), e esses eventos entram na
  lista de gatilhos de automação e follow-up, com o carregamento da entidade pacote no motor (C15).
  Muda uma lista e o motor do núcleo, por isso é fatia própria.
- Na fatia 1 o módulo **não emite** esses eventos: emitir sem consumidor é anti-pattern 3. O laço
  da fatia 1 é a tela do módulo e o agente, que lê o saldo quando o cliente fala.

## Decisões propostas

- **D1 — Preço só no catálogo.** O módulo não guarda preço (C2).
- **D2 — Sessão conta quando é realizada, não quando é marcada.** Marcar reserva lugar no pacote;
  só `completed` consome.
- **D3 — Pacote sem pagamento confirmado não bloqueia a marcação.** O uso real marca a 1ª sessão
  antes de emitir o pacote (U3). O pacote nasce `aguardando_pagamento`, já conta as sessões
  marcadas, e a equipe confirma o pagamento na tela do módulo.
- **D4 — Pagamento fora do escopo.** O módulo não cobra. Se a comanda (`financeiro`) estiver
  instalada, a venda pode abrir uma comanda; se o link de pagamento estiver instalado (C21), pode ser
  usado. Nenhum dos dois é exigido.
- **D5 — O selo e a escolha ao marcar são portas genéricas**, não código de pacote no núcleo.

## Perguntas ao Paulo (antes de publicar)

- **P1 — Falta conta como sessão usada?** (A) a regra do pacote decide, com "não conta" de fábrica;
  (B) sempre conta; (C) nunca conta. Recomendação: A, porque a política muda de clínica para
  clínica.
- **P2 — Pacote vencido:** (A) recusa marcação nova com o pacote e mostra "vencido, renovar";
  (B) só avisa. Recomendação: A, com a equipe podendo estender a validade.
- **P3 — O agente pode registrar a venda?** (A) sim, sempre em `aguardando_pagamento`; (B) não, só a
  equipe vende e o agente só oferece. Recomendação: A, porque é o que deixa o agente fechar a venda
  na conversa, e o pagamento continua confirmado por gente.
- **P4 — Uma sessão do pacote pode ser com qualquer profissional?** (A) qualquer profissional que
  atende o Tipo coberto; (B) o pacote fixa o profissional. Recomendação: A; pacote de uma pessoa só
  já se resolve com um item e um Tipo próprios daquela pessoa.
- **P5 — Cancelar pacote com sessões marcadas:** (A) as sessões continuam marcadas, como avulsas, e
  a tela avisa; (B) recusa até desmarcar. Recomendação: A, porque desmarcar sessão de paciente por
  causa de um acerto financeiro é pior.

## Critérios de aceite

1. Com o módulo desligado ou não instalado, nenhuma tela, rota, ferramenta ou consumidor do módulo
   responde nem quebra, e a agenda é idêntica à de hoje.
2. Vender um pacote de 5 sessões e marcar 3 (pela tela do módulo e pelo agente): o pacote mostra
   "0 de 5 usadas" e as sessões "1/5", "2/5", "3/5". Realizar 2: "2 de 5 usadas".
3. Cancelar a sessão "2/5": a "3/5" passa a "2/5" e o pacote volta a ter lugar. Remarcar não muda
   nada no pacote.
4. Corrigir uma sessão de realizada para falta muda a baixa conforme P1; o mesmo evento entregue
   duas vezes não muda a contagem.
5. Com 5 sessões vivas (marcadas ou usadas), uma 6ª é recusada com motivo legível, pela tela e pelo
   agente — inclusive com as duas marcações ao mesmo tempo.
6. Pacote `aguardando_pagamento` aceita marcação; confirmar o pagamento o deixa `ativo`. Pacote
   vencido segue a decisão P2. Cancelar pacote segue P5 e pede confirmação.
7. Duas organizações: o pacote de uma não aparece, não é marcado e não recebe baixa pela outra
   (teste de isolamento no `test:db`).
8. Toda mutação do módulo gera uma linha de auditoria; a venda repetida com a mesma
   `Idempotency-Key` não cria dois pacotes.
9. A anonimização do contato preserva contagem e datas e tira o texto livre do módulo.
10. Prova em par para as ferramentas do agente: a mesma frase pelo agente e a ferramenta chamada
    direto devolvem o mesmo saldo (`docs/doctrine/prova-em-par.md`).
11. A tela do módulo tem porta em `lib/navigation/catalogo.ts` com `modulo: "pacotes_de_sessoes"`.
12. Fatia 2: com o módulo ligado, o cartão mostra "3/5"; desligado ou falhando, o cartão aparece como
    hoje.

Cada teste novo é sabotado: tirar o consumidor que dá baixa deixa o critério 2 vermelho; tirar a
trava do invariante deixa o critério 5 vermelho.

## Fora desta spec (de propósito)

- Cobrança e confirmação automática de pagamento (D4).
- Assinatura mensal e plano recorrente (sem decisão do mantenedor, #3372).
- Pacote que mistura serviços diferentes ("3 sessões + 1 avaliação").
- Transferir saldo entre pacotes ou entre clientes.
