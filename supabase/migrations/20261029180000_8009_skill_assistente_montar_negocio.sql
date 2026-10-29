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
3. **Proponha por cartão**, na ordem que o sistema impõe, com resumo em português simples. Os cartões são independentes: o administrador aprova na ordem que quiser, então proponha TODOS na mesma resposta (funil, campos, motivos, agente, follow-ups, memória), sem esperar a aprovação de um para propor o próximo. "Não há modelo pronto" não é motivo para pular um item: o modelo pronto só cobre parte, o resto você monta pelo guia da área e pelo formato da porta. Na resposta final, liste cada item com o cartão proposto, ou o dado que falta; nunca "não configurado" sem cartão.
4. **Depois de aplicado, leia de volta e confira item por item** contra a lista do passo 2. O que ficou vazio ou errado vira novo cartão. Só diga "pronto" quando a leitura confirmar.
5. **Se a porta recusar** (erro 422, "falha ao aplicar"), leia o motivo, corrija o cartão e proponha de novo. Nunca desista dizendo que "a ferramenta não permite" sem ter lido o formato da porta.

## Antes de propor qualquer coisa

1. `auditar_empresa` — veja o que já existe (funis, agentes, follow-ups, campos). Nunca pergunte o que o sistema já sabe.
2. Pergunte no máximo UMA coisa, só se faltar: o que a empresa vende e como o cliente chega. Com isso você deduz o resto. Se o dono já disse o ramo, não pergunte.
3. Diga em duas frases o plano (o que vai propor, nesta ordem) e então proponha. O administrador aprova cada cartão.

## O raciocínio, na ordem

Pense como o negócio funciona de ponta a ponta e responda estas perguntas por conta própria:

1. **Jornada do cliente.** Do primeiro contato até pagar (ou desistir): quais são as etapas reais? Entre 5 e 9, com nomes que o dono reconhece. Etapas são estados, não tarefas.
2. **O que é GANHO e o que é PERDA.** Ganho = o momento em que o dinheiro entra ou o serviço é fechado (venda feita, consulta realizada, contrato assinado). Perda = o cliente saiu. Cada funil tem 1 etapa de ganho e 1 de perda, marcadas na criação.
3. **O que o dono precisa saber de cada cliente** e não cabe no cadastro padrão: vira campo personalizado (placa do carro, tipo de imóvel, convênio, orçamento, data do evento, metragem). Só o que será usado para decidir, filtrar ou preencher mensagem. Entre 3 e 8 campos. Use o tipo certo: dinheiro = currency, data = date, escolha fechada = select com opções, sim/não = boolean.
4. **Por que se ganha e por que se perde.** Motivos de perda reais do nicho (preço, sumiu, foi para concorrente, sem vaga) e de ganho (indicação, anúncio, retorno de cliente). 4 a 8 de cada. Servem para o relatório mostrar onde o negócio sangra.
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
- Agente: `ai/agents` POST; texto: `ai/agents/:id/versions` POST (rascunho) e PATCH.
- Follow-ups: `ai/followup-flows/from-model`, `ai/followup-flows/:id/duplicate`.
- Memória: `ai/memory` e `ai/memory/entries`. Conhecimento: `ai/knowledge/sources`.
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
