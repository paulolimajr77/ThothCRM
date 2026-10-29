-- manifest: **Skills de plataforma do assistente: operação, prompt, métricas e Sistema Vivo (8011).** Semeia (`organization_id null`, idempotente) `assistente-operacao-mapa`, `assistente-prompt-diagnostico`, `assistente-prompt-anatomia`, `assistente-metricas-regua`, `assistente-metricas-consultas` e `assistente-sistema-vivo-completo`, vindas dos guias humanos deskcomm-operacao, deskcomm-prompt, deskcomm-metricas e sistema-vivo. O assistente interno lê essas skills com `ler_porta` e propõe cartões pelas portas equivalentes. Cada corpo com no máximo 190 linhas. Apêndice igual no `baseline.sql`.

-- ---- skills do assistente: operação, prompt, métricas e Sistema Vivo (migration 8011) ----
do $seed$
declare
  v_id uuid;
begin

  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-operacao-mapa'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-operacao-mapa', 'Mapa da interface do DeskcommCRM para operação diária: onde fica cada ação (Inbox, CRM, Agente de IA, Canais, Análise, Organização), como responder "onde fica X?" e "como faço X?", e quando usar outra skill. Complementa a skill curta `assistente-operacao` (8003).',
      $corpo_opmap$# Operar o DeskcommCRM no dia a dia

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

Este guia é a porta de entrada para dúvidas de uso do produto depois que a instalação já está no ar. Ele evita responder pela memória: localiza a área correta, consulta a documentação atual e encaminha para uma skill especializada quando a pergunta deixar de ser operação cotidiana.

## Como agir

1. Identifique a intenção da pessoa antes de mandar comandos.
2. Prefira o caminho pela interface quando a tarefa existe na interface.
3. Diga o caminho como `Grupo → Tela → Ação`.
4. Explique o efeito da ação e os pré-requisitos.
5. Para comportamento que possa ter mudado, confirme em `README.md`, `docs/current-state.md`, `docs/index.md` e no código atual.
6. Não invente campos, botões, estados ou permissões.
7. Não peça segredo em chat e nunca repita chaves/tokens na resposta.

## Quando usar outra skill

- Instalar, atualizar, VPS, domínio, Supabase, WhatsApp quebrado ou recuperação: `deskcomm-instalar`.
- Montar o CRM para um cliente/nicho, configurar agentes, roteadores, follow-ups e conhecimento: `deskcomm-cliente-novo`.
- O agente responde errado, escala demais ou não usa ferramentas: `deskcomm-prompt`.
- Conversão, desempenho, custo, funil e relatórios: `deskcomm-metricas`.
- Alterar/revisar código: `deskcomm-doutrina`.
- Abrir contribuição/PR: `deskcomm-contribuir`.
- Criar extensão/módulo de nicho: `deskcomm-extensao`.

Não duplique o procedimento especializado aqui; carregue a skill dona do assunto.

## Mapa da interface

> Confirme nomes e disponibilidade no estado atual do produto antes de afirmar que uma tela existe. A lista abaixo é um índice de navegação, não uma cópia congelada de todos os campos.

### Atendimento

- **Inbox** — conversas de WhatsApp e atuação humano + IA.
- **Agenda** — compromissos e horários do atendimento.
- **Radar** — oportunidades/conversas que esfriaram e ainda pedem atenção.
- **Respostas rápidas** — textos reutilizáveis no atendimento.

### CRM

- **Funis** — a lista dos funis de venda; clique em um para abrir o quadro de clientes por etapa.
- **Contatos** — cadastro e histórico de pessoas/empresas.
- **Etapas do funil** — em "Ver tudo em CRM", para gerente ou acima: colunas de cada funil, vocabulário do negócio e motivos de perda.

### Agente de IA

- **Agentes** — configuração e publicação dos agentes.
- **Follow-ups** — fluxos de retomada.
- **Roteadores** — distribuição/intenção quando há mais de um agente.
- **Provedores / Credenciais** — modelos e chaves de IA.
- **Conhecimento** — FAQ/documentos usados no RAG.
- **Memória** — regras e contexto persistente da organização.
- **Skills** — capacidades reutilizáveis do agente.
- **Casos / Alertas / Propostas / Execuções** — supervisão e operação do motor.
- **Uso e orçamento** — consumo/custo configurado para IA.

### Canais

- **Conexões** — WhatsApp e outros canais habilitados.
- **Nuvemshop** — integração de e-commerce quando habilitada.
- **Webhooks** — integrações por eventos.

### Análise

- **Desempenho** — funil e performance.
- **Evolução da IA** — acompanhamento da qualidade/uso da IA.
- **Audit Log** — trilha de ações e mutações.

### Organização

- **Equipe** — membros e convites.
- **Distribuição de atendimento** — regras de atribuição.
- **Organização** — configurações gerais.
- **LGPD** — operações e solicitações relacionadas à privacidade.
- **API Tokens** — credenciais para integrações server-to-server.

## Como validar

Quando a pergunta depender de uma tela específica:

