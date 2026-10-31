/**
 * O APÊNDICE DO BASELINE É ESPELHO EXATO DA MIGRATION 8012, E OS GUIAS DO ASSISTENTE NÃO
 * MANDAM ELE ABRIR CÓDIGO, ARQUIVO OU TERMINAL.
 *
 * O assistente interno só tem as ferramentas (`ler_porta`, `listar_telas`, `abrir_tela`...): não lê
 * `app/app/`, `README.md`, `docs/` nem roda comando. Os guias foram copiados de skills feitas para
 * quem programa e mandavam isso; a 8012 troca essas linhas por ferramentas do assistente.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261031050000_8012_guias_do_assistente_sem_referencia_a_codigo.sql";

function ler(caminho: string): string {
  return readFileSync(join(RAIZ, caminho), "utf8");
}

describe("migration 8012: guias do assistente sem referência a código", () => {
  it("controle: a migration e o baseline existem", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).length).toBeGreaterThan(1000);
  });

  it("⭐ o conteúdo da migration aparece no baseline, sem uma única diferença", () => {
    const corpo = ler(MIGRATION).split("\n").slice(2).join("\n");
    expect(ler("supabase/baseline.sql").includes(corpo)).toBe(true);
  });

  it("a migration não ensina nada que o assistente não consegue fazer", () => {
    // Os textos NOVOS (entre `$n$`) citam só ferramentas do assistente, nunca arquivo, pasta ou comando.
    const novos = [...ler(MIGRATION).matchAll(/\$n\$([\s\S]*?)\$n\$/g)].map((m) => m[1]!).join("\n");
    expect(novos.length).toBeGreaterThan(500);
    expect(novos).not.toMatch(/docs\/|app\/app|README|references\/|lib\/|\.md\b|CLAUDE|graphify|SUPABASE_DB_URL|psql|pnpm/);
    expect(novos).toContain("listar_telas");
    expect(novos).toContain("consultar_dados");
  });
});
