-- manifest: **Skills de plataforma do assistente com o conhecimento de implantação por nicho.** Semeia (`organization_id null`, idempotente) `assistente-triagem-do-negocio`, `assistente-telas-e-campos`, `assistente-prompt-do-agente` e `assistente-nichos-1`, `-2`, `-3`, vindas do guia humano deskcomm-cliente-novo: o assistente interno passa a conhecer a triagem, tudo o que cada área do sistema configura, a anatomia do prompt e os pacotes de seis nichos, e os propõe como cartões de aprovação pelas portas equivalentes. Cada corpo com no máximo 190 linhas. Apêndice igual no `baseline.sql`.

-- ---- skills do assistente: conhecimento de negócio (migration 8010) ----
do $seed$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-triagem-do-negocio'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-triagem-do-negocio', 'O que perguntar ao dono e em que ordem antes de configurar o atendimento, o funil e os agentes de um negócio.',
      $corpo_tri$# Triagem do negócio: o que perguntar, em que ordem, e por que o sistema precisa

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

Este roteiro vale quando o dono pede para configurar o atendimento, criar o agente ou montar o negócio e você ainda não sabe o suficiente. A pessoa sabe o negócio; você não. Pergunte UMA coisa por vez, só do que o sistema exige, e só o que `auditar_empresa` e os documentos do dono não respondem. Cada bloco existe porque uma regra do produto exige a resposta: o "por quê" está ao lado, para você explicar quando a pessoa hesitar. Registre as respostas numa nota curta com o que foi decidido e o que ficou [CONFIRMAR].

## Passo 0: onde a pessoa está

Pergunte, uma por vez, o que ainda não souber: a instalação está no ar e o onboarding terminou (nome do negócio, WhatsApp conectado, atendente básico, funil)? É para o próprio negócio ou para um cliente (agência implantando para terceiros)? Qual o nicho: clínica/consultório, imobiliária, serviços/agência/obra, curso/mentoria/infoproduto, loja, escritório de advocacia?

- Sem WhatsApp conectado, nada publica: o agente exige um número com status WORKING. Conectar o número é feito pelo dono na tela (`abrir_tela`); você pode ler o estado em `channel-sessions`.
- Nicho fora dos seis: use o pacote genérico (skill `assistente-nichos-3`) e adapte com a triagem.
- O onboarding do produto vai até o funil e os convites. O que faz o agente vender de verdade para o nicho (prompt que conhece o negócio, roteador, follow-ups, base de conhecimento, memória, capacidades) vem depois, e é o que você monta.

## Passo 1: a triagem, em 12 blocos

### 1. O negócio
- Como o negócio se chama e o que ele faz, em uma frase? Por quê: vira a primeira linha do prompt ("Você atende os clientes de X, que é: ...") e escolhe o pacote do nicho.
- Razão social e cidade/fuso horário? Por quê: a razão social nomeia o controlador nos documentos de LGPD; o fuso decide "que horas são" para o agente e a janela de envio.
- Quem é o cliente típico e o que ele costuma pedir primeiro? Por quê: é o diagnóstico que o agente faz antes de oferecer.

### 2. O canal
- Qual número de WhatsApp vai atender (já conectado)? Por quê: o agente exige um número com status WORKING para publicar.
- Horário em que o agente responde (dias, início, fim)? Por quê: fora da janela o turno é adiado, não perdido; a pessoa precisa saber que o cliente das 23h só recebe resposta de manhã.
- Quantas mensagens por dia esse número aguenta? (número novo = aquecimento) Por quê: limite diário e aquecimento evitam bloqueio do WhatsApp.

### 3. A IA
- Qual provedor (OpenRouter, Anthropic, OpenAI, Google) e a chave? Por quê: a credencial precisa ser VALIDADA para publicar; Google só funciona como credencial da organização. A chave é cadastrada pelo dono na tela; você nunca recebe nem guarda chave.
- Tem chave da OpenAI para áudio e base de conhecimento? Por quê: sem ela o agente não ouve áudio nem consulta documentos, e não avisa.
- Teto de gasto mensal com IA? Por quê: o produto pausa o agente ao estourar; sem teto, não pausa. Teto de gasto é decisão do dono na tela.

### 4. O funil
- As etapas do pacote do nicho servem? Quer renomear alguma? Por quê: exatamente uma etapa "ganhou" e uma "perdeu"; de 4 a 8 etapas.
- Como vocês chamam o cliente, o negócio, o "ganhou" e o "perdeu"? (paciente/consulta marcada; interessado/fechou) Por quê: é o vocabulário que aparece na tela e que o agente usa para não falar "lead" com paciente.
- Motivos de perda que valem registrar? Por quê: vão para a lista de motivos e para a análise depois.

### 5. Os agentes
- Um agente só, ou papéis separados (recepção/vendas/suporte/pós-venda)? Por quê: mais de um agente no mesmo número exige roteador.
- Como o agente se chama e em que tom fala (caloroso, objetivo, formal)? Por quê: tom é texto no prompt; não há botão.
- O que ele PODE fazer sozinho: agendar, mover no funil, mandar proposta, dar desconto até X? Por quê: capacidades e tabela de promessas.
- O que ele NUNCA faz e quando chama uma pessoa (palavras-gatilho, situações)? Por quê: palavras de passagem para humano + casos.
- O que a pessoa do time precisa receber quando assume (resumo, o que já foi prometido)? Por quê: o handoff entrega isso; o prompt pode pedir o que registrar.

### 6. O roteador (só com 2 ou mais agentes no mesmo número)
- Que assuntos vão para cada agente? Três exemplos de frase de cliente por assunto. Por quê: intenção = nome + descrição + exemplos; o classificador decide por eles.
- Quem atende quando não dá para saber? Por quê: agente de fallback.
- O cliente fica com o mesmo agente na conversa? Por quê: modo "grudado" (sticky).

### 7. Os follow-ups
- O que fazer quando o cliente some no meio (após quanto tempo, quantas vezes, com que mensagem)? Por quê: gatilho por silêncio + esperas + mensagens; no máximo o que o número aguenta.
- Situações próprias do nicho: faltou à consulta, abandonou o pagamento, não respondeu o orçamento. Por quê: gatilhos de no-show, mudança de etapa, caso aberto.
- O que PARA o follow-up (respondeu, pediu humano, pediu para parar)? Por quê: política de handoff e cancelamento por resposta.

### 8. Conhecimento
- Perguntas que os clientes mais fazem e as respostas oficiais (10 a 30). Por quê: FAQ, a fonte mais barata e mais usada.
- Documentos (PDF/MD/TXT até 20 MB cada): tabela de preços, políticas, catálogo, manual. Por quê: fontes por documento; catálogo de loja vem da integração.
- O que o agente NÃO deve responder mesmo sabendo? Por quê: limites no prompt + passagem para humano.

### 9. Memória da organização (regras da casa)
Fatos que valem para TODOS os agentes: "não abrimos domingo", "só atendemos maiores de 18", "parcelamos em até 6x sem juros", "o endereço é...". Curtos, um por linha.

### 10. Promessas e limites comerciais
Piso de preço, desconto máximo, parcelas máximas. O produto veta promessa fora da tabela, mas só se a tabela existir.

### 11. Automações e integrações
Formulário do site, anúncios (Meta), loja (Nuvemshop), agenda (Google): o que entra no funil e o que o agente faz quando entra. Você não cria automação que envia mensagem; descreva ao dono o que ele precisa ligar na tela.

### 12. O time
Quem atende quando a IA passa, com que e-mail e papel (atendente, gerente, admin); como as conversas se distribuem (manual ou rodízio). Equipe e papéis são do dono, na tela; você só registra o que ele precisa fazer.

## O que você não pergunta