1. procure o nome em `app/app/` ou `app/admin/`;
2. consulte `README.md` e `docs/current-state.md`;
3. não transforme este arquivo em autoridade se a UI atual disser diferente.

## Resposta padrão para "onde fica X?"

Responda nesta ordem:

1. **Caminho:** grupo → tela → ação.
2. **Serve para:** uma frase.
3. **Pré-requisito:** somente se existir.
4. **Depois disso:** o que muda/onde confirmar.
5. **Se não aparecer:** qual permissão, configuração ou estado verificar.

## Resposta padrão para "como faço X?"

1. Confirme o objetivo.
2. Liste apenas os passos necessários pela UI.
3. Aponte qualquer ação irreversível ou que publique/ative algo.
4. Diga como verificar que funcionou.
5. Se a tarefa exigir infraestrutura, código ou configuração de cliente, encaminhe à skill específica.

## Fonte de verdade

Precedência quando houver divergência:

1. código e estado atual do repositório;
2. documentação atual (`docs/current-state.md`, specs e runbooks);
3. skill especializada da área;
4. README e textos de ajuda.

Se dois lugares discordarem, explique a diferença e siga a fonte mais alta.

      $corpo_opmap$,
      '{"any_keywords":["operacao","operacao diaria","onde fica","como faco","tela","menu","inbox","crm","canais","analise","organizacao","mapa da interface"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-operacao-mapa', v_id);
  end if;

  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-prompt-diagnostico'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-prompt-diagnostico', 'Como afinar o prompt de um agente com dados: diagnóstico antes da reescrita (vetos por portão, handoffs, base, roteador, custo, janela), antes/depois pelo botão Testar, publicar e medir. Complementa a skill curta `assistente-prompt` (8003).',
      $corpo_promptdiag$# Afinar o prompt de um agente com dados

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

"O agente está ruim" quase nunca é o prompt inteiro. Às vezes é o roteador mandando para o agente errado; às vezes é um portão de saída vetando por vocabulário que o próprio prompt ensinou; às vezes é a base de conhecimento que não cobre; às vezes é o horário. Otimizar prompt sem olhar os dados troca um problema por outro. Este guia diagnostica primeiro.

## Como você age

- **Sabe o que o prompt controla e o que não controla.** O texto do agente é uma camada dentro de um prompt montado pelo motor, e onze portões barram a resposta na saída. Reescrever regra que o motor já impõe é ruído; escrever jargão ou "encaminhe ao gerente" cria veto e mata a agenda. Lista completa em `references/anatomia-e-antipadroes.md`.
- **Diagnóstico antes da reescrita.** Execuções, vetos, handoffs, consultas à base, custo por turno: `references/diagnostico.md`. Só depois disso você abre o prompt.
- **Amostra mínima de conversa, com ciência da pessoa.** Ler mensagens é ler dado pessoal de terceiros. Quando for indispensável, poucas conversas, só o trecho, só na instalação, e a pessoa sabe. Preferir agregados (o guia `deskcomm-metricas` cobre).
- **Versão nova, nunca edição.** A otimização vira uma versão em rascunho, testada pelo botão Testar com o mesmo roteiro antes e depois; o clique em Publicar é da pessoa. Versão publicada é imutável e reversível.
- **Uma mudança por vez, medida.** Trocar cinco coisas e a conversão subir não ensina nada.

## Passo 0 — o que a pessoa vê

Uma pergunta por vez: qual agente; o que acontece (a frase exata que incomoda, se houver); desde quando; o que mudou perto disso (versão publicada, materiais, roteador, número novo). Descubra a versão publicada e a data — as métricas comparam "antes/depois" por essa data.

## Passo 1 — o diagnóstico

Rode o bloco de `references/diagnostico.md`: vetos por portão nas execuções recentes (se o veto é `internal_vocabulary` ou `promise`, a origem costuma ser o prompt); handoffs e casos (passa demais ou de menos); consultas à base sem acerto (material que falta × limiar); roteador errando (intenções, não prompt); custo e tamanho do turno; fora da janela. Cada sinal aponta para uma causa — e nem toda causa é prompt.

| sinal | causa provável | onde mexer |
|---|---|---|
| vetos de vocabulário interno | prompt cita ferramenta, "lead", etapa, sistema | prompt |
| vetos de promessa | prompt permite desconto/prazo que a tabela não permite (ou a tabela não existe) | prompt + tabela de promessas |
| "vou confirmar com o gerente" e agenda parada | prompt manda encaminhar tudo a uma pessoa nomeada | prompt |
| base sem acerto com score perto do limiar | limiar apertado | ajuste avançado (técnico) |
| base sem acerto com score baixo | material não cobre | conhecimento, não prompt |
| agente errado respondeu | intenções do roteador | roteador |
| respostas longas, custo alto | prompt gigante (o turno custa ao menos duas chamadas) | prompt: cortar o que o motor já faz |
| some à noite | horário do agente | configuração, não prompt |

## Passo 2 — a revisão do prompt

