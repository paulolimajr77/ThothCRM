/**
 * O APÊNDICE DO BASELINE É ESPELHO EXATO DA MIGRATION 8010.
 *
 * A migration semeia as skills de plataforma do assistente com o conhecimento de
 * implantação por nicho (triagem, telas e campos, prompt do agente, nichos 1 a 3).
 * O kit self-host aplica SÓ o `baseline.sql`; sem espelho exato, o clone não
 * recebe essas skills.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "..");
const MIGRATION =
  "supabase/migrations/20261029190000_8010_skills_do_assistente_conhecimento_de_negocio.sql";

const SKILLS = [
  "assistente-triagem-do-negocio",
  "assistente-telas-e-campos",
  "assistente-prompt-do-agente",
  "assistente-nichos-1",
  "assistente-nichos-2",
  "assistente-nichos-3",
];

const BLOCO_PADRAO =
  "> Como o assistente usa isto: você não clica em telas. Para cada coisa abaixo você propõe um cartão (`propor_mudanca`) pela porta equivalente;";

function ler(caminho: string): string {
  return readFileSync(join(RAIZ, caminho), "utf8");
}

describe("o apêndice do baseline espelha a migration 8010", () => {
  it("controle: os dois arquivos existem e não estão vazios", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).length).toBeGreaterThan(1000);
    expect(ler("supabase/baseline.sql").length).toBeGreaterThan(1000);
  });

  it("⭐ o conteúdo da migration aparece no baseline, sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    const baseline = ler("supabase/baseline.sql");

    const corpo = migration.split("\n").slice(2).join("\n");

    if (!baseline.includes(corpo)) {
      const linhas = corpo.split("\n");
      const divergente = linhas.findIndex((l) => l.trim().length > 0 && !baseline.includes(l));
      throw new Error(
        divergente === -1
          ? "O baseline não contém a migration inteira, mas toda linha dela existe nele isolada."
          : `O apêndice do baseline divergiu da migration a partir da linha ${divergente + 1}:\n` +
            `  ${linhas[divergente]}\n` +
            "Reaplique o bloco a partir da migration. Não edite o baseline à mão.",
      );
    }
    expect(baseline.includes(corpo)).toBe(true);
  });

  it("a migration é idempotente e portável em psql puro", () => {
    const migration = ler(MIGRATION);
    expect(migration).toContain("do $seed$");
    expect(migration).toContain("end\n$seed$;");
    expect(migration).not.toMatch(/^\s*(begin|commit)\s*;/im);
  });

  it("cada skill listada é semeada uma vez, com a guarda `if not exists` própria", () => {
    const migration = ler(MIGRATION);
    for (const nome of SKILLS) {
      expect(migration).toContain(`name = '${nome}'`);
      expect(migration).toContain(`values (null, '${nome}', v_id);`);
      expect(migration.split(`values (null, '${nome}', v_id);`).length - 1).toBe(1);
    }
    expect(migration.split("if not exists (").length - 1).toBe(SKILLS.length);
  });

  it("todo corpo cabe em 200 linhas e traz o bloco padrão de adaptação", () => {
    const migration = ler(MIGRATION);
    const corpos = [...migration.matchAll(/\$(corpo_\w+)\$([\s\S]*?)\$\1\$/g)].map((m) => m[2] ?? "");
    expect(corpos).toHaveLength(SKILLS.length);
    for (const corpo of corpos) {
      expect(corpo.split("\n").length).toBeLessThanOrEqual(200);
      expect(corpo).toContain(BLOCO_PADRAO);
    }
  });

  it("o cabeçalho traz a linha `-- manifest:` numa linha só", () => {
    const migration = ler(MIGRATION);
    const linhas = migration.split("\n");
    expect((linhas[0] ?? "").startsWith("-- manifest: ")).toBe(true);
    expect(linhas.filter((l) => l.startsWith("-- manifest:")).length).toBe(1);
    expect(linhas[1]).toBe("");
  });
});
