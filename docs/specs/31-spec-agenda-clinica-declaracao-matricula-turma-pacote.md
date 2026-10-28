---
title: "Spec Técnica 31 — Agenda de clínica: declaração, matrícula no grupo, turma com mínimo e pacote de sessões"
parent: 00-prd-master.md
type: spec
scope: agenda, financeiro
status: draft
version: 0.2.0
owner: arquitetura
created_at: 2026-10-28
related:
  - ../testing/agendas-de-servicos.md
  - ../agenda-configuracao.md
---

# Spec 31 — Agenda de clínica: o que a configuração não resolve

Origem: #3067 (sala, grupo e turma) e o caso real de uma clínica de psicoterapia que também forma e
supervisiona profissionais. Esta spec cobre **quatro capacidades**, cada uma num PR e numa branch
própria a partir da `main`, enviados em sequência (o seguinte nasce depois do anterior entrar):

| # | Capacidade | PR | Depende de |
|---|---|---|---|
| A | Declaração de presença | 1 | — |
| B | Matrícula num grupo fixo | 2 | — |
| C | Turma com mínimo de inscritos | 3 | B |
| D | Pacote de sessões com saldo | 4 | — (módulo `financeiro`) |

Versão 0.1 desta spec tratava de "sala por agendamento". A medição de 28/10 (seção 1.2) mostrou que
a sala **se resolve por configuração** hoje; aquele desenho fica fora (cópia guardada fora do
repositório) e só volta se a configuração se mostrar inviável na prática.

## 1. Medições

Base: `origin/main` `f13d26f6b` (27/10/2026). Oficial na versão 1.94.0 (`ba24d4d36`), 16 commits
atrás da main e **nenhum** deles na agenda ou no financeiro. 72 PRs abertos lidos (`gh pr diff`).

### 1.1 Uso real (oficial, 28/10 10h40, por organização)

3 organizações com agenda: 0 salas, 0 tipos de serviço, 10 agendamentos ao todo. Nada a converter.

### 1.2 O que já funciona e é só configuração (não entra em PR)

| Necessidade | Prova |
|---|---|
| Duas consultas não caem na mesma sala | A sala ("recurso") é conferida entre **todos** os tipos: `tests/invariants/agenda-servicos.test.ts:342`. Um tipo por sala, mais um "online" sem sala. Condição: a consulta presencial tem de ser de tipo com serviço ligado (o tipo comum não confere sala: `_handler.ts:450`, `0716:715`). |
| Grupo com N pacientes, cada um com o seu contato | `agenda-servicos.test.ts:319` — três **contatos diferentes** na mesma ocorrência, sem duplicar; vagas: `:330`. |
| Médico que marca direto no Google fica ocupado | Leitura a cada minuto (`docker/scheduler/entrypoint.sh:83`); na oficial, última leitura 5–7 min antes (28/10 10h54). A sala desse compromisso não é conhecida (o local do Google não é guardado: `baseline.sql:15793`). |
| Segunda terapeuta do grupo protegida | Tirar o horário da jornada dela (a regra exige horário dentro da jornada: `0716:408`). |
| Grupo quinzenal; supervisão até 6 vagas; preço por faixa | Datas específicas (`0716:31`); `service_capacity` (`0716:19`); um tipo por faixa (`default_price_cents`, `app/api/v1/agenda/tipos/route.ts:139`). |

### 1.3 Achados que sustentam as quatro capacidades

- **Nada de série, turma, matrícula ou inscrição na agenda.** `calendar_service_occurrences`
  (`0716:82-95`) não tem estado; nasce na reserva (`fn_calendar_service_occurrence`, `0716:579`) e
  nunca morre (FK `on delete restrict`, `0716:124`). Nenhum código TS lê a tabela.
- **Janela de reserva:** `booking_window_days` (padrão 60, até 365; `0177:110`, `tipos/route.ts:91`),
  aplicada em `0716:456`. `candidatosDoServico` recusa período acima de 62 dias e mais de 500
  horários (`lib/agenda/servicos/regras.ts:131`, `:162`).
- **Cancelar não avisa o paciente.** O aviso de agendamento vai ao WhatsApp do dono, não ao contato
  (`lib/agenda/aviso-de-agendamento.ts:1-40`). Quem escreve ao paciente hoje é o lembrete
  (`app/api/v1/cron/agenda-reminder/route.ts`): `sendMessageHandler` (`:755`), `espacarEnvio`,
  janela do canal 7h–22h (`lib/automation/janela-do-canal.ts:12`), contato bloqueado fora (`:638`).
  Cancelamento em lote não existe.