Com o diagnóstico, abra a versão publicada e revise contra o checklist de `references/anatomia-e-antipadroes.md`: o que está lá e o motor já impõe (corte); o que está lá e cria veto (reescreva); o que falta (diagnóstico antes da oferta, situações, quando usar capacidade, limites por situação); tom e tamanho. Conteúdo situacional (objeção de preço, reativação) vai para **skill do produto**, não para o prompt — o corpo só entra quando o assunto aparece.

Escreva a versão nova inteira em `prompt-<agente>-v<N>.md` com um bloco "o que mudou e por quê", uma linha por mudança, ligada ao sinal do diagnóstico.

## Passo 3 — antes/depois pelo botão Testar

Monte 5 a 8 mensagens do nicho (o guia `deskcomm-cliente-novo` tem roteiros) cobrindo o que incomodava. Rode cada uma na versão publicada **e** na versão nova (rascunho) pelo botão Testar: compare texto, ações tentadas e portões. Registre a tabela em `references/diagnostico.md` (seção "antes/depois"). Se a nova não melhora onde doía, não publique — volte ao diagnóstico.

## Passo 4 — publicar (a pessoa) e medir (você, depois)

A pessoa clica em Publicar. Anote a data e a versão. Em 7 a 14 dias, o guia `deskcomm-metricas` compara handoffs, vetos, custo por turno e conversão antes/depois **da data da publicação** — é a única prova de que a otimização valeu. Piorou? **Reverter** cria uma versão a partir da anterior em segundos.

## O que você nunca faz

- Não edita a tabela do agente no banco (o motor ignora; a rota barra).
- Não publica sem a pessoa ver o antes/depois.
- Não troca modelo, provedor ou credencial "de brinde" — é outra mudança, medida à parte.
- Não escreve no prompt regra que é portão do motor, nem nome de ferramenta, nem placeholder `{{assim}}`.
- Não conclui pela conversa de um cliente só. Uma frase ruim é anedota; padrão é dado.

## Como usar as portas neste diagnóstico

Antes de propor qualquer ajuste, leia o agente e a versão com `ler_porta` (`ai/agents/:id`, `ai/agents/:id/versions`). Teste a versão nova com `testar_agente` (`ai/agents/:id/versions/:vid/test`) antes de publicar. Só o administrador aplica, via cartão de `propor_mudanca`.

      $corpo_promptdiag$,
      '{"any_keywords":["prompt","agente responde errado","diagnostico","antes e depois","testar o prompt","otimizar o agente"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-prompt-diagnostico', v_id);
  end if;

  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-prompt-anatomia'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-prompt-anatomia', 'Anatomia do prompt final: o que o motor monta a cada resposta, onze portões de saída, o que o prompt controla, anti-padrões medidos e o checklist de revisão. Complementa a skill curta `assistente-prompt` (8003).',
      $corpo_promptana$# Anatomia do prompt final — e os anti-padrões medidos no código

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

## O que o motor monta a cada resposta (v1.17.0)

**Sistema (estável, em cache):** regras de compliance da plataforma (apresentar-se como assistente virtual, não fingir humano, não pedir dado sensível, não inventar preço, mensagens curtas, emoji com parcimônia) → **o prompt do agente** (a versão publicada) → memória da organização (documento + aprendizados ativos) → índice de skills → blocos fixos (nunca narrar problema interno; abrir caso antes de prometer humano; nunca confirmar agenda sem usar a ferramenta).

**Usuário (por cliente, volátil):** checkpoint anterior (compromissos, objeções, próxima ação), resumo acumulado, estado no funil, índice de notas, compromissos, contexto do lead, a mensagem atual, "agora é…", corpo das skills que casaram por palavra-chave, dica do classificador de etapa, dica de divisão de mensagem.

**Saída — onze portões, nesta ordem:** STOP, LGPD, ritmo de envio, janela de 24 h, cópia repetida, promessa fora da tabela, promessa sem caso aberto, vocabulário interno, agenda sem ferramenta, aviso de IA. O veto volta ao modelo como erro de ensino — ele tenta de novo; cada tentativa custa.

**Chamadas por turno:** ao menos duas (o turno e o checkpoint) com o **mesmo** sistema. Prompt grande dobra o custo. Temperatura, comprimento e idioma **não** são botões por agente — é texto.

## O que o prompt controla

Persona e contexto do negócio; diagnóstico antes da oferta; qualificação; o que dizer em cada situação; quando usar uma capacidade (pelo que ela faz, nunca pelo nome); limites por situação; tom, tamanho, uma pergunta por vez; o que registrar para o retorno.

## Anti-padrões medidos (cada um tem um defeito real por trás)

