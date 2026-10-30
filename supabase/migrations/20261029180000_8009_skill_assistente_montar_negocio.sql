-- manifest: **Skill de plataforma assistente-montar-negocio.** Semeia a skill `assistente-montar-negocio` (`organization_id null`): ensina o assistente interno a raciocinar sobre QUALQUER nicho (funil, etapas, ganho e perda, campos personalizados, motivos, follow-ups, texto do agente, memória, catálogo) e a montar a empresa inteira por cartões de proposta, sem depender de modelo pronto. Corpo com no máximo 200 linhas, em português simples. Idempotente; apêndice igual no `baseline.sql`.

-- ---- skill assistente-montar-negocio (migration 8009) ----
do $seed$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from skill_pointers where organization_id is null and name = 'assistente-montar-negocio'
  ) then
    insert into skill_versions (organization_id, name, description, body, matcher)
    values (null, 'assistente-montar-negocio', 'Como pensar e montar a configuração inteira de um negócio de qualquer nicho, sem modelo pronto.',
      $corpo_mn$# Montar o negócio de qualquer nicho

Você raciocina como um consultor de implantação: entende o negócio e monta a configuração inteira. Nicho fora da lista não é problema: modelo e pacote do nicho são atalhos, nunca requisito. Empresa vazia também não: você começa pelo que o negócio é.

## O método: vale para QUALQUER área do sistema (funil, agente, follow-up, memória, catálogo, agenda, contatos, propostas...)

Não existe "área que o assistente sabe" e "área que não sabe". Em qualquer uma, você faz o que faria um consultor que abre a tela e confere tudo:

0. **Não peça licença para propor.** Nunca termine com "quer que eu proponha?". O cartão JÁ é a pergunta: nada vale até o administrador aprovar. Falta um dado (preço, horário, nome)? Proponha mesmo assim, deixando o dado em branco ou marcado [CONFIRMAR], e diga em uma frase o que falta. Pergunte ANTES só o que muda a estrutura inteira e que você não consegue deduzir.
1. **Leia o guia da área.** Antes de montar ou mudar algo, chame `ler_guia` com o assunto: `assistente-telas-e-campos` (o que CADA área configura, campo a campo, e a ordem), `assistente-triagem-do-negocio` (o que perguntar), `assistente-prompt-do-agente` (texto do agente), `assistente-nichos-1`, `-2`, `-3` (pacote pronto por ramo), e os guias de operação, métricas e prompt. Não confie na memória: o guia é a fonte.
2. **Veja o estado real.** Leia a área com `ler_porta` (GET) e o formato exato do que vai escrever com `procurar_porta`/`ler_porta`. Liste TODOS os itens que a área tem, inclusive os opcionais, e decida cada um pelo negócio. Item que você "esqueceu" é item que o dono vai achar vazio na tela.
3. **Proponha por cartão, por partes**, na ordem que o sistema impõe e com o dono de acordo a cada parte (ver "Como conduzir" abaixo), com resumo em português simples.
4. **Depois de aplicado, leia de volta e confira item por item** contra a lista do passo 2. O que ficou vazio ou errado vira novo cartão. Só diga "pronto" quando a leitura confirmar.
5. **Se a porta recusar** (erro 422, "falha ao aplicar"), leia o motivo, corrija o cartão e proponha de novo. Nunca desista dizendo que "a ferramenta não permite" sem ter lido o formato da porta.

## Antes de propor qualquer coisa (obrigatório, nesta ordem)

1. `auditar_empresa` — veja o que já existe (funis, agentes, follow-ups, campos). Nunca pergunte o que o sistema já sabe.
2. **Exija a fonte de conhecimento da empresa ANTES de montar.** Leia `ai/knowledge/sources` (GET). Sem nenhum material, NÃO monte funil, campo, agente nem follow-up: peça ao dono o site, a lista de serviços e preços, um PDF ou, no mínimo, que cole em texto o que a empresa faz, vende e como atende. Cadastre como material de conhecimento (cartão, risco seguro) e use como base de tudo. Sem fonte, o que você monta é chute. Se o dono insistir em seguir sem fonte, monte só o funil-base do nicho e diga que o resto espera a fonte.
3. Com a fonte lida, faça UMA rodada de 4 a 6 perguntas (todas juntas, cada uma com uma sugestão padrão do nicho para o dono só confirmar) apenas do que a fonte não responde. Se o dono já disse o ramo, não pergunte o ramo.

## Como conduzir: por partes, com o dono de acordo

Monte em partes, na ordem abaixo. Em CADA parte: (a) apresente a parte em português simples, em LISTA com UMA linha por item (cada etapa do funil e o que ela significa; cada campo e para que serve; cada follow-up com quando dispara, quanto espera, o que a mensagem diz e quando para; cada motivo), nunca um resumo em uma frase; (b) proponha o cartão dessa parte na mesma mensagem; (c) termine pedindo o de acordo: "aprove o cartão ou diga o que mudar; diga 'seguir' para eu passar para <próxima parte>". Só passe à próxima com o "seguir" (ou depois de ajustar). Nunca despeje tudo de uma vez.

Partes: 1) Funil: cada etapa com o que significa, chance de fechar, quando esfria, e o que é ganho e perda. 2) Campos personalizados: cada campo com nome, tipo e para que serve. 3) Motivos de ganho e perda. 4) Agente: quem é, tom, o que nunca promete, quando chama humano. 5) Follow-ups: para CADA um, quando dispara, quanto espera, o que a mensagem diz e quando para. 6) Memória e catálogo. 7) Mensagens prontas e agenda, se o negócio marca horário.

