-- manifest: **Guias do assistente sem referência a código, arquivo ou terminal.** Reescreve, em versão nova (a anterior fica guardada), as linhas dos guias `assistente-*` que mandavam o assistente abrir `app/app/`, `README.md`, `docs/`, `references/*.md` ou rodar comandos: ele não tem acesso a código nem a documentos, só às ferramentas (`ler_porta`, `listar_telas`, `abrir_tela`, `consultar_dados`, `testar_agente`, `ler_guia`). Idempotente: sem o texto antigo, nada muda. Tabelas: nenhuma nova.

-- ---- guias do assistente sem referência a código (migration 8012) ----
do $guias$
declare
  v_antigo record;
  v_corpo text;
  v_id uuid;
begin
  select v.* into v_antigo from skill_pointers p join skill_versions v on v.id = p.version_id
   where p.organization_id is null and p.name = 'assistente-operacao-mapa';
  if found then
    v_corpo := v_antigo.body;
    v_corpo := replace(v_corpo, $o$5. Para comportamento que possa ter mudado, confirme em `README.md`, `docs/current-state.md`, `docs/index.md` e no código atual.$o$, $n$5. Para comportamento que possa ter mudado, confira a tela de verdade com `listar_telas` e `abrir_tela`, ou leia a configuração com `ler_porta`.$n$);
    v_corpo := replace(v_corpo, $o$1. procure o nome em `app/app/` ou `app/admin/`;
2. consulte `README.md` e `docs/current-state.md`;
3. não transforme este arquivo em autoridade se a UI atual disser diferente.$o$, $n$1. procure a tela pelo nome com `listar_telas`;
2. se ajudar, mostre com `abrir_tela`;
3. não transforme este guia em autoridade se a tela atual disser diferente.$n$);
    v_corpo := replace(v_corpo, $o$1. código e estado atual do repositório;
2. documentação atual (`docs/current-state.md`, specs e runbooks);
3. skill especializada da área;
4. README e textos de ajuda.$o$, $n$1. o que o sistema mostra agora (`ler_porta`, `listar_telas`, `abrir_tela`);
2. o guia especializado da área (`ler_guia`);
3. este mapa.$n$);
    if v_corpo is distinct from v_antigo.body then
      insert into skill_versions (organization_id, name, description, body, matcher, manifest)
      values (null, v_antigo.name, v_antigo.description, v_corpo, v_antigo.matcher, v_antigo.manifest)
      returning id into v_id;
      update skill_pointers set version_id = v_id, updated_at = now()
       where organization_id is null and name = 'assistente-operacao-mapa';
    end if;
  end if;
  select v.* into v_antigo from skill_pointers p join skill_versions v on v.id = p.version_id
   where p.organization_id is null and p.name = 'assistente-prompt-diagnostico';
  if found then
    v_corpo := v_antigo.body;
    v_corpo := replace(v_corpo, $o$Lista completa em `references/anatomia-e-antipadroes.md`.$o$, $n$Lista completa no guia `assistente-prompt-anatomia` (`ler_guia`).$n$);
    v_corpo := replace(v_corpo, $o$custo por turno: `references/diagnostico.md`. Só depois disso você abre o prompt.$o$, $n$custo por turno: levante tudo com `auditar_empresa`, `ler_porta` e, se o seu papel permite, `consultar_dados`. Só depois disso você abre o prompt.$n$);
    v_corpo := replace(v_corpo, $o$Rode o bloco de `references/diagnostico.md`:$o$, $n$Levante, com `auditar_empresa`, `ler_porta` e `consultar_dados` (consultas no guia `assistente-metricas-consultas`):$n$);
    v_corpo := replace(v_corpo, $o$revise contra o checklist de `references/anatomia-e-antipadroes.md`:$o$, $n$revise contra o checklist do guia `assistente-prompt-anatomia`:$n$);
    v_corpo := replace(v_corpo, $o$Escreva a versão nova inteira em `prompt-<agente>-v<N>.md` com um bloco "o que mudou e por quê"$o$, $n$Escreva a versão nova inteira como rascunho da versão do agente (cartão `propor_mudanca`) e mostre à pessoa, no chat, um bloco "o que mudou e por quê"$n$);
    v_corpo := replace(v_corpo, $o$(o guia `deskcomm-cliente-novo` tem roteiros)$o$, $n$(o guia `assistente-cliente-novo` tem roteiros)$n$);
    v_corpo := replace(v_corpo, $o$pelo botão Testar: compare$o$, $n$com `testar_agente`: compare$n$);
    v_corpo := replace(v_corpo, $o$Registre a tabela em `references/diagnostico.md` (seção "antes/depois").$o$, $n$Mostre à pessoa a tabela antes/depois, no chat.$n$);
    if v_corpo is distinct from v_antigo.body then
      insert into skill_versions (organization_id, name, description, body, matcher, manifest)
      values (null, v_antigo.name, v_antigo.description, v_corpo, v_antigo.matcher, v_antigo.manifest)
      returning id into v_id;
      update skill_pointers set version_id = v_id, updated_at = now()
       where organization_id is null and name = 'assistente-prompt-diagnostico';
    end if;
  end if;
  select v.* into v_antigo from skill_pointers p join skill_versions v on v.id = p.version_id
   where p.organization_id is null and p.name = 'assistente-metricas-regua';
  if found then
    v_corpo := v_antigo.body;
    v_corpo := replace(v_corpo, $o$Não há banco na VPS: o Postgres é o Supabase, alcançado pela connection string `SUPABASE_DB_URL` do `.env` da instalação (Session pooler). Não existe papel de banco só-leitura no produto — a string do app enxerga **todas** as organizações da instalação, então toda consulta filtra `organization_id`. Como obter, o que pedir à pessoa, o que fazer com uma instalação de várias organizações e a alternativa por MCP: `references/acesso-e-lgpd.md`.$o$, $n$Você consulta pelas ferramentas `consultar_metrica`, `ler_porta` e `consultar_dados` (SQL só de leitura, já cercado pelo sistema e preso à empresa da pessoa). Nunca peça string de conexão, senha nem acesso ao servidor, e nunca devolva dado pessoal: só números agregados.$n$);
    v_corpo := replace(v_corpo, $o$Rode o bloco "panorama" de `references/consultas.md`:$o$, $n$Rode o panorama do guia `assistente-metricas-consultas`:$n$);
    v_corpo := replace(v_corpo, $o$estão em `references/regua-e-armadilhas.md`. Leia antes de afirmar.$o$, $n$estão neste guia. Leia antes de afirmar.$n$);
    v_corpo := replace(v_corpo, $o$Grave o relatório onde a pessoa pedir (`relatorio-<org>-<data>.md`).$o$, $n$Entregue o relatório no chat.$n$);
    v_corpo := replace(v_corpo, $o$passe o bastão ao guia `deskcomm-prompt`$o$, $n$passe o bastão ao guia `assistente-prompt-diagnostico`$n$);
    if v_corpo is distinct from v_antigo.body then
      insert into skill_versions (organization_id, name, description, body, matcher, manifest)
      values (null, v_antigo.name, v_antigo.description, v_corpo, v_antigo.matcher, v_antigo.manifest)
      returning id into v_id;
      update skill_pointers set version_id = v_id, updated_at = now()
       where organization_id is null and name = 'assistente-metricas-regua';
    end if;
  end if;
  select v.* into v_antigo from skill_pointers p join skill_versions v on v.id = p.version_id
   where p.organization_id is null and p.name = 'assistente-nichos-3';
  if found then
    v_corpo := v_antigo.body;
    v_corpo := replace(v_corpo, $o$(`G4_LEGAL_REGEX` em `lib/ai/handoff/regex.ts`, aplicado por
   `checkG4Legal`) $o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$ (`workers/ai-response-worker.ts`)$o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$(`elegivelParaWorkerLegado()` em `lib/ai/agents/no-ar.ts` devolve `false` desde a v1.17.0)$o$, $n$(isso vale desde a v1.17.0)$n$);
    v_corpo := replace(v_corpo, $o$ (`detectHumanHandoffRequest` em
     `lib/agent-engine/agent/human-handoff.ts`)$o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$(`AGENT_TOOL_DEFS` em `lib/agent-engine/agent/inbound-turn.ts`) $o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$(ou o esqueleto de `prompt-do-agente.md`)$o$, $n$(ou o esqueleto do guia `assistente-prompt-do-agente`)$n$);
    if v_corpo is distinct from v_antigo.body then
      insert into skill_versions (organization_id, name, description, body, matcher, manifest)
      values (null, v_antigo.name, v_antigo.description, v_corpo, v_antigo.matcher, v_antigo.manifest)
      returning id into v_id;
      update skill_pointers set version_id = v_id, updated_at = now()
       where organization_id is null and name = 'assistente-nichos-3';
    end if;
  end if;
  select v.* into v_antigo from skill_pointers p join skill_versions v on v.id = p.version_id
   where p.organization_id is null and p.name = 'assistente-sistema-vivo';
  if found then
    v_corpo := v_antigo.body;
    v_corpo := replace(v_corpo, $o$- Registro: `event_log`, `audit()` de `lib/audit/` → `api_audit_log`, `crm_lead_activities`.$o$, $n$- Registro: o histórico de eventos, a auditoria e a linha do tempo do lead.$n$);
    v_corpo := replace(v_corpo, $o$- Tela: Timeline no inbox, Radar de Risco (`/app/radar`), painéis em `app/app/`.$o$, $n$- Tela: linha do tempo na conversa, Radar de Risco e os painéis.$n$);
    v_corpo := replace(v_corpo, $o$- Porta: `lib/navigation/registry.ts` ou allowlist com justificativa escrita em `tests/unit/navegacao-completude.test.ts`.$o$, $n$- Porta: toda tela nova tem entrada no menu.$n$);
    v_corpo := replace(v_corpo, $o$- Anti-morte: Motor de follow-up (`lib/followup/`, `lib/agent-engine/cron/`) + Radar de Risco.$o$, $n$- Anti-morte: o motor de follow-up e o Radar de Risco.$n$);
    v_corpo := replace(v_corpo, $o$- Continuidade IA↔humano: `buildHandoffSummary()` em `lib/agent-engine/agent/human-handoff.ts`.$o$, $n$- Continuidade IA↔humano: o resumo que a pessoa recebe quando a IA passa a conversa.$n$);
    v_corpo := replace(v_corpo, $o$- Mapa: `docs/architecture/*.json`.$o$, $n$$n$);
    if v_corpo is distinct from v_antigo.body then
      insert into skill_versions (organization_id, name, description, body, matcher, manifest)
      values (null, v_antigo.name, v_antigo.description, v_corpo, v_antigo.matcher, v_antigo.manifest)
      returning id into v_id;
      update skill_pointers set version_id = v_id, updated_at = now()
       where organization_id is null and name = 'assistente-sistema-vivo';
    end if;
  end if;
  select v.* into v_antigo from skill_pointers p join skill_versions v on v.id = p.version_id
   where p.organization_id is null and p.name = 'assistente-sistema-vivo-completo';
  if found then
    v_corpo := v_antigo.body;
    v_corpo := replace(v_corpo, $o$Esta skill é o **gate operacional**. A lei está em `docs/doctrine/sistema-vivo.md`; o racional completo, no manual `docs/doctrine/sistema-vivo/`.$o$, $n$Esta skill é o **gate operacional** de arquitetura: antes de propor algo, confira os sete invariantes abaixo.$n$);
    v_corpo := replace(v_corpo, $o$> **Portabilidade:** as seções 1 a 6 são universais — valem em qualquer sistema que adote a doutrina. A seção 7 (*Binding*) é o que muda de repositório para repositório. Ao levar esta skill para outro sistema, **reescreva só a seção 7**.$o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$| Que registro eu emito? | `event_log` (side effects) · `audit()` de `lib/audit/` → `api_audit_log` · `crm_lead_activities` (timeline do lead) |$o$, $n$| Que registro eu emito? | o histórico de eventos · a auditoria · a linha do tempo do lead |$n$);
    v_corpo := replace(v_corpo, $o$| Onde apareço na tela? | Timeline no inbox · Radar de Risco (`/app/radar`) · painéis em `app/app/` |$o$, $n$| Onde apareço na tela? | linha do tempo na conversa · Radar de Risco · painéis |$n$);
    v_corpo := replace(v_corpo, $o$| Por qual porta se chega? | `lib/navigation/registry.ts` — ou allowlist **com justificativa escrita** em `tests/unit/navegacao-completude.test.ts` |$o$, $n$| Por qual porta se chega? | toda tela nova tem entrada no menu |$n$);
    v_corpo := replace(v_corpo, $o$| Qual meu anti-morte? | Motor de follow-up (`lib/followup/`, `lib/agent-engine/cron/`) + Radar de Risco |$o$, $n$| Qual meu anti-morte? | o motor de follow-up + Radar de Risco |$n$);
    v_corpo := replace(v_corpo, $o$| Qual a continuidade IA↔humano? | `buildHandoffSummary()` em `lib/agent-engine/agent/human-handoff.ts` |$o$, $n$| Qual a continuidade IA↔humano? | o resumo que a pessoa recebe quando a IA passa a conversa |$n$);
    v_corpo := replace(v_corpo, $o$| Atualizei o mapa? | `docs/architecture/*.json` (fonte da verdade). **Sem re-render:** o archify 2.11.0 recusa o formato `architecture` — ver `docs/architecture/README.md` |$o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$**Orientação antes de implementar:** rode `graphify query "<pergunta>"` sobre `graphify-out/` para descobrir de quem a peça recebe e quem ela deve alimentar — evita criar ilha por desconhecimento do que já existe.$o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$**Gates mecânicos ligados:** completude de navegação (`tests/unit/navegacao-completude.test.ts`) · forma da cadeia de envio (`tests/unit/before-send-chain-shape.test.ts`) · isolamento entre organizações (`tests/invariants/`).$o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$**Não substitui outras doutrinas — rode junto:** Schema, RLS, migrations, DIRC → `CLAUDE.md`; Canais externos → `docs/doctrine/restricao-de-canal.md`; Fala × operação → `docs/doctrine/separacao-fala-e-operacao.md`.$o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$**Definition of Done:** o item "Living System Checklist" do `CLAUDE.md` é este mesmo checklist. A task não fecha sem ele.$o$, $n$$n$);
    v_corpo := replace(v_corpo, $o$A skill basta para a maioria das implementações. Vá ao manual (`docs/doctrine/sistema-vivo/`) quando: precisar do racional para convencer alguém (`01-fundamentos.md`); criar/revisar um invariante (`02-lei-dos-invariantes.md`); definir métrica, painel ou meta (`03-medida-do-proposito.md`); mexer em handoff, escalada, permissão ou autoridade da IA (`04-fronteira-de-autoridade.md`); mexer em lead, caso, conversa ou demanda (`05-unidade-de-demanda.md`); decidir sobre realtime, throttle, delay ou agendamento (`06-tempo-do-sistema.md`); tratar de adoção, contribuição, telemetria ou patrocínio (`07-o-projeto-como-sistema.md`); ligar um gate ou adotar a doutrina num sistema novo (`08-aplicacao.md`).$o$, $n$$n$);
    if v_corpo is distinct from v_antigo.body then
      insert into skill_versions (organization_id, name, description, body, matcher, manifest)
      values (null, v_antigo.name, v_antigo.description, v_corpo, v_antigo.matcher, v_antigo.manifest)
      returning id into v_id;
      update skill_pointers set version_id = v_id, updated_at = now()
       where organization_id is null and name = 'assistente-sistema-vivo-completo';
    end if;
  end if;
end
$guias$;