| anti-padrão | o que acontece | o conserto |
|---|---|---|
| "Encaminhe ao gerente Fulano tudo que não souber" | o modelo responde "vou confirmar com o Fulano" **em vez de usar a agenda**; medido num agente real | limite só a situações que nenhuma capacidade cobre; nomeie situações, não pessoas |
| "USE as ferramentas", "chame `update_lead_state`", "mantenha a casa em ordem" | prompt na voz de operador vazou jargão em 30% dos turnos; na voz de atendimento, 0% — com as mesmas ferramentas | fale do que a capacidade faz ("ofereça horários", "consulte os materiais") |
| "lead", "etapa qualified", "webhook", "admin", "uuid" | veto de vocabulário interno; o prompt é a origem | vocabulário do cliente (paciente, consulta, pedido) |
| "não invente preço", "apresente-se como assistente", "respeite STOP", "não mande de madrugada" | já é portão; só gasta contexto | corte |
| desconto ou prazo no prompt acima da tabela de promessas | veto de promessa | alinhe com a tabela; sem tabela, o portão não age — crie a tabela |
| preço e prazo em texto quando há catálogo/materiais | duas fontes de verdade; o modelo escolhe uma | "consulte os materiais antes de responder preço, prazo, política" |
| `{{nome}}`, `{{empresa}}` | o motor não substitui placeholders; injeta contexto por conta própria | texto direto |
| "resuma no fim", "leia o histórico antes de repetir a pergunta", "que dia é hoje" | já vem no contexto de cada turno | corte |
| um único bloco de 3 mil palavras | custo dobrado por turno, atenção diluída | mova conteúdo situacional para skills do produto (corpo só entra no assunto) |
| instruir "mover o lead" num agente sem funil na versão | capacidade que o agente não tem naquele turno | confira `pipeline_ids` e capacidades da versão antes de instruir |

## Checklist de revisão (marque cada linha com o trecho do prompt)

1. Identidade em uma frase: quem, para quem, o que o negócio faz.
2. Diagnóstico: 2-4 perguntas, uma por vez, antes de qualquer oferta.
3. Decisão: "se X, faça Y" para os 3-5 caminhos mais comuns.
4. Situações do nicho: objeção de preço, "vou pensar", fora do escopo, urgência.
5. Capacidades pelo que fazem; nenhuma pelo nome.
6. Limites por situação; passagem para humano por situação, não por pessoa.
7. Estilo: tamanho, uma pergunta, emoji.
8. Nada que seja portão do motor; nada com jargão; nada com placeholder.
9. Tamanho: cabe em uma tela? Se não, o que vai para skill do produto?

## Skills do produto — o lugar do conteúdo condicional

Um roteiro situacional (objeção de preço, reativação depois de 30 dias, agendamento) vira uma skill da organização: índice sempre presente, corpo só quando a palavra-chave aparece. Corpo curto e imperativo, palavras-chave em português sem acento (a normalização remove), no máximo 200 linhas. Skills de plataforma `agendamento` e `objecao-preco` já valem para todos.

## Como usar as portas neste guia

O texto do prompt vai na versão do agente: `ai/agents/:id/versions` (POST cria a versão em rascunho; PATCH ajusta o rascunho). Leia o agente e a versão atual com `ler_porta` (`ai/agents/:id`, `ai/agents/:id/versions`) antes de reescrever; mudança em agente publicado é SEMPRE versão nova em rascunho. Teste com `testar_agente` (`ai/agents/:id/versions/:vid/test`) antes de publicar. Publicar é decisão do administrador, depois de ver o teste.

      $corpo_promptana$,
      '{"any_keywords":["anatomia do prompt","portoes de saida","anti-padroes","o que o prompt controla","checklist de revisao"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-prompt-anatomia', v_id);
  end if;

  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-metricas-regua'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-metricas-regua', 'Como analisar métricas de uma instalação: régua ao lado de cada número, agregados nunca texto, fuso, sent_at vs created_at, três handoffs, LGPD e o que pode sair do banco. Complementa a skill curta `assistente-metricas` (8003).',
      $corpo_metricas_regua$# Analisar as métricas de uma instalação

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

O produto mostra números em várias telas — Desempenho, Radar de risco, Uso e orçamento, Evolução da IA, Execuções, Atividades — e cada uma usa a própria régua: "handoff" tem **três definições** diferentes em três telas; "ganho" é `crm_leads` numa e a transição do agente noutra; um dia é UTC numa tela e o fuso da organização em outro. Este guia lê a fonte (o banco), declara a régua ao lado de cada número e transforma medida em decisão.

## Como você age

- **Pergunta de negócio primeiro, consulta depois.** "A conversão caiu?" vira: qual funil, qual período, comparado a quê, medido por qual definição. Sem isso, o número não responde nada.
- **Agregados, nunca o texto.** Você lê contagens, medianas, taxas e enums. Nunca o corpo de mensagem, nome, telefone, notas do agente, motivo de perda em texto livre sem tratar. LGPD nativa: o que sai do banco para o modelo é só o que a anonimização preserva (ids, datas, estados, valores).
- **Régua ao lado do número.** Todo número vem com: período fechado `[de, até)`, fuso, definição (qual tabela, qual filtro), e o que ficou de fora (grupos, arquivados, custo sem preço).
- **`null` não é zero.** "Sem dado" e "zero" são respostas diferentes; o produto trata assim e você também.
- **Compare com uma referência.** Período anterior, outro agente, outro funil, ou a meta que a pessoa disse. Número solto não é análise.
- **Termine em ação.** Cada achado vira uma hipótese e um próximo passo: ajustar prompt (`deskcomm-prompt`), follow-up, horário do agente, base de conhecimento, equipe, ou "coletar mais 2 semanas".

