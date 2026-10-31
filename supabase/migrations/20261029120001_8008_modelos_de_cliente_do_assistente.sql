-- manifest: **Modelos tirados de cliente real (assistente, item 2 da #1995).** Cria `config_client_templates`: a ESTRUTURA (funis com etapas, agentes com o texto limpo, follow-ups do catálogo) copiada de uma organização para virar modelo de outra do mesmo ramo. É ativo da INSTALAÇÃO, não de uma empresa: não tem `organization_id` e a origem fica só como hash. Nenhuma sessão lê nem escreve (sem grant a anon/authenticated, RLS ligada sem policy): só o servidor, atrás do admin da plataforma. Só o modelo `revisado` pode ser aplicado, e a revisão recusa texto com termo do nome da origem (`source_terms`). Apêndice idempotente no baseline.
-- ---- modelos de cliente do assistente (migration 8008) ----
create table if not exists public.config_client_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 80),
  niche           text check (niche is null or niche ~ '^[a-z_]{1,40}$'),
  status          text not null default 'rascunho' check (status in ('rascunho', 'revisado')),
  structure       jsonb not null check (jsonb_typeof(structure) = 'object' and octet_length(structure::text) <= 262144),
  warnings        jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  -- sha256 do id da organização de origem: rastreia sem guardar a origem.
  source_hash     text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  -- Os termos do nome da origem (nome inteiro e palavras próprias): a revisão
  -- recusa texto que ainda tenha um deles. Nunca sai da instalação.
  source_terms    jsonb not null default '[]'::jsonb check (jsonb_typeof(source_terms) = 'array'),
  created_by      uuid references auth.users(id) on delete set null,
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check ((status = 'revisado') = (reviewed_at is not null))
);

create index if not exists config_client_templates_status_idx
  on public.config_client_templates (status, created_at desc);

alter table public.config_client_templates enable row level security;

-- ── Privilégio: nenhuma sessão; só o servidor (admin da plataforma) ────────
-- O revoke vem DEPOIS do create: os default privileges do baseline dariam
-- leitura e escrita a authenticated. RLS ligada e sem policy é a segunda trava.
revoke all on public.config_client_templates from public, anon, authenticated;
grant all on public.config_client_templates to service_role;
