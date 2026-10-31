/**
 * A faixa 8000–8999 é exclusiva do fork do assistente interno.
 *
 * Caso 1: toda migration cujo nome contém `assistente`, `config_proposals` ou
 * `config_snapshots` tem número na faixa 8000–8999.
 *
 * Caso 2: nenhuma migration FORA dessa lista tem número nessa faixa. A faixa
 * era 9000 até 29/10/2026, quando o produto passou a numerar a partir de 9016;
 * se o produto um dia entrar na 8000, este teste avisa que a faixa colidiu.
 *
 * O NNNN é lido com a âncora canônica `^[0-9]{14}_([0-9]{4})_`.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const DIR = join(process.cwd(), "supabase", "migrations");

// Âncora canônica: timestamp de 14 dígitos, underline, NNNN de 4 dígitos, underline, slug.
const NUMERO = /^[0-9]{14}_([0-9]{4})_/;

/** É do assistente interno? Nome da migration (sem .sql) contém um dos marcadores. */
function ehDoAssistente(nome: string): boolean {
  const lower = nome.toLowerCase();
  return (
    lower.includes("assistente") ||
    lower.includes("config_proposals") ||
    lower.includes("config_snapshots")
  );
}

const naFaixa = (n: number): boolean => n >= 8000 && n <= 8999;

function numerosDasMigrations(): { arquivo: string; numero: number; ehDoAssistente: boolean }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((arquivo) => {
      const m = NUMERO.exec(arquivo);
      return {
        arquivo,
        numero: m ? Number(m[1]) : -1,
        ehDoAssistente: ehDoAssistente(arquivo.replace(/\.sql$/, "")),
      };
    })
    .filter((m) => m.numero > 0);
}

describe("assistente — migrations na faixa própria (8000)", () => {
  it("toda migration do assistente interno tem número na faixa 8000–8999", () => {
    const foraDaFaixa = numerosDasMigrations().filter(
      (m) => m.ehDoAssistente && !naFaixa(m.numero),
    );
    expect(
      foraDaFaixa.map((m) => m.arquivo),
      "migration do assistente fora da faixa 8000–8999 — ainda não foi renumerada",
    ).toEqual([]);
  });

  it("nenhuma migration fora da lista do assistente usa a faixa 8000–8999", () => {
    const invasoras = numerosDasMigrations().filter(
      (m) => !m.ehDoAssistente && naFaixa(m.numero),
    );
    expect(
      invasoras.map((m) => m.arquivo),
      "migration não-assistente na faixa 8000–8999 — colisão com o fork",
    ).toEqual([]);
  });
});