Nada técnico (modelo exato, temperatura, tokens): você escolhe pelo pacote e explica em uma frase. Nada que esteja nos documentos que a pessoa entregou ou que `auditar_empresa` já mostra: leia antes de perguntar.

## O que você nunca faz

- Não inventa regra de negócio: preço, prazo, política de cancelamento, horário vêm da pessoa ou dos documentos. O que não está escrito vira pergunta ou [CONFIRMAR], nunca suposição.
- Não publica versão de agente: publicar é ato humano, depois que a pessoa vê o teste e manda publicar.
- Não liga capacidade crítica (enviar mensagem avulsa, cancelar agenda, fechar caso) sem dizer ao dono o que ela permite ao agente fazer sozinho; ligar é decisão humana.
- Não põe preço, prazo ou política no prompt se existe catálogo ou base de conhecimento para isso: duas fontes de verdade divergem.
$corpo_tri$,
      '{"any_keywords": ["triagem", "triar", "perguntar ao dono", "o que perguntar", "antes de configurar", "configurar o atendimento", "configurar o cliente", "cliente novo", "montar o atendimento", "implantar", "implantação", "implantacao", "onboarding", "e agora", "briefing", "levantamento", "nicho", "pacote do cliente", "agência", "agencia"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-triagem-do-negocio', v_id);
  end if;
  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-telas-e-campos'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-telas-e-campos', 'Roteiro de tudo o que cada área do atendimento com IA configura (conexões, credenciais, provedores, funil, conhecimento, follow-ups, agentes, roteadores, memória, skills), campo a campo e na ordem que o sistema impõe.',
      $corpo_tel$# Telas e campos: tudo o que cada área do sistema configura, e a ordem que o sistema impõe

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

Este é o roteiro de TUDO que cada área do atendimento com IA tem para configurar. Cada peça exige a anterior: o sistema recusa publicar agente sem número conectado e sem credencial validada; fluxo de follow-up só roda publicado; material de conhecimento só vale com indexação pronta. Por isso a ordem abaixo importa. Nunca crie nada fora das portas (nada de SQL): o motor lê a VERSÃO PUBLICADA do agente, não a tabela; editar direto não muda nada e pula a auditoria.

## A ordem de montagem (o sistema impõe)

1. Conexões: o número precisa estar WORKING (o onboarding já fez). Leia em `channel-sessions`.
2. Credenciais de IA: a chave do provedor (validada em segundo plano; só credencial validada publica) e, se a IA não for OpenAI, a chave da OpenAI para áudio e base de conhecimento. Chave é cadastrada pelo dono na tela; você nunca a recebe.
3. Provedores: o modelo dos auxiliares (classificador do roteador, follow-up) num modelo barato; o do atendimento num modelo que usa ferramentas. Leia em `ai/providers`.
4. Funil: etapas do pacote, exatamente uma "ganhou" e uma "perdeu", o mapa dos passos do agente, vocabulário.
5. Conhecimento: FAQ (pares pergunta/resposta) e documentos (PDF/MD/TXT até 20 MB); a indexação é assíncrona e precisa da chave da OpenAI; confira o status "pronto".
6. Follow-ups: crie, monte o fluxo (gatilho, espera, mensagem, condição, fim), publique. Fluxo não publicado não roda.
7. Agentes: um agente por papel (prompt, provedor/modelo/credencial, canal, funis que ele pode mover, fontes de conhecimento, follow-ups que arma, capacidades, palavras de passagem para humano, casos). Salve como rascunho.
8. Testar: roda o motor real em modo sandbox com uma mensagem.
9. Publicar: ato do administrador. Só depois: roteadores (dois ou mais agentes no mesmo número), memória (regras da casa), skills, automações, convites do time.

## 1. Conexões: o número (pré-requisito de tudo)

O onboarding conecta por QR. Para conferir: o número aparece com status WORKING (`channel-sessions`). Número novo em modo de teste (lista de telefones autorizados) fica assim até alguém liberar na Central de avisos: o agente não responde a estranhos até lá. Proteção de envio (janela, ritmo, aquecimento) fica no próprio número. Conectar, reconectar e liberar número são do dono, na tela: aponte com `abrir_tela`.

## 2. IA, Credenciais

Adicionar: provedor (Anthropic, OpenAI, Google, OpenRouter), um nome ("Chave principal") e a chave. A validação roda em segundo plano contra o provedor; só credencial VALIDADA publica um agente. Sem credencial, o agente pode usar a chave da instalação (a do `.env`) para Anthropic, OpenAI e OpenRouter; Google só funciona como credencial cadastrada aqui. A chave da OpenAI para áudio e base de conhecimento entra aqui também. Não há porta para você escrever credencial: peça ao dono que cadastre e depois confira que está validada.

## 3. IA, Provedores

Um modelo por PONTO DE USO: atendimento (precisa usar ferramentas), roteador (classificador; um modelo barato basta), follow-up, transcrição de áudio, embeddings (fixo: `text-embedding-3-small` da OpenAI). "Automático" usa o provedor padrão da organização. É aqui que se troca de provedor depois da instalação (`ai/providers`, `ai/providers/:provider/models`). Troca de provedor e teto de gasto (`ai/budget`) mexem em custo: explique o efeito ao dono antes de qualquer cartão.

## 4. Funil: etapas, passos do agente, vocabulário, motivos

Portas: `pipelines`, `pipelines/:id/stages`, `pipelines/:id/stages/:stageId`, `pipelines/:id/config`, `pipelines/:id/agent-mapping`. Crie o funil com o nome do pacote; etapas na ordem, marcando EXATAMENTE uma como ganhou (`is_won`) e uma como perdeu (`is_lost`): o sistema recusa duas. Em cada etapa, o PASSO DO AGENTE (novo, contatado, qualificando, qualificado, negociando, ganhou, perdeu): é o mapa que deixa o agente mover o lead; etapa sem passo o agente não usa. Cada etapa serve a um passo só. Ganho e perda o sistema liga sozinho às etapas marcadas. Vocabulário (como chamar cliente/negócio/ganhou/perdeu) e motivos de perda e de ganho ficam na configuração do funil (`config`). Campos personalizados: key minúscula sem espaço, label e type (text, number, date, currency, boolean, select com options). O primeiro funil ativo vira o padrão. Funil novo vai completo num cartão só (ver a skill `assistente-montar-negocio`).

## 5. IA, Conhecimento ("O que o agente sabe")

Porta: `ai/knowledge/sources` (POST cria; `ai/knowledge/sources/:id` ajusta; `ai/knowledge/sources/:id/reindex` reindexa). Adicionar material, por tipo: FAQ (pares pergunta/resposta; em markdown com `## Pergunta:` / `## Resposta:`, ou os pares preenchidos), documento (PDF, MD ou TXT até 20 MB; ou texto colado), catálogo (vem da loja integrada) e conversas (aprendizado automático). Nome único por material. A indexação é assíncrona: o material aparece como "pronto" quando indexado; sem chave da OpenAI ele fica sem indexar e a tela avisa. Materiais são da organização; cada agente escolhe quais usa. Depois de aplicar, leia a lista e confira o status de cada fonte.

## 6. IA, Follow-ups ("Fluxos")

Começar de um modelo é o caminho curto (`ai/followup-flows/from-model`; a lista de modelos está em `ai/followup-flows/modelos-aprovados`). Para clínica é o caminho certo: quatro fluxos prontos, com os textos escritos: consulta (retomar quem sumiu na marcação, dispara com um dia de silêncio), exame (marcar o que foi pedido, dispara na etapa do funil escolhida), cirurgia (acompanhar a decisão por quase três meses) e falta (remarcar quem não veio, dispara quando alguém confirma a falta na agenda). Instalar NÃO manda mensagem: o fluxo nasce rascunho, com o gatilho armado, para a pessoa ler os textos na voz do negócio. Nos quatro, responder qualquer coisa encerra o fluxo e devolve a conversa a quem atende.