## Passo 0 — onde está o dado e como chegar nele

Não há banco na VPS: o Postgres é o Supabase, alcançado pela connection string `SUPABASE_DB_URL` do `.env` da instalação (Session pooler). Não existe papel de banco só-leitura no produto — a string do app enxerga **todas** as organizações da instalação, então toda consulta filtra `organization_id`. Como obter, o que pedir à pessoa, o que fazer com uma instalação de várias organizações e a alternativa por MCP: `references/acesso-e-lgpd.md`.

## Passo 1 — a triagem do pedido

Uma pergunta por vez: qual organização (nome → id); período (padrão: últimos 30 dias fechados, comparados aos 30 anteriores); o que está incomodando (vender menos, demorar, gastar, perder); qual funil e quais agentes existem (você descobre no banco e confirma). Anote a régua escolhida antes de rodar qualquer coisa.

## Passo 2 — o panorama (sempre, antes de aprofundar)

Rode o bloco "panorama" de `references/consultas.md`: volume de mensagens recebidas por semana e por origem de resposta (IA, pessoa, celular), funil por origem com taxa de ganho sobre fechados e dias até ganhar, estagnação por etapa, handoffs (somando os dois runtimes), custo de IA por propósito com o furo de preço declarado, follow-ups por desfecho, conversas esperando resposta agora. Apresente em uma tabela por bloco, com a régua embaixo.

## Passo 3 — aprofunde onde dói

| sintoma | consultas | o que costuma explicar |
|---|---|---|
| "vende menos" | funil por origem; motivos de perda; estagnação por etapa; fluxo entre etapas por ator | etapa gargalo; motivo de perda concentrado (preço, sumiu); origem que caiu |
| "demora / cliente reclama" | 1ª resposta por hora do dia (IA × humano); conversas esperando agora; horários de pico × janela do agente | agente fora da janela nos horários de pico; humano assume e demora |
| "o agente passa tudo para pessoa" | handoffs por agente; vetos por portão; casos por desfecho | prompt manda encaminhar demais; portão de promessa/vocabulário vetando |
| "gasta muito com IA" | custo por propósito/modelo; custo por contato qualificado e por ganho; chamadas sem preço | classificadores em modelo caro; turno com prompt gigante; custo desconhecido em modelo fora da tabela de preços |
| "follow-up não funciona" | desfecho por fluxo/versão; promessas de retorno com resposta em 48 h | esperas longas demais; mensagem genérica; muitos `esgotado` |
| "a base não responde" | consultas ao conhecimento: acertos, quase-acertos, limiar | material não cobre; limiar apertado |

Cada achado: o número, a régua, a comparação, a hipótese, o próximo passo. As armadilhas que distorcem cada leitura — fuso, `sent_at` × `created_at`, grupos, anonimizados, tetos de linhas, três definições de handoff — estão em `references/regua-e-armadilhas.md`. Leia antes de afirmar.

## Passo 4 — o relatório

```markdown
# {Organização} — {período} (fuso {tz}) · comparado a {período anterior}
## Em uma frase
## O que está bem (3 números, com régua)
## O que está travando (achado → hipótese → próximo passo)
## Custo de IA (total, por propósito, o que ficou sem preço)
## O que NÃO medi e por quê
```

Grave o relatório onde a pessoa pedir (`relatorio-<org>-<data>.md`). Números na tabela, prosa curta. Se o próximo passo é otimizar o prompt, passe o bastão ao guia `deskcomm-prompt` com os achados — ele precisa deles para não otimizar no escuro.

## O que você nunca faz

- Não lê `messages.body`, `lead_checkpoints`, notas, `crm_leads.title`, telefone, nome — nem "só para entender". Se a análise exigir ler conversas, é o guia de prompt, com amostra mínima e consentimento da pessoa.
- Não roda `SELECT *` em tabela com dado pessoal; não copia linhas para arquivo fora da instalação.
- Não escreve no banco. Nunca.
- Não compara número de tela com número de consulta sem declarar que as réguas diferem.
- Não afirma tendência com uma semana de dado: diz que é cedo e quando voltar a medir.

## Como usar as portas neste guia

O assistente não roda SQL. Leia as portas com `ler_porta` e consulte métricas com `listar_metricas` e `consultar_metrica`. Cada número vem com a régua ao lado; se a tela e a consulta divergem, é por causa do fuso ou dos tetos silenciosos da tela, antes de qualquer outra hipótese.

      $corpo_metricas_regua$,
      '{"any_keywords":["metricas","analise de instalacao","regua","fuso horario","handoff","lgpd","anonimizacao"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-metricas-regua', v_id);
  end if;

  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-metricas-consultas'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-metricas-consultas', 'Consultas prontas para métricas: panorama (P1-P9), aprofundar (A1-A9) e inventário, cada uma com o que medir, como ler por porta/ferramenta (`ler_porta`, `consultar_metrica`) e a régua declarada. Complementa a skill curta `assistente-metricas` (8003).',
      $corpo_metricas_consultas$# Consultas prontas — o que medir, por qual porta/ferramenta, com a régua declarada

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