- **Recorrência:** o CRM nunca cria série no Google (`lib/agenda/google/evento.ts:33-34`); cada
  sessão é um evento.
- **Rotinas:** linha `minuto|timeout|rota` em `docker/scheduler/entrypoint.sh`, conferida contra o
  diretório por `tests/unit/cron-routes-scheduled.test.ts`; proteção `autorizaCron`
  (`lib/auth/cron-auth.ts:25-45`); cron só audita quando houve efeito.
- **Comanda** = `sales` + `sale_items` (`0351`), do **módulo opcional `financeiro`**
  (`fn_financeiro_provisionar`, `0619`; sem o módulo as rotas dão 404). Estados `open | finalized |
  cancelled` (`0351:42`); finalizar já lança a entrada paga (`0351:364`, mínimo de 1 centavo:
  `greatest(v_total, 1)`). O preço vem do tipo (`faturar-lote/route.ts:72,97`). Saldo **sempre
  derivado**, nunca coluna (`0351:13`); precedente de saldo por contato: `loyalty_ledger`
  (`0351:206`, soma em `fn_saldo_de_fidelidade`, `0355:22`).
- **Nenhum pacote, saldo ou crédito de sessões** para o contato (busca em `lib app components
  supabase/migrations`). `lib/cobranca` é a cobrança da plataforma (Stripe/Asaas), não do paciente.
- **PDF:** `@react-pdf/renderer` (`package.json:75`). Precedente de documento com marca da
  organização enviado na conversa: a proposta (`lib/propostas/marca-da-organizacao-para-pdf.ts:14-38`,
  envio em `app/api/v1/proposals/[id]/send/route.ts:250-270`). O PDF de LGPD nunca leva marca, e
  documento do cliente não usa `marcaDaSaida()` (a camada de instalação é o revendedor).
- **Dados da clínica:** `organizations` tem `legal_name`, `display_name`, `cnpj` (rótulo "NIPC" em
  Portugal: `lib/legal/perfil-do-pais.ts:133-143`), `dpo_email`, `timezone`, `locale`, `settings`
  (`baseline.sql:1757-1782`). **Não há** morada, telefone nem e-mail geral.
- **E-mail sem anexo:** `lib/email/resend.ts:34-45` (`SendArgs` sem `attachments`).
- **Opt-out:** a detecção grava `contacts.is_blocked` (`lib/opt-out/deteccao.ts:10`), que barra o
  envio.

### 1.4 Decisão do mantenedor que limita o desenho

PR #3480, 27/10/2026 01h22 (melgarafael): *"serviços seguem como módulo opcional. A fonte de preço
atual fica preservada até haver contrato explícito da integração; não vamos tornar essa proposta
universal nem inventar regras de sinal/cobrança."* Consequências aqui: o pacote (D) **não muda a
fonte do preço** (continua o tipo) e vive **dentro do módulo `financeiro`**, opcional.

### 1.5 Trabalho paralelo

- #3465 (lista de espera, webtecnica): em conflito, rótulo `triagem:extensao`, sem tratar ocorrência
  coletiva; toca `cancelarAgendamentoHandler` e recria `calendar_appointments_source_check` (acrescenta
  `waitlist`). Quem entrar depois preserva o valor. Cancelamento em lote (C) dispararia o encaixe
  dele N vezes — resolver no merge.
- #3480 (catálogo com serviço, em conflito), #3459 (moeda no financeiro), #3568 (resgates, toca a tela
  de faturamento). Nenhum trata pacote, matrícula, turma ou declaração.
- Issues abertas sobre esses temas: só a #3067.

## 2. A — Declaração de presença (PR 1)

**Para quem usa:** no detalhe de um atendimento **realizado**, "Gerar declaração" cria um PDF com os
dados da clínica, o nome do paciente, data, hora e profissional, e envia na conversa do paciente
(ou baixa). O agente, quando o paciente pede, **não gera**: passa à equipe com o atendimento
indicado (a IA só propõe, como já faz com o desfecho: `lib/mcp/tools/agendamento.ts:1196-1200`).

- **Dados da clínica:** bloco novo `organizations.settings.documento` (morada, telefone, e-mail),
  com schema Zod, no molde de `settings.art15` (`lib/legal/art15.ts`) — **sem migration**. Tela em
  Configurações da empresa. Cabeçalho: `legal_name` + número fiscal (`cnpj`, com o rótulo do país).
- **Só atendimento `completed`:** não se declara presença de quem faltou ou cancelou.
- **Profissional:** nome pela mesma regra do aviso (`lib/agenda/identidade-do-responsavel.ts`);
  sem responsável, "Profissional não informado".