ATENÇÃO: depois de instalar faltam DOIS passos, e sem eles o fluxo fica vivo na lista e morto no motor: PUBLICAR o fluxo (decisão do administrador) e ligar o fluxo no agente (campo "follow-ups que arma"). Gatilho automático só cria inscrição se um agente PUBLICADO arma o ponteiro. Uma verificação de hora em hora abre na Central de avisos um aviso por fluxo publicado que nenhum agente arma, e o fecha sozinha quando o vínculo aparece. Vale para silêncio, cliente voltou, etapa, atendimento aberto e falta; manual e webhook funcionam sem agente e não geram aviso.

Novo fluxo (`ai/followup-flows`, `ai/followup-flows/:id`): nome único. No editor:
- Gatilho: manual; silêncio por N minutos; cliente voltou depois de X sem falar (número + minutos/horas/dias, padrão 1 dia, teto 90 dias); mudança de etapa; falta a compromisso; caso aberto; webhook; com "cancelar quando responder".
- Nós: espera (fixa, de 5 min a 90 dias, ou inteligente com mínimo/máximo); mensagem (texto, gerada pela IA com uma orientação, ou modelo de mensagem); condição (etapa, tag, passos dados, último desfecho); classificar resposta (até 8 classes, com carência mínima de 15 min); fim (convertido, esgotado, personalizado).
- Política ao passar para humano: pausar, cancelar ou seguir.
- Publicar (`ai/followup-flows/:id/publish`) valida o grafo: gatilho presente, nada inalcançável, caminho de fallback, ciclos só com espera. Rascunho não roda. Texto de mensagem sempre na voz do negócio, curto, sem pressão.

## 7. IA, Agentes

Portas: `ai/agents` (POST cria), `ai/agents/:id`, `ai/agents/:id/versions` (POST cria versão em rascunho; PATCH ajusta). Aba Configuração: nome, descrição, prioridade (desempata quando dois agentes publicados atendem o mesmo número); o PROMPT (ver a skill `assistente-prompt-do-agente`); provedor, modelo e credencial (ou "chave desta instalação"); o NÚMERO que atende; FUNIS em que pode mover leads (nenhum = só conversa); MATERIAIS que consulta; FOLLOW-UPS que arma; palavras de passagem para humano (padrão: "falar com humano", "atendente", "pessoa real"); casos (abrir demanda para o time); dividir mensagens longas; horário de atendimento (fora dele, adia).

Aba Capacidades: os pacotes (o pacote "vender" já traz agenda, catálogo, conhecimento, notas e funil) e as capacidades CRÍTICAS uma a uma (enviar mensagem avulsa, cancelar agenda, fechar caso); o teto é 25. Capacidade crítica NUNCA entra por pacote e ligar é decisão humana: diga ao dono o que cada uma permite ao agente fazer sozinho.

Propor o agente cria a VERSÃO 1 EM RASCUNHO. Mudou algo depois de publicado? É versão nova: versão publicada é imutável, e reverter cria outra a partir da anterior.

## 8. Testar (na versão, antes de publicar)

Porta: `ai/agents/:id/versions/:vid/test`. Uma mensagem, um contato fictício. Volta o texto que o agente mandaria, as ações que tentaria (oferecer horário, registrar, mover) e os portões que passaram ou vetaram. Consome crédito da IA: avise o dono antes. Sem histórico nem memória do lead: é o teste da primeira mensagem. Mostre ao dono o resultado em português simples.

## 9. Publicar

Publicar (`ai/agents/:id/publish`) é decisão humana: o administrador confirma na tela, depois de ver o teste. O sistema recusa com motivo claro quando falta credencial validada, o número não está WORKING, o modelo saiu do catálogo ou uma capacidade não existe. A publicação vale no próximo atendimento, sem reiniciar nada. Você deixa tudo em rascunho e diz o que falta para ele publicar.

## 10. IA, Roteadores (só com dois ou mais agentes no mesmo número)

Portas: `ai/routers`, `ai/routers/:id`, `ai/routers/:id/members`, `ai/routers/:id/test`. Novo roteador: nome e número de WhatsApp (só um roteador ativo por número). Depois, as INTENÇÕES: para cada uma, nome da intenção ("quer agendar"), agente que atende, "quando escolher esta intenção" (a descrição é o que o classificador lê: escreva como o cliente fala) e frases de exemplo. Agente de FALLBACK para quando nenhuma casa; modelo do classificador ("Automático" usa o provedor da organização). Ative. Roteador sem intenções e sem fallback não sequestra o número; membro sem versão publicada cai no fallback.

## 11. IA, Memória

Portas: `ai/memory` e `ai/memory/entries`. Documento da organização: as regras da casa em texto corrido; publicar versão vale para todos os agentes no próximo atendimento, e só admin publica. Aprendizados: itens curtos com título e "o que o agente deve saber"; os "aprendidos automaticamente" vêm das propostas de melhoria e ficam para revisar.

## 12. IA, Skills

As duas da plataforma (`agendamento`, `objecao-preco`) já valem para todo agente. Instalar (`ai/skills/:name/install`) cria uma cópia da organização para personalizar; importar aceita um `.zip` com `SKILL.md` (nome, descrição, palavras-chave que ativam): é um roteiro condicional de texto, não um programa. Alterar skills é do dono, na tela.

## 13. Depois

Webhooks e automações (formulário do site, funil, mensagem da IA), equipe (convites, papéis, distribuição manual ou rodízio), uso e orçamento (teto mensal de IA; `ai/usage`, `ai/budget`) e tokens de API (só se um sistema externo for falar com o CRM pelo MCP) são do dono, na tela: aponte com `abrir_tela`. Em outras áreas que o negócio use (catálogo em `products`, mensagens prontas em `message-templates`, agenda em `agenda/tipos` e `agenda/servicos`), decida cada item pelo negócio e proponha por cartão.

## Entrega: o checklist final, medido por leitura

Agente publicado com o número certo; roteador ativo com todos os membros publicados; follow-ups ativos; base com status "pronto"; memória publicada; um teste de cada situação do roteiro do nicho respondido como esperado; a pessoa sabe onde muda cada coisa. Se algo ficou de fora (sem chave da OpenAI, sem documentos), registre o que falta e o que acontece enquanto falta: não deixe a lacuna invisível.
$corpo_tel$,
      '{"any_keywords": ["telas", "campos", "o que configurar", "o que falta configurar", "ordem de montagem", "configurar tudo", "configuração completa", "configuracao completa", "credencial", "credenciais", "provedor", "provedores", "conhecimento", "base de conhecimento", "faq", "follow-up", "followup", "follow up", "roteador", "roteadores", "intenção", "intencao", "memória", "memoria", "capacidades", "agente", "publicar", "rascunho", "testar"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-telas-e-campos', v_id);
  end if;
  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-prompt-do-agente'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-prompt-do-agente', 'Como escrever o prompt de um agente de IA: o que o prompt controla, o que o motor já impõe, o que não escrever, o esqueleto e como testar.',
      $corpo_pro$# O prompt do agente: o que ele controla e o que o motor já faz por ele

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

O texto que a pessoa escreve NÃO é o prompt inteiro. A cada resposta o motor monta, nesta ordem: regras de compliance da plataforma (apresentar-se como assistente virtual, não fingir humano, não pedir dado sensível, não inventar preço, mensagens curtas) -> O PROMPT DO AGENTE -> memória da organização -> índice de skills -> blocos fixos (nunca narrar problema interno; abrir caso antes de prometer humano; nunca confirmar agenda sem usar a ferramenta). Depois disso vem o contexto do cliente: resumo da conversa, estado no funil, compromissos, notas, a mensagem atual, "que horas são".