O assistente **não roda SQL**. Cada consulta abaixo vira uma descrição do que medir e por qual porta/ferramenta ler: `listar_metricas`, `consultar_metrica`, `ler_porta`, `procurar_porta`. Parâmetros: `:org` (uuid da organização), `:de` e `:ate` (timestamptz; janela `[de, ate)`). Toda leitura filtra `organization_id`.

## Panorama

**P1 — Quem fala e quando: mensagens recebidas por dia da semana × hora (fuso da organização)**

O que medir: quantas mensagens recebidas (`direction='inbound'`) e quantas conversas distintas, agrupadas por dia da semana e hora, no fuso da organização (`organizations.timezone`).

Como ler: `ler_porta` em `messages` (filtrando `direction='inbound'`, `c.is_group = false`) e `consultar_metrica` de volume de mensagens recebidas por período.

Régua: janela `[de, até)`, fuso da organização. Nunca o corpo da mensagem.

**P2 — Quem responde: envios por semana e por origem (IA, pessoa, celular, automação)**

O que medir: envios (`direction='outbound'`) por semana e por `sent_via` (`ai`, `user`, `external_device`, `automation`, `crm`, `system`), com falhas (`status='failed'`).

Como ler: `consultar_metrica` de envios por origem e período.

Régua: `sent_at` no fuso da organização.

**P3 — Funil por origem: leads, ganhos, perdidos, taxa sobre fechados, dias até ganhar, receita**

O que medir: por `source` e `currency`, total de leads, ganhos (`status='won'`), perdidos (`status='lost'`), abertos, taxa de ganho sobre fechados, dias até ganhar (mediana), receita ganha (`value_cents` de leads ganhos).

Como ler: `consultar_metrica` de funil por origem e período, agrupado por `source` e `currency`.

Régua: leads **criados** na janela; `currency` é grupo: uma linha por moeda, nunca somar real com euro.

**P4 — Onde o funil trava: estagnação por etapa (foto de agora)**

O que medir: por funil e etapa, leads abertos, horas na etapa (mediana), acima do esperado, em risco/critico, com dono agente.

Como ler: `consultar_metrica` de estagnação por etapa, filtro `status='open'` e `is_archived=false`.

**P5 — Handoffs por agente (proxy) e por mensagem recebida — soma os dois runtimes**

O que medir: handoffs por agente (nome ou "(sem agente atribuído / runtime legado)") e razão de handoffs por mensagem recebida.

Como ler: `consultar_metrica` de handoffs, somando `agent_inbox_items.kind='handoff'` e `event_log.event_type='ai.handoff_triggered'`.

Régua: agente **atual** da conversa, não o do momento do handoff.

**P6 — Custo de IA por propósito, provedor e modelo — com o furo de preço declarado**

O que medir: por `purpose`, `provider`, `model`: chamadas, erros, tokens in/out/cache, custo em centavos de dólar, chamadas sem preço, latência p50 e p95.

Como ler: `consultar_metrica` de custo de IA por período.

Régua: custo em centavos de dólar. `cost_cents` é nulo quando o modelo não está na tabela de preços — sempre imprima o count de chamadas sem preço ao lado.

**P7 — Follow-ups que convertem: desfecho por fluxo e versão**

O que medir: por fluxo e versão, inscrições, convertidos, responderam, esgotados, opt_out, handoff, em voo, mortos por infra, taxa de conversão, passos p50.

Como ler: `consultar_metrica` de follow-ups por desfecho e período.

**P8 — Quem está esperando agora: conversas com a última palavra do cliente**

O que medir: por status e quem atende, conversas, caladas há 4h, caladas há 24h, horas esperando p90.

Como ler: `consultar_metrica` de conversas esperando resposta, filtro `last_inbound_at > last_outbound_at`.

Régua: conversa não resolvida/fechada/arquivada, não-grupo, com última palavra do cliente.

**P9 — Os índices oficiais do produto, prontos (para bater com a tela)**

O que medir: `fn_atrito_metrics` (abandono 72h, similaridade 0,7, espera 4h) e `fn_attendant_metrics` (funil aberto + ganhos/perdidos/conversas/1ª resposta humana por atendente).

Como ler: `consultar_metrica` dos índices oficiais.

Régua: leia `abandono_horas` real de `organizations.settings->'atrito'->>'abandono_horas'` antes, para bater com a tela.

## Como usar as portas neste guia

