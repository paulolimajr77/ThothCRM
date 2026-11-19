## O que corrige

A recusa permanente (`service_stale`, `google_stale`, `appointment_stale`, `meet_stale`, `followup_stale`, `reply_stale`, `demanda_stale`, `service_event_origin_unsupported`, `service_origin_cycle`, `google_selection_stale`, `google_outcome_protected`, `appointment_flow_changed`, `meet_booking_stale`, `meet_delivery_not_accepted`, `meet_conversation_stale`, `followup_job_stale`, `reply_agent_stale`) saía com `errcode='40001'` — o PostgREST traduz a classe 40 para HTTP 500, e o gateway reexecuta 5xx sem limite, ocupando o pool (`PGRST003`) e pondo o produto inteiro em "Algo deu errado".

A guarda anti-replay (`fn_pgrst_recusar_replay_do_gateway`, migration 0250) não alcança o caso no self-hosted: ela lê o `sb-request-id`, e esse cabeçalho só o gateway da NUVEM do Supabase carimba. Numa VPS com proxy próprio, a guarda retorna cedo e o laço não tem fim.

A saída de classe é a mesma da 0514 (`fn_service_status`) e da 0363 (agenda): `PT409`. O PostgREST lê os 3 últimos dígitos de `PTxxx` como status HTTP; `PT409` chega como 409 e 4xx não é reexecutado.

## O que mudou

- 79 raises de `40001` → `PT409` em 10 migrations (`0222`, `0223`, `0224`, `0225`, `0226`, `0227`, `0229`, `0343`, `0551`, `0578`).
- `service_contact_changed` (7 sítios) CONTINUA `40001`, de propósito: repetir passa (`pre_contact` muda). A mesma regra da 0514.
- Migration 0700 (`recusa_permanente_stale_vira_pt409`) + manifest no cabeçalho + apêndice no `baseline.sql`.
- Cliente (`lib/atendimento/origem.ts`) lê `PT409` como recusa permanente (backward-compat com `40001`).
- `.changes/stale-pt409-nao-repete-0700.md` declara efeito no operador.

## Medido

- **Antes (21:02 UTC):** `supabase-db` 243% CPU, load 8, 10 backends `postgres` em `SELECT waiting` no RPC `fn_service_event_origin`, rollbacks ~1.750/s, `PGRST003` em todos os crons, app retornando `digest: 4208375138`.
- **Depois do `restart` do `supabase-rest` (21:07:15):** `PGRST003` sumiu do log, `supabase-db` a 1,7% CPU, `supabase-rest` 0,11%, login responde 200/0,1s. A guarda (`pg_stat_statements`) tem 38M+ chamadas acumuladas.

## Verificação

- [ ] `pnpm test:db` passa.
- [ ] `pnpm test:shell` passa.
- [ ] `pnpm test:e2e` passa (se mudou fluxo).
- [ ] `DESKCOMM_MIGRATION_EDIT=1` no commit.
- [ ] `.changes/` fragmento com efeito no operador (`exige_acao`: variável não mudou, mas a instalação precisa atualizar para a nova versão publicada).
- [ ] Nenhuma feature nomeia provider (`lint:channels` passa).

Refs: `docs/runbooks/postgrest-replay-do-gateway.md`; `docs/doctrine/versionamento.md`; `docs/doctrine/sistema-vivo.md`; migrations `0250` (guarda), `0363` (agenda), `0514` (precedente `PT409` em `fn_service_status`).