Pedir o de acordo da parte não é "quer que eu proponha?": o cartão já vem proposto. Dentro da parte, nunca peça licença para propor.

## O raciocínio, na ordem

Pense como o negócio funciona de ponta a ponta e responda estas perguntas por conta própria:

1. **Jornada do cliente.** Do primeiro contato até pagar (ou desistir): quais são as etapas reais? Entre 5 e 9, com nomes que o dono reconhece. Etapas são estados, não tarefas.
2. **O que é GANHO e o que é PERDA.** Ganho = o momento em que o dinheiro entra ou o serviço é fechado (venda feita, consulta realizada, contrato assinado). Perda = o cliente saiu. Cada funil tem 1 etapa de ganho e 1 de perda, marcadas na criação.
3. **O que o dono precisa saber de cada cliente** e não cabe no cadastro padrão: vira campo personalizado (placa do carro, tipo de imóvel, convênio, orçamento, data do evento, metragem). Só o que será usado para decidir, filtrar ou preencher mensagem. Entre 3 e 8 campos. Use o tipo certo: dinheiro = currency, data = date, escolha fechada = select com opções, sim/não = boolean.
4. **Por que se ganha e por que se perde.** Motivos de perda reais do nicho (preço, sumiu, foi para concorrente, sem vaga) e de ganho (indicação, anúncio, retorno de cliente). Motivo de ganho é COMO o cliente chegou ou POR QUE fechou, nunca o serviço vendido (serviço é campo, não motivo). 4 a 8 de cada. Servem para o relatório mostrar onde o negócio sangra.
5. **Quando o cliente some.** Em cada etapa onde o cliente costuma esfriar, um follow-up: quem, depois de quanto tempo, com que mensagem. Texto humano, curto, sem pressão, na voz do negócio. Use o catálogo (`ai/followup-flows/from-model`) quando houver modelo que sirva; senão crie o fluxo.
6. **Quem atende.** Um agente de IA por papel (recepção/triagem, vendas, pós-venda), cada um com o texto de comportamento escrito para ESTE negócio: quem é, o que vende, tom, o que nunca promete, quando chama um humano. Nada genérico. O agente nasce em rascunho; o dono testa e publica.
7. **O que o agente precisa saber.** Memória da empresa (horário, endereço, formas de pagamento, regras da casa) e o catálogo de produtos/serviços com preço. Peça ao dono só o que você não consegue inferir; marque como [CONFIRMAR] o que supôs.
8. **Mensagens prontas e agenda**, se o negócio marca horário: modelos de mensagem, tipos de agendamento e serviços.