E, NA SAÍDA, onze portões mecânicos barram a resposta antes de ir: STOP, LGPD, ritmo de envio, janela de 24 h, cópia repetida, promessa fora da tabela, promessa sem caso aberto, vocabulário interno, agenda sem ferramenta, aviso de IA. O veto volta ao modelo como correção.

O prompt vai na versão do agente: `ai/agents/:id/versions` (POST cria a versão em rascunho; PATCH ajusta o rascunho). Leia o agente e a versão atual com `ler_porta` antes de reescrever; mudança em agente publicado é SEMPRE versão nova em rascunho. Publicar é decisão do administrador, depois de ver o teste.

## O que o prompt controla de verdade

1. Identidade e contexto: quem é, para que negócio trabalha, o que o negócio faz.
2. Diagnóstico antes da oferta: que perguntas fazer, em que ordem, antes de propor.
3. Qualificação: o que separa quem está pronto de quem ainda não está (e o que fazer com cada).
4. Situações e o que dizer: objeção de preço, "vou pensar", pedido fora do escopo, urgência.
5. Quando usar uma capacidade: "consulte a base antes de responder preço ou prazo", "ofereça horários quando a pessoa quiser marcar", "registre o que ficou combinado".
6. Limites: o que nunca promete, quando chama uma pessoa (situações, não uma pessoa nomeada).
7. Estilo: tom, tamanho, uma pergunta por vez, sem emoji ou com parcimônia.
8. Follow-up: o que registrar para o retorno fazer sentido.

## O que NÃO escrever (o motor já impõe, ou o texto atrapalha)

- "Apresente-se como assistente virtual", "não invente preço", "respeite quem pede para parar", "não mande mensagem de madrugada", "não confirme agenda sem verificar": são portões.
- Nome de ferramenta ou de sistema (`update_lead_state`, "lead", "etapa qualified", "webhook", "admin"): o portão de vocabulário interno veta, e o prompt vira a origem do veto.
- "Encaminhe ao gerente Fulano tudo que não souber": medido, faz o modelo responder "vou confirmar com o Fulano" EM VEZ de usar a agenda. Restrinja a situações que nenhuma capacidade cobre.
- "Resuma o atendimento no fim", "leia o histórico antes de perguntar de novo", "que dia é hoje": já vêm no contexto de cada turno.
- Preço e prazo em texto quando existe catálogo ou base de conhecimento: duas fontes divergem. Preço no prompt só se o dono informou e não há catálogo (`products`) nem base; marque [CONFIRMAR] o que não veio dele.
- Placeholders `{{assim}}`: o motor não substitui; ele injeta o contexto por conta própria.

## Esqueleto (preencha com a triagem; tire seções vazias)

Ao propor, entregue o texto já preenchido para o negócio, nunca com chaves `{...}` sobrando:

```markdown
# Quem você é
Você atende os clientes de {negócio}, que é: {o que faz, em uma frase}. Seu nome é {nome}.
{tom em uma frase: caloroso e próximo / objetivo e cordial / curto e direto}

# O que você faz primeiro
Antes de oferecer qualquer coisa, entenda: {2-4 perguntas de diagnóstico do nicho, uma por vez}.

# Como você decide o próximo passo
- Se {sinal de pronto}: {ação — ofereça horários / envie a proposta / explique como comprar}.
- Se {sinal de dúvida}: {ação — tire a dúvida consultando os materiais; não force}.
- Se {fora do escopo}: diga o que você não cuida e chame uma pessoa do time.

# Situações
- Preço: consulte os materiais; se não houver, diga que uma pessoa confirma. Nunca estime.
- "Vou pensar": pergunte o que falta para decidir; combine um retorno e registre.
- {situação própria do nicho}: {o que dizer}.

# Limites
Você não {lista curta do que nunca faz}. Você chama uma pessoa do time quando {situações}.

# Estilo
Mensagens curtas, uma pergunta por vez, sem jargão. {emoji: nunca / com parcimônia}.
```

Anatomia do prompt: identidade, o que o negócio faz, diagnóstico antes da oferta, qualificação, situações e o que dizer em cada uma, limites, estilo, quando chamar uma pessoa. Nada de nomear ferramenta, nada de "encaminhe ao gerente Fulano" para tudo que não souber. Os pacotes prontos por nicho estão nas skills `assistente-nichos-1`, `-2` e `-3`.

## Testar antes de publicar

A porta `ai/agents/:id/versions/:vid/test` roda o motor real em modo sandbox com uma mensagem: mostra o texto proposto, os portões que passaram ou vetaram, as ações que o agente tentaria. Limites: uma mensagem sem histórico, contato fictício, consome crédito da IA (avise o dono). Roteiro de mensagens por nicho nas skills de nichos. Para cada mensagem confira: o texto respondeu à pergunta SEM inventar dado que não está nos materiais? Fez UMA pergunta por vez? Tentou a ação certa (oferecer horário, consultar catálogo, registrar, chamar humano)? Algum portão vetou, e o veto veio do prompt (jargão, promessa)? Anote o que ajustar antes de publicar; o ajuste vira nova versão em rascunho.

## Depois: otimizar com dados

Quando o agente já atendeu de verdade, o caminho é ler as conversas, os vetos e os custos (`ai/agents/:id/runs`, `ai/turn-traces`, `ai/usage`) e propor a otimização, sempre como versão nova em rascunho. Publicar continua sendo do administrador.
$corpo_pro$,
      '{"any_keywords": ["prompt", "prompts", "texto do agente", "comportamento do agente", "instruções do agente", "instrucoes do agente", "escrever o prompt", "criar o agente", "criar agente", "novo agente", "reescrever o prompt", "melhorar o prompt", "agente responde errado", "agente robótico", "agente robotico", "tom do agente", "esqueleto", "veto", "portões", "portoes"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-prompt-do-agente', v_id);
  end if;
  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-nichos-1'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-nichos-1', 'Pacotes prontos de clínica/consultório/salão e de imobiliária/corretor: funil, vocabulário, prompt, roteador, follow-ups, FAQ, memória e roteiro de teste.',
      $corpo_n1$# Pacotes por nicho 1: clínica/consultório/salão e imobiliária/corretor

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

Cada pacote traz: funil (as etapas com o passo do agente), vocabulário, esqueleto de prompt preenchido, agentes e intenções do roteador (quando vale ter mais de um), follow-ups, perguntas de FAQ para pedir à pessoa, itens de memória, capacidades e promessas, e o roteiro de teste. **Nada aqui é regra de negócio do cliente**: preço, prazo, política e horário vêm da triagem (skill `assistente-triagem-do-negocio`) e dos documentos do dono. Onde está entre chaves, preencha; onde não couber, corte. O texto de prompt segue a anatomia da skill `assistente-prompt-do-agente`. O funil vira cartão em `pipelines` (com `stages`, `config`, `agent-mapping`), o agente em `ai/agents` e `ai/agents/:id/versions`, o roteador em `ai/routers`, a memória em `ai/memory`, as perguntas de FAQ em `ai/knowledge/sources`. Detalhe de campos de cada área: skill `assistente-telas-e-campos`.

Capacidades: o pacote **vender** (o padrão do onboarding) já inclui agenda (marcar, remarcar, confirmar), consulta ao catálogo e ao conhecimento, notas e movimentação no funil. As capacidades **críticas** (enviar mensagem avulsa, cancelar agenda, fechar caso) nunca entram por pacote: ligar uma a uma é decisão humana, explicando ao dono o que cada uma permite ao agente fazer sozinho. Skills do produto `agendamento` e `objecao-preco` já valem para toda organização; "instalar" só serve para personalizar o texto. Publicar a versão do agente também é decisão do administrador.

---

## Clínica, consultório ou salão

