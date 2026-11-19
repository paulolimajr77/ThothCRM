# Módulo opcional liberado por empresa (rascunho para o Paulo ler)

Situação: rascunho, medido em 31/10/2026 no código da branch `chore/assistente-em-dia-1.94`. Nada foi enviado ao Rafael.

## O problema

Quem hospeda vende o acesso empresa por empresa. Hoje um módulo opcional (ex.: Setores de atendimento) é ligado
pelo dono do servidor e **vale para todas as empresas da instalação**. Não dá para liberar Setores só para quem pagou.

## O que existe hoje (medido)

- 9 módulos opcionais da instalação (`MODULOS_OPCIONAIS`): banco_externo, fluxos_atendimento, propostas, crm_b2b,
  honorarios, financeiro, cobranca, login_codex, setores. A chave é do servidor (`platform_config` ou `modulos_instalados`).
- Só 2 coisas já são por empresa: `propostas` e `assistente` (`lib/organizacao/capacidades.ts`). A regra delas é a soma:
  módulo ligado no servidor **e** chave da empresa ligada. O assistente tem o botão Ligar/Desligar na página da empresa
  no admin (`CardDoAssistente`, ação `ligarAssistenteDoTenant`, com auditoria). É o desenho a copiar.
- Quem pergunta "este módulo está ligado?" não informa a empresa: `moduloLigado(db, modulo)`. Arquivos que citam cada
  módulo (fora testes): setores 5, crm_b2b 5, login_codex 5, banco_externo 8, honorarios 10, fluxos_atendimento 15,
  propostas 18, financeiro 26, cobranca 44.

## Proposta

1. Cada módulo ganha uma chave por empresa em `organizations.settings` (mesmo lugar de `assistente.enabled`), e a
   página da empresa no admin ganha um interruptor por módulo, com auditoria (`platform.*`).
2. Regra única: módulo ligado no servidor **e** liberado para a empresa. Ela passa a morar em `capacidadesDaOrganizacao`,
   que já soma as duas coisas para propostas.
3. Compatibilidade: instalação que não mexer em nada **continua igual** (módulo ligado vale para todas). A liberação por
   empresa só passa a valer para o módulo que o dono marcar como "liberar por empresa".
4. Fatias, uma por PR: (a) Setores (5 arquivos) como piloto; (b) os módulos com poucos consumidores; (c) os grandes
   (financeiro, cobrança), que pedem cuidado porque têm cron e webhook sem empresa na mão.

## Riscos a medir antes do código

- Consumidor que roda sem empresa (cron, webhook, tool de IA): precisa receber a empresa; senão cai no valor do servidor
  e vaza o recurso para empresa não liberada.
- Teste de duas empresas (uma liberada, outra não) para cada fatia: a outra não vê tela, rota nem ferramenta.
- Menu, rota e ferramenta MCP devem ler a MESMA resposta (hoje já é assim para propostas).

## Decisões do Paulo

- O padrão para empresa nova é "liberado" ou "bloqueado"? (Recomendo: igual ao de hoje, liberado, até o dono marcar.)
- Começar só por Setores?
