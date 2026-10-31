/**
 * Ler a configuração vale para a equipe toda; criar e alterar, não (decisão do Paulo,
 * 29/10/2026). Medido no espelho: um atendente perguntou ao assistente "quantos
 * agentes existem" e ouviu que a lista é de gestor — a RLS de SELECT dessas tabelas
 * já era só por organização; a trava estava apenas na porta da API.
 *
 * Esta cerca prende os DOIS lados em cada rota: o GET aceita `viewer` e cada handler
 * que escreve continua pedindo o papel de cima. Credenciais e modelos de IA ficam
 * de fora de propósito (regra 1 do assistente).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROTAS: Record<string, readonly string[]> = {
  "app/api/v1/ai/agents/route.ts": ["POST"],
  "app/api/v1/ai/agents/[id]/route.ts": ["PATCH", "DELETE"],
  "app/api/v1/pipelines/route.ts": ["POST"],
  "app/api/v1/pipelines/[id]/stages/route.ts": ["POST"],
};

/** O texto do handler `metodo`, do `export async function` até o próximo `export`. */
function handler(fonte: string, metodo: string): string {
  const inicio = fonte.indexOf(`export async function ${metodo}(`);
  if (inicio < 0) return "";
  const fim = fonte.indexOf("\nexport ", inicio + 10);
  return fonte.slice(inicio, fim < 0 ? undefined : fim);
}

const papelPedido = (trecho: string): string | null =>
  trecho.match(/requireRole\("([a-z]+)"/)?.[1] ?? trecho.match(/\brole: "([a-z]+)"/)?.[1] ?? null;

describe("a configuração é lida pela equipe toda e alterada só por quem pode", () => {
  it.each(Object.entries(ROTAS))("%s", (arquivo, escritas) => {
    const fonte = readFileSync(join(process.cwd(), arquivo), "utf8");
    expect(papelPedido(handler(fonte, "GET")), `${arquivo} GET`).toBe("viewer");
    for (const metodo of escritas) {
      const trecho = handler(fonte, metodo);
      expect(trecho, `${arquivo} ${metodo} existe`).not.toBe("");
      expect(["manager", "admin"], `${arquivo} ${metodo}`).toContain(papelPedido(trecho));
    }
  });

  it("credenciais e modelos de IA continuam fechados para a equipe", () => {
    for (const arquivo of [
      "app/api/v1/ai/credentials/route.ts",
      "app/api/v1/ai/providers/route.ts",
    ]) {
      const fonte = readFileSync(join(process.cwd(), arquivo), "utf8");
      expect(["manager", "admin"], arquivo).toContain(papelPedido(handler(fonte, "GET")));
    }
  });
});