- **PDF:** conteúdo por função pura testável; desenho em `@react-pdf` com marca **só da
  organização** (`marcaDaOrganizacaoParaPdf`), nunca `marcaDaSaida()`; cores em hex.
- **Envio:** o arquivo sobe ao bucket `whatsapp-media` no caminho da conversa e vai por
  `sendMessageHandler` (`type: "document"`), herdando o porteiro (bloqueado, pessoal, janela) e a
  anonimização que já alcança mídia de mensagem. **Não se cria bucket nem tabela**; a segunda via é
  gerar de novo. Sem conversa, só baixar.
- **Rota:** `POST /api/v1/agenda/agendamentos/{id}/declaracao` (`agent`+, `requireSupportWrite`,
  sessão; se aceitar bearer, `tetoDeEscritaDoToken`); audit nova `agenda.declaration_issued` só com
  ids. O envio já audita `message.sent`.
- **Testes:** unidade do conteúdo (fuso do atendimento, sem profissional, país PT/BR), rota (só
  `completed`, outra organização 404, viewer 403), e2e da tela (gerar e ver na conversa).

## 3. B — Matrícula num grupo fixo (PR 2)

**Para quem usa:** no tipo coletivo (ex.: grupo quinzenal), "Matricular paciente": a partir daí o
paciente tem reserva em **todas** as sessões futuras dentro da janela do tipo, sem marcar uma a uma.
"Encerrar matrícula" cancela as futuras. A ficha mostra as matrículas ativas.

- **Tabela nova** `calendar_service_enrollments` (`organization_id`, `event_type_id`, `contact_id`,
  `starts_on`, `ends_on` opcional, `status in ('active','ended')`, `ended_reason`, `revision`,
  `created_by_*`), uma **matrícula viva por contato e tipo** (índice único parcial, molde de
  `followup_enrollments`), FKs compostas da organização, RLS de leitura + escrita só por RPC (molde
  da 0716: `revoke` de `authenticated`, `grant` a `service_role`).
- **Quem escreve as reservas:** sempre `fn_calendar_service_book` (o escritor canônico), com
  `operation_key` determinística por matrícula e data (`matricula:<id>:<starts_at>`), então rodar
  duas vezes não duplica (`calendar_service_operation_once`, `0716:133`).
- **Quando:** na matrícula (preenche a janela) e numa rotina nova (diária) que estende a janela; só
  tipo coletivo com serviço ativo. Sessão sem vaga ou fora da regra não é forçada: fica registrada
  como "não coube" na matrícula, visível na tela.
- **Encerrar:** cancela as reservas futuras dessa matrícula pelo caminho normal de cancelamento
  (`fn_appointment_change`), com motivo; passadas ficam.
- **LGPD:** tabela com `contact_id` → decisão na cerca `lgpd-redact-unificado-alcanca-pelo-catalogo`
  (`ended_reason` é texto livre → redigir), bloco no export do titular, prova de isolamento entre
  organizações (arquivo novo de invariante + entrada em `PROVA_PROPRIA`, que edita invariante
  existente — declarado no PR).
- **Testes:** matricular gera N reservas na janela; rodar de novo não duplica; grupo cheio não
  quebra a matrícula; encerrar cancela só as futuras; outra organização não vê nem matricula.

## 4. C — Turma com mínimo de inscritos (PR 3, depois de B)

**Para quem usa:** no tipo coletivo, "Mínimo para acontecer" e "decidir N horas antes". No prazo, se
a sessão (ou a edição, quando o tipo é uma edição de curso com várias datas) não tiver o mínimo, o
sistema **cancela as reservas e avisa cada inscrito** no WhatsApp, e avisa a equipe. Com o mínimo, a
sessão fica "confirmada". Adiar é a equipe escolher outra data e rematricular — não é automático.

- **Configuração:** `calendar_event_types.service_min_participants` (opcional) e
  `service_decision_hours` (horas antes do início). Sem mínimo, nada muda.
- **Estado da sessão:** tabela pequena de decisão por ocorrência (`occurrence_id`, `decision in
  ('confirmed','cancelled_min')`, `decided_at`, contagem), idempotente por ocorrência — a ocorrência
  segue sem estado próprio (não se mexe na 0716).
- **Edição de curso:** quando o tipo tem só datas específicas, o mínimo conta **matrículas ativas**
  (B) antes da primeira data; abaixo do mínimo, cancela todas as datas da edição.
- **Rotina nova** (a cada 15 min) que decide o que venceu; cancelamento pelo caminho normal, um a um,
  sob a trava da organização; aviso ao paciente pelo mesmo porteiro do lembrete (bloqueado fora,
  janela 7h–22h, `espacarEnvio`), texto curto com a data e "a equipe vai falar consigo".