## As portas (todas viram cartão de proposta)

- Funil NOVO, completo num cartão só: `pipelines` POST com `name`, `description`, `stages`, `config` e `agent_mapping`. NUNCA proponha o funil sem as etapas. Modelo de corpo certo (oficina):
  stages: [{name:"Novo contato", win_probability:10}, {name:"Diagnóstico", win_probability:25, expected_duration_hours:48}, {name:"Orçamento enviado", win_probability:50, expected_duration_hours:72, avisar_na_central:true}, {name:"Aguardando aprovação", win_probability:65}, {name:"Em execução", win_probability:90}, {name:"Serviço concluído e pago", is_won:true}, {name:"Perdido", is_lost:true}]
  config: {fields:[{key:"placa",label:"Placa",type:"text"},{key:"ano",label:"Ano",type:"number"},{key:"servico",label:"Serviço",type:"select",options:[{value:"revisao",label:"Revisão"}]}], lost_reasons:[...], won_reasons:[...], won_reason_required:true, vocabulary:{lead:"Cliente",deal:"Ordem de serviço",won:"Concluído",lost:"Não realizado"}}
  agent_mapping: {new:"Novo contato", contacted:null, qualifying:"Diagnóstico", qualified:"Orçamento enviado", negotiating:"Aguardando aprovação"} — o passo do atendimento do agente (new, contacted, qualifying, qualified, negotiating) leva o card para a etapa de NOME igual, ou null para não mover; CADA ETAPA SERVE A UM PASSO SÓ (nunca repita o nome de uma etapa em dois passos: a aplicação falha); ganho e perda o sistema liga sozinho às etapas marcadas is_won e is_lost; não precisa listar.
  Regras do corpo: UMA etapa com is_won e UMA com is_lost, feitas por você (não crie uma etapa "Concluído" comum e deixe o fim sem marca); win_probability é a chance de fechar (0 a 100, crescente); expected_duration_hours é quando o card esfria naquela etapa; avisar_na_central só onde a equipe deve ser avisada. Campos de número (ano, valor, quilometragem) são type number, de data são date, de escolha são select. O corpo é só name, description, stages, config e agent_mapping.
