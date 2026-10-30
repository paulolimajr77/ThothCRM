/**
 * O APÊNDICE DO BASELINE É ESPELHO EXATO DA MIGRATION 8008 — mesma cerca da 8005.
 *
 * A migration cria `config_client_templates`, o modelo tirado de cliente real.
 * O kit self-host aplica SÓ o `baseline.sql`: sem o espelho exato, a instalação
 * nova não teria a tabela (e a tela de modelos quebraria) ou a teria sem as
 * travas de privilégio.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261029120001_8008_modelos_de_cliente_do_assistente.sql";
const ROTULO = "-- ---- modelos de cliente do assistente (migration 8008) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8");

describe("o apêndice do baseline espelha a migration 8008", () => {
  it("controle: os dois arquivos existem", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).length).toBeGreaterThan(500);
  });

  it("⭐ o conteúdo da migration aparece no baseline, sem uma única diferença, uma vez só", () => {
    const migration = ler(MIGRATION);
    const baseline = ler("supabase/baseline.sql");
    expect(baseline.includes(migration)).toBe(true);
    expect(baseline.split(ROTULO).length - 1).toBe(1);
  });

  it("a migration fecha a tabela para toda sessão e não tem organization_id", () => {
    const migration = ler(MIGRATION);
    expect(migration).toContain("revoke all on public.config_client_templates from public, anon, authenticated;");
    expect(migration).toContain("alter table public.config_client_templates enable row level security;");
    expect(migration).not.toMatch(/create policy/i);
    expect(migration).not.toMatch(/^\s*organization_id\s/m);
    expect(migration).not.toMatch(/grant [a-z, ]+ on public\.config_client_templates to (anon|authenticated)/i);
  });

  it("idempotente e psql puro; manifest numa linha só no topo", () => {
    const migration = ler(MIGRATION);
    expect(migration).toContain("create table if not exists public.config_client_templates");
    expect(migration).not.toMatch(/^\s*(begin|commit);/im);
    expect(migration.split("\n")[0]).toMatch(/^-- manifest: /);
  });
});