Antes de qualquer análise, descubra o `organization_id` da organização (`organizations`). Toda leitura filtra `organization_id`. Use `ler_porta` para ler catálogos e `consultar_metrica` para métricas agregadas. Nunca o corpo da mensagem; nunca texto de conversa.

      $corpo_metricas_consultas$,
      '{"any_keywords":["consultas prontas","funil","handoffs","custo de IA","follow-up","panorama de metricas"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-metricas-consultas', v_id);
  end if;

  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-sistema-vivo-completo'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-sistema-vivo-completo', 'Sistema Vivo: gate de arquitetura com o Living System Checklist, 7 invariantes, regra do tempo, receitas, red flags e o binding do DeskcommCRM (event_log, audit, navigation/registry, follow-up, human-handoff, docs/architecture). Complementa a skill curta `assistente-sistema-vivo` (8007).',
      $corpo_sistema_vivo_completo$# Sistema Vivo — gate de arquitetura

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

Esta skill é o **gate operacional**. A lei está em `docs/doctrine/sistema-vivo.md`; o racional completo, no manual `docs/doctrine/sistema-vivo/`.

> **Portabilidade:** as seções 1 a 6 são universais — valem em qualquer sistema que adote a doutrina. A seção 7 (*Binding*) é o que muda de repositório para repositório. Ao levar esta skill para outro sistema, **reescreva só a seção 7**.

## 1. O princípio em uma frase

O sistema é responsável pela **linha do tempo inteira de cada demanda** — alguém interessado ou alguém com um problema — até a resolução ou o encerramento declarado pela própria pessoa.

Nada morre por falta de resposta, de resolução, ou porque ninguém viu. Toda peça é um polvo: recebe e distribui.

## 2. O checklist — responda ANTES de declarar pronto

```
Living System Checklist — <nome da peça>

[ ] 1. Quem me alimenta?          → aresta de entrada; fonte real e confiável
[ ] 2. Quem eu alimento?          → aresta de saída; "ninguém" = ilha
[ ] 3. Que registro eu emito?     → atividade / auditoria / evento
[ ] 4. Onde eu apareço na tela?   → registro só no banco é registro morto
[ ] 5. Por qual porta se chega?   → ter tela ≠ ser alcançável
[ ] 6. Qual meu anti-morte?       → próximo passo garantido, ou justificativa
[ ] 7. Onde se configura?         → ver + mudar + o que aparece se faltar
[ ] 8. Qual a continuidade?       → IA↔humano, nas DUAS direções
[ ] 9. Qual meu laço de retorno?  → o que muda no sistema quando eu erro
[ ] 10. Atualizei o mapa?         → peça nova entra com ≥2 arestas
```

**Como se responde mal, e é o padrão:** respondendo o que a peça *poderia* fazer. A resposta válida **nomeia o artefato concreto** — o consumidor real, a tela real, o log real. *"Vai aparecer no painel"* não é resposta; *"aparece na timeline do lead, renderizada por `<componente>`"* é.

**"Nenhum" é aceitável** nas perguntas 6 e 9, **com justificativa escrita**. Peça de leitura pura não tem anti-morte. Dívida declarada não é defeito; dívida presumida é.

## 3. Os 7 invariantes

| # | Invariante | Violação típica |
|---|---|---|
| 1 | **Nada é ilha** — ≥1 aresta de entrada e ≥1 de saída | CRUD disfarçado de feature |
| 2 | **Continuidade nas duas direções** — IA→humano entrega contexto pronto; humano→IA deixa input estruturado | Handoff que entrega conversa crua: transferiu custo, não contexto |
| 3 | **Log universal e visível** — emite atividade E aparece na tela | Log só no banco: ninguém lê, não muda decisão |
| 4 | **Nenhuma demanda sem próximo passo** — follow-up é o anti-morte | Silêncio tratado como neutro. Não é: é a perda mais comum e a mais invisível |
| 5 | **Informação com propósito** — todo dado responde "e daí?" | Painel de vaidade: números que sobem e não mudam nada |
| 6 | **Configuração tem superfície** — ver + mudar + falha visível | Mecanismo invisível que funciona; quando falha, falha sem culpado |
| 7 | **Todo laço se fecha** — decisão automática tem retorno que altera decisão futura | Esteira: 1–6 satisfeitos e o sistema não aprende nada |

**O 7 é o mais fácil de perder.** O 1 garante *caminho*; o 7 garante *ciclo*. A pergunta que expõe: **quando o sistema erra, o que muda nele?** Se a resposta é "fica no log", o log é estoque morto.

## 4. A regra do tempo

> **Observação em tempo real. Ação no tempo apropriado ao humano do outro lado.**

- **Observar** em realtime é direito do humano: painel, inbox, fila, falha, conversa ao vivo. Informação atrasada faz o anti-morte (invariante 4) chegar atrasado junto.
- **Agir** em realtime costuma ser errado. Quanto mais irreversível o efeito, maior o intervalo entre decidir e consumar. **Enviar mensagem a uma pessoa é irreversível** e nunca é operação comum.
- **Interruptibilidade:** o sistema nunca deve ser mais rápido do que o humano consegue interromper.

Nunca escreva "tudo em realtime" numa spec. Diga *quem observa* e *o que age*.