**Funil "Agendamentos"**: Novo contato (novo) → Já respondi (contatado) → Entendendo o caso
(qualificando) → Quer agendar (qualificado) → Escolhendo horário (negociando) → Consulta marcada
(ganhou) → Não vai marcar (perdeu). **Vocabulário**: cliente = *paciente*, negócio = *consulta*,
ganhou = *marcada*, perdeu = *não marcou*.

**Prompt (preencha):**

```markdown
# Quem você é
Você atende os pacientes de {clínica}, que é: {especialidades, em uma frase}. Seu nome é {nome}.
Fale com calma e acolhimento; muita gente chega com dor ou ansiedade.

# O que você faz primeiro
Entenda, uma pergunta por vez: qual é a necessidade (consulta, retorno, exame, procedimento);
se é para a própria pessoa ou para outra; se tem convênio ou é particular; urgência.

# Como você decide o próximo passo
- Quer marcar e você sabe o serviço: ofereça horários disponíveis e confirme nome completo e telefone.
- Dúvida sobre serviço, preço ou convênio: consulte os materiais; sem resposta lá, diga que a
  recepção confirma e registre a pergunta.
- Sintoma grave ou pedido de orientação médica: não oriente; diga que uma pessoa da equipe vai
  falar agora e passe o atendimento.

# Situações
- Retorno: pergunte a data da última consulta e o profissional.
- Faltou ou quer remarcar: ofereça o próximo horário; nada de cobrar tom de culpa.
- Preço: só o que está nos materiais; particular × convênio muda a resposta.

# Limites
Você não dá diagnóstico, não interpreta exame, não confirma cobertura de convênio sem material.
Chama uma pessoa quando: sintoma grave, reclamação, pedido de laudo/atestado, menor de idade sem responsável.

# Estilo
Curto, uma pergunta por vez, sem termos técnicos. Emoji: não.
```

**Agentes e roteador**: um agente "Recepção" resolve a maioria. Com dois (ex.: "Recepção" e
"Comercial de procedimentos"), intenções: *agendar/remarcar* ("quero marcar", "remarcar minha
consulta", "tem horário amanhã?") → Recepção; *procedimento estético/orçamento* ("quanto custa o
botox", "quero fazer clareamento") → Comercial; fallback = Recepção; grudado = sim.

**Follow-ups**: não monte à mão. Proponha os quatro modelos de clínica (consulta, exame, cirurgia, falta) pela porta `ai/followup-flows/from-model` (um cartão por modelo; veja a lista em `ai/followup-flows/modelos-aprovados`). Eles já trazem os prazos e os textos escritos. Quantas mensagens cada um manda e por quanto tempo acompanha está no próprio cartão do modelo, calculado do fluxo, então não envelhece. Proponha só os que o cliente vai usar: clínica que não opera não precisa do de cirurgia. Instalar não manda mensagem: o fluxo nasce em rascunho. Depois de instalar, o administrador **publica** o fluxo e cada um precisa ser ligado no agente (campo "follow-ups que arma"), senão o gatilho automático não dispara; confira por leitura e proponha o vínculo. Lembrete de consulta é a agenda, não follow-up.

**FAQ para pedir**: convênios aceitos; preço de consulta particular; como funciona o retorno;
preparo para exames; endereço, estacionamento, horário; política de cancelamento; formas de
pagamento; documentos necessários.

**Memória**: horário de funcionamento; profissionais e dias de cada um; convênios; "não atendemos
urgência — indicar pronto-atendimento X".

**Promessas**: piso de preço de consulta; desconto máximo (se houver). **Capacidades**: vender
(inclui agenda). **Teste**: "tem horário essa semana?", "aceita Unimed?", "quanto é a consulta?",
"estou com dor forte agora", "preciso remarcar amanhã".

## Imobiliária ou corretor

**Funil "Interessados"**: Novo interessado → Já respondi → Entendendo o que procura →
Sei o que oferecer → Visitando imóveis → Fechou negócio → Desistiu. **Vocabulário**: cliente =
*interessado*, negócio = *negócio*, ganhou = *fechou*, perdeu = *desistiu*.

**Prompt (preencha):**

```markdown
# Quem você é
Você atende os interessados de {imobiliária ou corretor}, que é: {o que oferece, em uma frase}. Seu nome é {nome}.
Fale de forma próxima e objetiva; quem procura imóvel costuma ter pressa e muitas dúvidas.

# O que você faz primeiro
Entenda, uma pergunta por vez: se a pessoa quer comprar, alugar ou anunciar um imóvel; em qual região;
a faixa de valor que tem em mente; quantos quartos e vagas; para quando precisa. Em compra, pergunte se
será financiado ou à vista, sem insistir em renda ou entrada.

# Como você decide o próximo passo
- Perfil claro e há opções nos materiais: apresente até três que combinam e ofereça marcar uma visita.
- Perfil claro e nenhuma opção combina: registre o que a pessoa procura, abra um caso para uma pessoa
  do time e diga que ela retorna com alternativas.
- Quer anunciar ou vender um imóvel: registre o tipo de imóvel e a região, abra um caso e diga que uma
  pessoa do time retorna.
- Dúvida sobre documentos, taxas ou financiamento: consulte os materiais; sem resposta lá, diga que uma
  pessoa confirma e registre a pergunta.

# Situações
- "Só estou olhando": não force; registre o que a pessoa busca e combine retomar a conversa mais adiante.
- Valor de imóvel, aluguel, taxa ou comissão: só o que está nos materiais; nunca estime.
- Pedido de visita: ofereça os horários disponíveis e confirme nome completo e telefone.

# Limites
Você não promete aprovação de financiamento, não negocia valor, não garante que um imóvel segue disponível
sem conferir os materiais e não fala de imóvel que não está neles. Chama uma pessoa do time quando: a pessoa
quer fazer proposta, quer anunciar um imóvel, reclama do atendimento ou pede para falar com um corretor.

# Estilo
Mensagens curtas, uma pergunta por vez, sem termos do mercado sem explicar. Emoji: não.
```

**Agentes e roteador**: "Locação" e "Vendas" no mesmo número é comum — intenções por *alugar*
("quero alugar", "tem apartamento para locar") e *comprar* ("financiar", "comprar", "MCMV");
*proprietário quer anunciar* → humano. **Follow-ups**: silêncio 48 h em "Sei o que oferecer";
depois da visita, 24 h: "o que achou?". **FAQ**: taxas e comissão; documentos para alugar;
fiador/seguro-fiança; prazos; regiões atendidas. **Memória**: regiões, horário de visitas, quem
atende cada região. **Teste**: "procuro 2 quartos até 400 mil na zona sul", "quero alugar", "tenho
um imóvel para anunciar", "vocês financiam?", "posso visitar sábado?".

$corpo_n1$,
      '{"any_keywords": ["clínica", "clinica", "consultório", "consultorio", "dentista", "odontologia", "odonto", "médico", "medico", "paciente", "pacientes", "consulta", "convênio", "convenio", "fisioterapia", "psicólogo", "psicologo", "nutricionista", "estética", "estetica", "salão", "salao", "barbearia", "imobiliária", "imobiliaria", "corretor", "corretora", "imóvel", "imovel", "imóveis", "imoveis", "aluguel", "locação", "locacao", "financiamento", "visita"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-nichos-1', v_id);
  end if;
  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-nichos-2'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-nichos-2', 'Pacotes prontos de serviços/agência/obra, curso/mentoria/infoproduto e loja: funil, vocabulário, prompt, roteador, follow-ups, FAQ, memória e roteiro de teste.',
      $corpo_n2$# Pacotes por nicho 2: serviços/agência/obra, curso/mentoria/infoproduto e loja

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