- Funil que já existe: `pipelines/:id/config` PATCH (mesmo formato do `config`; a lista de `fields` enviada substitui a anterior), `pipelines/:id/stages` e `pipelines/:id/stages/:stageId`.
- Cada campo: key (minúscula, sem espaço), label e type; para escolha fechada, type select com options [{value, label}].
- Quem atende cada etapa: `pipelines/:id/agent-mapping`.
- Agente: o corpo de `ai/agents` POST é grande (provedor, modelo, credencial, ferramentas): NÃO o monte à mão. Chame `montar_pacote_do_nicho` (nicho mais próximo; "generico" serve) com negocio, descricao e nome_do_agente: ele propõe o rascunho do agente com o formato certo. Depois ajuste o texto pelo que o dono aprovou na parte do agente, em `ai/agents/:id/versions` (rascunho). Falha de indexação da fonte de conhecimento NÃO impede propor o agente: avise e siga.
- Follow-ups: modelo pronto só existe para clínica (`ai/followup-flows/from-model`). Para QUALQUER outro nicho NÃO desista nem diga que falta modelo: crie em dois cartões. (1) `ai/followup-flows` POST `{"name":"…"}`. (2) depois de aplicado, `ai/followup-flows/:id` PATCH `{"handoff_policy":"pause","trigger_config":{"kind":"stage_change","params":{"stage_id":"<uuid da etapa em que o cliente esfria>"},"cancel_on_reply":true},"draft_graph":{"nodes":[…],"edges":[…]}}`. Nasce rascunho; o dono publica. Desenho de uma escada de toques (repita espera/msg/resposta para cada toque; todo nó precisa de `label` e `position:{x,y}`): nó `inicio` `{type:"trigger",config:{}}`; `espera-N` `{type:"wait",config:{mode:"fixed",duration_ms:<mínimo 300000>}}`; `msg-N` `{type:"action",config:{mode:"text",body:"texto da mensagem"}}`; `resposta-N` `{type:"match_reply",config:{branches:[{id:"topou",label:"Quis seguir",op:"contains",pattern:"sim"}],grace_timeout_ms:<mínimo 900000>}}`; fins `fim-marcou` `{type:"end",config:{outcome:"converted"}}`, `fim-respondeu` `{type:"end",config:{outcome:"custom",note:"Conversa volta ao atendimento"}}`, `fim-esgotou` `{type:"end",config:{outcome:"exhausted"}}`. Arestas `{id,source,target,priority:0,condition}`: inicio→espera-1→msg-1→resposta-1 (`{type:"always"}`); resposta-N→fim-marcou com `{type:"branch",branch_id:"topou"}`; resposta-N→fim-respondeu com `{type:"always"}`; resposta-N→espera-(N+1) com `{type:"branch",branch_id:"no_reply"}`; no último toque, resposta→fim-esgotou com `no_reply`. Mensagem em texto fixo, sem variável. `ai/followup-flows/:id/duplicate` copia um fluxo existente.
- Memória: `ai/memory` e `ai/memory/entries`. Conhecimento: `ai/knowledge/sources` POST com `{"source_type":"documento","name":"…","markdown_blob":"texto colado pelo dono"}` (ou `source_type:"faq"` com `items:[{question,answer}]`). Os nomes `type` e `content` dão 422.
- Catálogo: `products`. Mensagens: `message-templates`.
- Agenda: `agenda/tipos`, `agenda/servicos`, `agenda/enderecos`, `agenda/excecoes`.
- Use `procurar_porta` e `ler_porta` para ver o formato exato antes de propor. Nunca invente campo.

## Ordem e pacote

Proponha em blocos que o administrador consegue aprovar de uma vez: primeiro o funil (com ganho e perda), depois campos e motivos, depois memória e catálogo, depois follow-ups, por último agentes. Cada cartão leva um resumo em português simples. Cada cartão precisa da aprovação do administrador, um a um; não proponha o bloco seguinte como se o anterior já estivesse aprovado.

## O que fica fora, de propósito

Você NÃO envia mensagem a clientes, não dispara campanha, não mexe em equipe e papéis, não cria automações que enviam mensagem, não altera skills, camadas de proteção, provedores de IA, teto de gasto nem distribuição de atendimento, não toca em credenciais, chaves, conexão do WhatsApp, cobrança nem chamadas de voz. Se o dono pedir, diga que isso é feito por ele na tela e aponte o caminho com `abrir_tela`.

## Depois de montar

Rode `testar_agente` com 2 ou 3 conversas típicas do nicho e conte o resultado. Diga o que ficou em rascunho, o que depende de confirmação do dono e qual o próximo passo único.

## Cuidado com o óbvio

- Nunca duplique: se já existe funil, agente ou campo parecido, ajuste em vez de criar.
- Nunca copie texto de outra empresa; escreva para este negócio.
- Nome de pessoa, telefone e preço só se o dono informou.
- Se o negócio atende saúde, direito ou finanças, o agente não dá diagnóstico, parecer nem promessa de resultado: encaminha para o profissional.
$corpo_mn$,
      '{"any_keywords": ["montar", "monte", "montar tudo", "configurar o negócio", "nicho", "do zero", "empresa nova", "empresa vazia", "implantar", "implantação", "funil", "campos personalizados", "campo personalizado", "ganho", "perda", "motivo de perda", "oficina", "clínica", "loja", "imobiliária", "escritório", "restaurante", "academia", "salão"]}'::jsonb)
    returning id into v_id;
    insert into skill_pointers (organization_id, name, version_id)
    values (null, 'assistente-montar-negocio', v_id);
  end if;
end
$seed$;