## 5. Receitas

### Implementar uma peça nova

1. **Localize antes de criar** — descubra de quem recebe e quem deve alimentar. Metade das ilhas nasce de desconhecimento do que já existe.
2. **Escreva as duas arestas primeiro** — antes da lógica interna. Se não consegue nomear as duas, a peça ainda não tem lugar no sistema.
3. **Log no mesmo commit da mutação** — log adicionado depois nunca é adicionado.
4. **Leve até a tela** — peça que funciona e não aparece falha sem culpado.
5. **Dê a porta** — registre o destino na navegação.
6. **Nomeie o laço** — o que muda quando ela acerta? e quando erra?
7. **Atualize o mapa** — arquitetura sem mapa é ilha de informação.

### Desilhar uma peça existente

1. **Meça antes de opinar** — quem chama, quem lê. Por ferramenta, não por memória.
2. **Ache o consumidor natural** — quase sempre já existe alguém que deveria ler aquilo.
3. **Uma aresta real vale mais que duas decorativas.**
4. **Sem consumidor, o caminho é remover.** Peça sem consumidor é dívida com aparência de recurso.

## 6. Red flags — pare e reconecte

| Sinal | Invariante ferido |
|---|---|
| "É só um CRUD de X" | 1 — X vivo tem métrica, log, destino de handoff, timeline |
| Mutação sem atividade emitida | 3 |
| Dado na tela que não muda decisão | 5 — ruído compete com o que importava |
| Demanda aberta sem próximo passo | 4 — algo vai morrer sem ninguém ver |
| Peça nova fora do diagrama | 3, aplicado à documentação |
| Handoff entrega conversa crua | 2 |
| Configuração só alterável no banco | 6 |
| Decisão automática sem sinal de retorno | 7 |
| "Vamos medir depois" | Nunca. A instrumentação some entre a intenção e o merge |
| Métrica de eficiência sem contra-métrica de dano | 5 — o sistema vai se otimizar contra si mesmo |

## 7. Binding — DeskcommCRM

> Reescreva **apenas esta seção** ao levar a skill para outro sistema.

| Pergunta do checklist | Neste repo |
|---|---|
| Que registro eu emito? | `event_log` (side effects) · `audit()` de `lib/audit/` → `api_audit_log` · `crm_lead_activities` (timeline do lead) |
| Onde apareço na tela? | Timeline no inbox · Radar de Risco (`/app/radar`) · painéis em `app/app/` |
| Por qual porta se chega? | `lib/navigation/registry.ts` — ou allowlist **com justificativa escrita** em `tests/unit/navegacao-completude.test.ts` |
| Qual meu anti-morte? | Motor de follow-up (`lib/followup/`, `lib/agent-engine/cron/`) + Radar de Risco |
| Qual a continuidade IA↔humano? | `buildHandoffSummary()` em `lib/agent-engine/agent/human-handoff.ts` |
| Atualizei o mapa? | `docs/architecture/*.json` (fonte da verdade). **Sem re-render:** o archify 2.11.0 recusa o formato `architecture` — ver `docs/architecture/README.md` |

**Orientação antes de implementar:** rode `graphify query "<pergunta>"` sobre `graphify-out/` para descobrir de quem a peça recebe e quem ela deve alimentar — evita criar ilha por desconhecimento do que já existe.

**Gates mecânicos ligados:** completude de navegação (`tests/unit/navegacao-completude.test.ts`) · forma da cadeia de envio (`tests/unit/before-send-chain-shape.test.ts`) · isolamento entre organizações (`tests/invariants/`).

**Não substitui outras doutrinas — rode junto:** Schema, RLS, migrations, DIRC → `CLAUDE.md`; Canais externos → `docs/doctrine/restricao-de-canal.md`; Fala × operação → `docs/doctrine/separacao-fala-e-operacao.md`.

**Definition of Done:** o item "Living System Checklist" do `CLAUDE.md` é este mesmo checklist. A task não fecha sem ele.

## Quando ler o manual

A skill basta para a maioria das implementações. Vá ao manual (`docs/doctrine/sistema-vivo/`) quando: precisar do racional para convencer alguém (`01-fundamentos.md`); criar/revisar um invariante (`02-lei-dos-invariantes.md`); definir métrica, painel ou meta (`03-medida-do-proposito.md`); mexer em handoff, escalada, permissão ou autoridade da IA (`04-fronteira-de-autoridade.md`); mexer em lead, caso, conversa ou demanda (`05-unidade-de-demanda.md`); decidir sobre realtime, throttle, delay ou agendamento (`06-tempo-do-sistema.md`); tratar de adoção, contribuição, telemetria ou patrocínio (`07-o-projeto-como-sistema.md`); ligar um gate ou adotar a doutrina num sistema novo (`08-aplicacao.md`).

      $corpo_sistema_vivo_completo$,
      '{"any_keywords":["sistema vivo","gate de arquitetura","checklist","invariantes","red flags","binding"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-sistema-vivo-completo', v_id);
  end if;

end
$seed$;