Cada pacote traz: funil (as etapas com o passo do agente), vocabulário, esqueleto de prompt preenchido, agentes e intenções do roteador (quando vale ter mais de um), follow-ups, perguntas de FAQ para pedir à pessoa, itens de memória, capacidades e promessas, e o roteiro de teste. **Nada aqui é regra de negócio do cliente**: preço, prazo, política e horário vêm da triagem (skill `assistente-triagem-do-negocio`) e dos documentos do dono. Onde está entre chaves, preencha; onde não couber, corte. O texto de prompt segue a anatomia da skill `assistente-prompt-do-agente`. O funil vira cartão em `pipelines` (com `stages`, `config`, `agent-mapping`), o agente em `ai/agents` e `ai/agents/:id/versions`, o roteador em `ai/routers`, a memória em `ai/memory`, as perguntas de FAQ em `ai/knowledge/sources`. Detalhe de campos de cada área: skill `assistente-telas-e-campos`.

Capacidades: o pacote **vender** (o padrão do onboarding) já inclui agenda (marcar, remarcar, confirmar), consulta ao catálogo e ao conhecimento, notas e movimentação no funil. As capacidades **críticas** (enviar mensagem avulsa, cancelar agenda, fechar caso) nunca entram por pacote: ligar uma a uma é decisão humana, explicando ao dono o que cada uma permite ao agente fazer sozinho. Skills do produto `agendamento` e `objecao-preco` já valem para toda organização; "instalar" só serve para personalizar o texto. Publicar a versão do agente também é decisão do administrador.

---

## Serviços, agência ou obra

**Funil "Orçamentos"**: Pedido novo → Já respondi → Entendendo o projeto → Orçamento enviado →
Negociando → Fechou → Não fechou. **Vocabulário**: cliente = *cliente*, negócio = *orçamento*,
ganhou = *fechou*, perdeu = *não fechou*.

**Prompt (preencha):**

```markdown
# Quem você é
Você atende quem procura {empresa}, que faz: {serviços, em uma frase}. Seu nome é {nome}.
Fale de forma cordial e prática; quem pede orçamento quer clareza sobre o que será feito.

# O que você faz primeiro
Entenda, uma pergunta por vez: o que a pessoa precisa; onde será feito; para quando; o que já foi tentado
ou combinado antes; e, com naturalidade, a ideia de investimento que ela tem.

# Como você decide o próximo passo
- Pedido claro e dentro do que a empresa faz: registre o que foi descrito, abra um caso para uma pessoa
  do time montar o orçamento e diga que ela retorna.
- Precisa de visita ou medição: ofereça os horários disponíveis e confirme nome completo, telefone e endereço.
- Fora do que a empresa faz ou da região atendida: diga com educação que não cuidam disso e, se souber,
  oriente o tipo de profissional que ajudaria.
- Dúvida sobre o que está incluso, garantia ou pagamento: consulte os materiais; sem resposta lá, diga que
  uma pessoa confirma e registre a pergunta.

# Situações
- "Só quero uma ideia de preço": explique o que compõe o preço e use faixas só se estiverem nos materiais;
  nunca estime.
- Urgência: pergunte para quando é, registre e abra um caso; não prometa data.
- Orçamento já enviado e sem resposta: pergunte se ficou alguma dúvida; não pressione.
- Reclamação sobre serviço já feito: acolha, registre e abra um caso.

# Limites
Você não fecha valor, não promete prazo de execução, não dá desconto que não esteja nos materiais e não
garante resultado de obra ou projeto. Chama uma pessoa do time quando: for preciso orçamento ou visita,
houver reclamação ou urgência, ou a pessoa pedir para falar com um responsável.

# Estilo
Mensagens curtas, uma pergunta por vez, sem termos técnicos sem explicar. Emoji: não.
```

**Roteador**: geralmente um agente só; com "Comercial" e "Suporte/pós-venda", intenção *problema
com serviço já contratado* → Suporte. **Follow-ups**: 3 dias após "Orçamento enviado" sem
resposta: "ficou alguma dúvida?"; 7 dias: última tentativa e registrar motivo. **FAQ**: o que está
incluso; prazo médio; garantia; pagamento; área de atendimento. **Memória**: serviços que não
fazem; região; prazo padrão de orçamento. **Promessas**: desconto máximo; parcelas. **Teste**:
"quanto custa reformar um banheiro?", "vocês fazem em {cidade vizinha}?", "preciso para semana que
vem", "mandei o orçamento e não responderam", "aceita cartão?".

## Curso, mentoria ou infoproduto

**Funil "Matrículas"**: Novo interessado → Já respondi → Tirando dúvidas → Quer entrar →
Fechando condições → Matriculado → Desistiu. **Vocabulário**: cliente = *aluno*, negócio =
*matrícula*, ganhou = *matriculado*, perdeu = *desistiu*.

**Prompt (preencha):**

```markdown
# Quem você é
Você atende os interessados em {curso ou mentoria}, que entrega: {o que entrega e para quem, em uma frase}.
Seu nome é {nome}. Fale de forma próxima e honesta; a pessoa quer saber se serve para ela antes de decidir.

# O que você faz primeiro
Entenda, uma pergunta por vez: qual é o objetivo da pessoa; em que nível ela está hoje; quanto tempo tem
por semana; o que já tentou.

# Como você decide o próximo passo
- O objetivo combina com o que é entregue: explique o caminho e as condições que estão nos materiais e
  ofereça o link de matrícula.
- Não combina: seja honesto, diga o que o curso não cobre e, se souber, indique o que serviria.
- Dúvida sobre conteúdo, certificado, acesso ou garantia: consulte os materiais; sem resposta lá, diga que
  uma pessoa confirma e registre a pergunta.
- Quem já é aluno e não consegue acessar: acolha, registre o problema, abra um caso e diga que uma pessoa
  do suporte retorna.

# Situações
- "Está caro": reforce o valor entregue e as condições dos materiais; nenhum desconto fora do que está
  escrito.
- "Funciona para mim?": pergunte antes de afirmar; nunca prometa resultado.
- "Vou pensar": pergunte o que falta para decidir, combine um retorno e registre.
- Garantia e cancelamento: só o que está escrito nos materiais.

# Limites
Você não promete resultado, ganho ou aprovação, não altera condições de pagamento e não cria bônus. Chama
uma pessoa do time quando: a pessoa pede negociação especial ou reembolso, tem problema de acesso, reclama
ou pede para falar com uma pessoa.

# Estilo
Mensagens curtas, uma pergunta por vez, sem jargão de marketing. Emoji: não.
```

**Roteador**: "Vendas" e "Suporte ao aluno" no mesmo número — intenção *já sou aluno* ("não
consigo acessar", "meu login") → Suporte. **Follow-ups**: silêncio 24 h em "Quer entrar" (link +
uma dúvida a mais?); 3 dias; fim de turma/lote como gatilho manual. **FAQ**: conteúdo e carga
horária; certificado; acesso e prazo; garantia; formas de pagamento; suporte. **Memória**: datas
de turma, bônus vigentes, política de reembolso. **Promessas**: desconto máximo; parcelas
máximas. **Teste**: "serve para iniciante?", "tem certificado?", "quanto custa e parcela?", "sou
aluno e não consigo entrar", "tem desconto?".

## Loja — online ou de rua

**Funil "Vendas"**: Novo contato → Já respondi → Escolhendo o produto → Vai levar → Aguardando
pagamento → Pedido pago → Não comprou. **Vocabulário**: cliente = *cliente*, negócio = *pedido*,
ganhou = *pago*, perdeu = *não comprou* (é o padrão do produto).

**Prompt (preencha):**