- **Com #3465:** se entrar antes, o cancelamento em lote não pode disparar oferta de vaga (a sessão
  inteira acabou) — marcado no código e no teste.
- **Testes:** abaixo do mínimo cancela todos e enfileira um aviso por pessoa; no mínimo confirma;
  decidir duas vezes não repete; contato bloqueado não recebe; edição com três datas cancela as três.

## 5. D — Pacote de sessões com saldo (PR 4, módulo `financeiro`)

**Para quem usa:** em Comandas, "Vender pacote" (ex.: 6 sessões do tipo "Psicoterapia" por 500 €,
pago por MB Way registrado à mão). Cada atendimento **realizado** desse tipo, para esse paciente,
desconta 1 e **não aparece** em "a faturar". A ficha e a comanda mostram "restam N".

- **Dentro do módulo `financeiro`:** as tabelas nascem em `fn_financeiro_provisionar` (ADR-0002;
  não vão ao baseline para todos); sem o módulo, nada existe.
- **Modelo:** `pacotes` (contato, tipo coberto, sessões, valor pago, moeda da organização, validade
  opcional) + `pacote_movimentos` (compra `+N`, sessão `−1` ligada ao agendamento, estorno `+1`),
  **saldo derivado pela soma**, idempotente por agendamento — molde de `loyalty_ledger`.
- **Preço:** o valor do pacote é lançado como **uma** entrada paga (`financial_entries`,
  `origin='manual'`) na venda do pacote. O preço do tipo **não muda** e continua a fonte (decisão do
  mantenedor, 1.4).
- **Consumo:** ao virar `completed`, se há pacote ativo com saldo para (contato, tipo), grava `−1`.
  `pendentes` e `faturar-lote` deixam de listar o atendimento coberto. Nenhuma comanda de valor zero
  (evita o `greatest(v_total, 1)` de `0351:364`).
- **LGPD:** tabelas com `contact_id`, só números e vocabulário → `manter` (como `loyalty_ledger`);
  seção declarada em `modulo_secoes_lgpd` se houver texto livre; bloco no export.
- **Testes:** comprar dá saldo N; realizar desconta 1 e some de "a faturar"; realizar duas vezes não
  desconta duas; saldo zero volta a faturar; estorno devolve; outra organização isolada; sem o módulo
  as rotas dão 404.

## 6. Regras comuns aos quatro PRs

- Branch própria a partir da `main` do Rafael, PR interno no fork para o CI (o e2e só roda no PR para
  a `main`), sabotagem com previsão escrita, fragmento `.changes/` `capacidade_nova`, textos novos
  com `es` no dicionário, nada em português fora de `t()`.
- Migration com número por `pnpm checar:colisao-de-migration`, `-- manifest:`, apêndice idêntico no
  `baseline.sql`; função nova com `revoke … from public, anon` + `grant` só a quem precisa.
- Toda mutação audita; rota mutante com `requireSupportWrite`; organização só da autenticação.
- Destino: A, B e C no núcleo da agenda, opt-in por tipo (sem configurar, nada muda); D dentro do
  módulo opcional `financeiro`. O PR pergunta ao mantenedor se prefere B e C como módulo (como a
  triagem sugeriu para #3465).

## 7. Decisões

- Pagamento automático (MB Way) fora (Paulo, 28/10).
- Sala por agendamento fora: configuração resolve (Paulo, 28/10).
- Declaração não é guardada em tabela própria; vai como mídia da conversa (cobertura de LGPD que já
  existe). A pedir ao Paulo se a clínica quiser segunda via guardada.
- Adiar turma não é automático: cancela, avisa, a equipe remarca.

## 8. Sistema vivo — checklist

- Nenhuma demanda sem próximo passo: pedido de declaração pelo agente vira passagem à equipe;
  sessão que "não coube" na matrícula aparece na tela; turma cancelada avisa paciente e equipe.
- Log visível: audit nas quatro; envio ao paciente pela conversa (histórico).
- Configuração com superfície: dados da clínica, mínimo e prazo, matrícula e pacote têm tela.

## 9. Não medido

- Se `@react-pdf` busca o logo da organização por URL em produção (o PDF da proposta faz isso; não
  executei).
- Fonte do nome do profissional além de `auth.users.user_metadata` (não há `profiles` no baseline).
- O corpo do teste `cron-routes-scheduled.test.ts` (li o contrato no entrypoint).
- Comportamento de automações que já assinem `appointment.cancelled` para escrever ao paciente.
- Regra fiscal portuguesa (IVA, fatura) — fora do escopo; o pacote só registra valor.