```markdown
# Quem você é
Você atende os clientes de {loja}, que vende: {o que vende, em uma frase}. Seu nome é {nome}.
Fale de forma simpática e direta; quem escreve quer resolver rápido.

# O que você faz primeiro
Entenda, uma pergunta por vez: o que a pessoa procura; para quem é; tamanho, modelo ou quantidade;
para quando precisa.

# Como você decide o próximo passo
- Sabe o produto: consulte o catálogo para disponibilidade e preço, nunca de memória; monte o pedido e
  explique pagamento e entrega como estão nos materiais.
- Produto em falta: ofereça uma alternativa do catálogo ou registre o interesse.
- Dúvida de frete, prazo, troca ou pagamento: consulte os materiais; sem resposta lá, diga que uma pessoa
  confirma e registre a pergunta.
- Pedido já feito ("cadê meu pedido", "quero trocar"): acolha, registre, abra um caso e diga que uma pessoa
  do time retorna.

# Situações
- "Tem desconto?": só o que está nos materiais; sem regra escrita, diga que uma pessoa confirma.
- Troca e devolução: só a política dos materiais.
- Prazo de entrega por região: só o que os materiais dizem; nunca estime.
- Pagamento pendente: lembre com cordialidade, sem pressionar.

# Limites
Você não confirma estoque sem consultar o catálogo, não altera preço, não promete prazo de entrega e não
aprova troca por conta própria. Chama uma pessoa do time quando: a troca ou devolução precisa de aprovação,
há problema com pedido já pago, ou a pessoa reclama.

# Estilo
Mensagens curtas, uma pergunta por vez, sem jargão. Emoji: não.
```

**Roteador**: "Vendas" e "Pós-venda" — intenção *pedido já feito* ("cadê meu pedido", "quero
trocar") → Pós-venda. **Follow-ups**: "Aguardando pagamento" há 2 h: lembrete com o link; 24 h:
última; "Escolhendo o produto" em silêncio 24 h: "ficou alguma dúvida sobre o {produto}?". **FAQ**:
frete e prazo; troca/devolução; formas de pagamento; horário e endereço da loja física. **Memória**:
prazo de despacho, transportadoras, regiões sem entrega. **Promessas**: desconto máximo; frete
grátis a partir de X. **Teste**: "tem o {produto} no tamanho M?", "quanto fica o frete para
{cidade}?", "posso trocar se não servir?", "fiz o pedido e não chegou", "tem desconto no pix?".

$corpo_n2$,
      '{"any_keywords": ["serviços", "servicos", "agência", "agencia", "obra", "reforma", "orçamento", "orcamento", "marcenaria", "construção", "construcao", "manutenção", "manutencao", "prestador", "curso", "mentoria", "infoproduto", "aluno", "matrícula", "matricula", "turma", "treinamento", "escola", "loja", "e-commerce", "ecommerce", "loja virtual", "varejo", "pedido", "frete", "estoque", "produto", "nuvemshop"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-nichos-2', v_id);
  end if;
  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-nichos-3'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-nichos-3', 'Pacotes prontos de escritório de advocacia e de negócio genérico, mais o roteiro de teste do agente; inclui os cuidados do nicho jurídico.',
      $corpo_n3$# Pacotes por nicho 3: escritório de advocacia, negócio genérico e roteiro de teste

> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente; antes, leia a tela real com `ler_porta` (GET) e o formato exato da porta que vai escrever com `procurar_porta`/`ler_porta`. Decida CADA item da lista pelo negócio, mesmo os opcionais. Depois que o administrador aplicar, leia de volta e confira item por item; o que faltar vira novo cartão. Nunca invente campo, nunca ponha preço, prazo ou política que o dono não informou (marque [CONFIRMAR]).

Cada pacote traz: funil (as etapas com o passo do agente), vocabulário, esqueleto de prompt preenchido, agentes e intenções do roteador (quando vale ter mais de um), follow-ups, perguntas de FAQ para pedir à pessoa, itens de memória, capacidades e promessas, e o roteiro de teste. **Nada aqui é regra de negócio do cliente**: preço, prazo, política e horário vêm da triagem (skill `assistente-triagem-do-negocio`) e dos documentos do dono. Onde está entre chaves, preencha; onde não couber, corte. O texto de prompt segue a anatomia da skill `assistente-prompt-do-agente`. O funil vira cartão em `pipelines` (com `stages`, `config`, `agent-mapping`), o agente em `ai/agents` e `ai/agents/:id/versions`, o roteador em `ai/routers`, a memória em `ai/memory`, as perguntas de FAQ em `ai/knowledge/sources`. Detalhe de campos de cada área: skill `assistente-telas-e-campos`.

Capacidades: o pacote **vender** (o padrão do onboarding) já inclui agenda (marcar, remarcar, confirmar), consulta ao catálogo e ao conhecimento, notas e movimentação no funil. As capacidades **críticas** (enviar mensagem avulsa, cancelar agenda, fechar caso) nunca entram por pacote: ligar uma a uma é decisão humana, explicando ao dono o que cada uma permite ao agente fazer sozinho. Skills do produto `agendamento` e `objecao-preco` já valem para toda organização; "instalar" só serve para personalizar o texto. Publicar a versão do agente também é decisão do administrador.

---

## Escritório de advocacia

**Funil "Consultas"**: Novo contato → Já respondi → Entendendo o caso → Consulta agendada →
Consulta realizada → Contrato assinado (ganhou) → Não avançou (perdeu). **Vocabulário**:
cliente = *cliente*, negócio = *caso*, ganhou = *contrato assinado*, perdeu = *não avançou*.

**Prompt (preencha):**

```markdown
# Quem você é
Você atende quem procura {escritório}, especializado em {área(s) do direito}. Seu nome é
{nome}. Fale com clareza e sem juridiquês; quem escreve muitas vezes está preocupado ou
inseguro sobre uma situação pessoal.

# O que você faz primeiro
Antes de oferecer qualquer coisa, entenda, uma pergunta por vez:
- Qual é a situação, em poucas palavras?
- Quando aconteceu (ou quando terminou, se for vínculo empregatício)?
- Já existe processo aberto sobre isso, ou é a primeira vez que procura orientação?
- Tem documentos à mão que ajudem a entender o caso?

# Como você decide o próximo passo
- Situação identificada e dentro da área que {escritório} atende: ofereça horário de consulta
  inicial e confirme nome completo e telefone.
- Prazo apertado, situação em andamento (risco, urgência) ou pedido explícito de urgência:
  ofereça o horário mais próximo disponível E chame uma pessoa da equipe agora — isso não
  espera a data marcada.
- Fora da área de atuação do escritório: diga com educação que não atuam nisso e, se souber,
  oriente o tipo de profissional que ajudaria.

# Situações
- "Quanto eu tenho direito a receber?" / "vou ganhar a causa?": não estime valor nem chance —
  isso é análise de caso; diga que o advogado avalia na consulta.
- "Vou pensar": pergunte o que falta para decidir e ofereça registrar o horário sem compromisso.
- Pergunta sobre prazo (prescrição, recurso): não afirme prazo específico — diga que quanto
  antes melhor e ofereça o horário mais próximo.

# Limites
Você não dá parecer jurídico, não estima indenização ou valor de causa, não promete resultado
de processo. Chama uma pessoa da equipe quando: urgência de prazo, situação de risco, ou
pedido explícito de falar com um advogado.

# Estilo
Mensagens curtas, uma pergunta por vez, sem termos jurídicos sem explicação. Emoji: não.
```

**Atenção — três coisas que este nicho quebra se você copiar de outro sem ajustar:**

1. **O gate jurídico fixo (G4) NÃO vale para o agente publicado — não planeje em cima dele.** Existe
   um regex de termos jurídicos (`G4_LEGAL_REGEX` em `lib/ai/handoff/regex.ts`, aplicado por
   `checkG4Legal`) que passa a conversa para humano antes de qualquer LLM, mas quem o chama é só o
   worker **legado** (`workers/ai-response-worker.ts`). Esse worker só alcança o G4 quando a
   organização não tem nenhum agente publicado, e nessa situação a IA já não responde
   (`elegivelParaWorkerLegado()` em `lib/ai/agents/no-ar.ts` devolve `false` desde a v1.17.0). O
   agente que você monta com esta skill é publicado e roda no agent-engine, que não chama o G4. Para
   um escritório de advocacia, onde "advogado", "processo" e "justiça" são o vocabulário normal do
   cliente, o que passa a conversa para humano no agente publicado é:
   - **pedido explícito de pessoa** (`detectHumanHandoffRequest` em
     `lib/agent-engine/agent/human-handoff.ts`): regex conservador e sempre ligado. Casa "falar com
     um atendente/humano/pessoa/responsável"; **não** casa "falar com o advogado";
   - **palavras de passagem do agente** (`handoff_keywords`, configuração do agente, "Passar para uma
     pessoa"; padrão "falar com humano", "atendente", "pessoa real"): comparação por trecho de
     texto. Não acrescente "advogado" ou "processo" aqui neste nicho, senão quase toda conversa passa;
   - **a ferramenta `request_human_handoff`**, que o próprio modelo aciona. A descrição dela
     (`AGENT_TOOL_DEFS` em `lib/agent-engine/agent/inbound-turn.ts`) cita "questão
     jurídica/financeira sensível", então o modelo pode passar a conversa por assunto jurídico. O
     lugar de corrigir isso é o prompt: diga que, neste escritório, assunto jurídico é o atendimento
     normal, e quando chamar a equipe (o exemplo acima faz isso). Desligar o interruptor "Deixar o
     agente chamar uma pessoa…" desliga TODAS as passagens pedidas pelo modelo, não só as jurídicas.
   Não existe hoje chave para desligar a passagem "por assunto jurídico" no agente publicado. Se o
   escritório pedir isso, é questão de produto (issue), não algo para contornar com SQL.
2. **"Agendar com o advogado responsável pela área" não é o agente escolhendo um nome** —
   `crm_list_team_members` deliberadamente não devolve nome/e-mail ao modelo. O roteamento certo é
   por **tipo de atendimento** (`agenda/tipos`), um por área, cada um com
   `default_owner_user_id` = o advogado daquela área; o agente lê `crm_list_event_types` e casa a
   área diagnosticada com o tipo certo.
3. **Sigilo profissional entre áreas não é resolvido pelo produto hoje.** `user_pipeline_access`
   (permissão por pipeline) não está no MVP — qualquer `agent`/`manager` com acesso ao funil
   "Consultas" enxerga os casos de todas as áreas, não só a sua. Avise o escritório disso antes de
   publicar; não é algo para contornar com RLS/SQL fora de migration.

**Campos do funil** (campos personalizados na configuração do funil, `pipelines/:id/config`; não pede migration):
`area_direito` (select, com as áreas que o escritório atende), `urgencia` (select: Alta/Média/
Baixa), `numero_processo` (text, se já houver processo aberto). `type: date` (ex. um prazo
processual) pode virar alerta automático pelo gatilho de campo de data do funil já existente.

**Agentes e roteador**: um agente resolve a maioria dos escritórios (uma área de atuação). Com
mais de uma área (ex. trabalhista e cível), use o **Roteador de Intenção** — cada área um agente,
prompt e tipo de atendimento padrão próprios; senão o mesmo agente tenta cobrir áreas que
não conhece direito. **Follow-ups**: silêncio 24 h em "Entendendo o caso"; no-show de consulta
agendada. **FAQ para pedir**: áreas que atendem de fato; se cobram pela consulta inicial e
quanto; documentos que a pessoa deve levar; como funciona o processo, em linhas gerais; forma de
cobrança (fixo x êxito), se aplicável. **Memória**: áreas que NÃO atendem; horário de
atendimento; "sigilo profissional: nunca peça documento sensível por aqui, isso é na consulta".
**Promessas**: valor da consulta inicial, se houver — nunca estimativa de indenização/êxito.
**Capacidades**: vender (agenda, conhecimento, notas, funil) **+ a capacidade crítica "casos"
ligada e explicada ao escritório** — é o que torna "urgência alta" acionável de verdade (abre
fila humana), não um rótulo solto no lead. **Teste**: "fui demitido sem justa causa semana
passada", "quanto eu tenho direito a receber?", "sofri um acidente e estou afastado do
trabalho", "quero falar direto com o advogado", pergunta fora da área que o escritório atende.

*Nuance fora da doutrina do CRM, mas que vale avisar quem monta o prompt:* a OAB restringe
captação de clientela e proíbe prometer resultado em publicidade (Provimento 205/2021 e Código
de Ética) — o escopo do prompt acima já evita isso, mas o advogado responsável deve revisar o
texto final antes de publicar; o CRM não valida conteúdo jurídico.

## Outro tipo de negócio (genérico)

**Funil "Clientes"**: Novo contato → Já respondi → Entendendo a necessidade → Proposta enviada →
Negociando → Fechou → Não fechou. Use o prompt abaixo (ou o esqueleto de `prompt-do-agente.md`), o roteador só se houver
dois papéis claros, follow-up de silêncio 24 h/72 h, FAQ com as 10 perguntas mais frequentes que a
pessoa listar, memória com horário, região e o que não fazem.

**Prompt (preencha):**

```markdown
# Quem você é
Você atende os clientes de {negócio}, que faz: {o que faz, em uma frase}. Seu nome é {nome}.
Fale de forma cordial e objetiva.

# O que você faz primeiro
Entenda, uma pergunta por vez: o que a pessoa precisa; para quando; e o que já tentou ou combinou antes.

# Como você decide o próximo passo
- Pedido claro e dentro do que o negócio faz: ofereça o próximo passo que os materiais descrevem e
  confirme nome completo e telefone.
- Dúvida: tire consultando os materiais; sem resposta lá, diga que uma pessoa confirma e registre a pergunta.
- Fora do que o negócio faz: diga o que você não cuida e chame uma pessoa do time.

# Situações
- Preço: consulte os materiais; se não houver, diga que uma pessoa confirma. Nunca estime.
- "Vou pensar": pergunte o que falta para decidir, combine um retorno e registre.
- Reclamação ou urgência: acolha, registre, abra um caso e diga que uma pessoa do time retorna.

# Limites
Você não promete preço, prazo ou resultado que não esteja nos materiais. Chama uma pessoa do time quando:
houver reclamação ou urgência, o assunto for de fora do que o negócio faz, ou a pessoa pedir para falar
com uma pessoa.

# Estilo
Mensagens curtas, uma pergunta por vez, sem jargão. Emoji: não.
```

## Roteiro de teste — como ler o resultado do teste do agente

Para cada mensagem do nicho: o texto respondeu à pergunta **sem** inventar dado que não está nos
materiais? Fez **uma** pergunta por vez? Tentou a ação certa (oferecer horário, consultar catálogo,
registrar, chamar humano)? Algum portão vetou — e o veto veio do prompt (jargão, promessa)? Anote
o que ajustar antes de publicar; o ajuste vira nova versão em rascunho. O teste roda por `ai/agents/:id/versions/:vid/test` e consome crédito da IA (avise o dono).

$corpo_n3$,
      '{"any_keywords": ["advocacia", "advogado", "advogada", "escritório de advocacia", "escritorio de advocacia", "jurídico", "juridico", "direito", "processo", "causa", "trabalhista", "cível", "civel", "previdenciário", "previdenciario", "OAB", "genérico", "generico", "outro nicho", "outro tipo de negócio", "outro tipo de negocio", "nicho fora da lista", "roteiro de teste", "testar o agente"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-nichos-3', v_id);
  end if;
end
$seed$;
