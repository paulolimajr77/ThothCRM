/**
 * TODA ROTA DO ASSISTENTE RECUSA A EMPRESA QUE A PLATAFORMA NÃO LIGOU.
 *
 * Esconder o botão não protege nada: a guarda é do servidor. Esta cerca varre
 * `app/api/v1/ai/assistente/**` e exige, em cada handler (GET/POST/…), a
 * chamada de `recusarSeAssistenteDesligado` com a organização DA SESSÃO,
 * logo depois de `requireRole`. Rota nova sem a guarda reprova aqui.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "..");
const PASTA = join(RAIZ, "app/api/v1/ai/assistente");

function rotas(pasta: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) achados.push(...rotas(caminho));
    else if (nome === "route.ts") achados.push(caminho);
  }
  return achados;
}

describe("guarda de assistente ligado em toda rota", () => {
  const arquivos = rotas(PASTA);

  it("controle: a varredura enxerga as rotas (senão lista vazia leria como 'tudo guardado')", () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(9);
  });

  it("cada handler exportado tem uma guarda com a organização da sessão", () => {
    for (const arquivo of arquivos) {
      const codigo = readFileSync(arquivo, "utf8");
      const handlers = codigo.match(/export async function (GET|POST|PATCH|PUT|DELETE)\b/g) ?? [];
      const guardas = codigo.match(/recusarSeAssistenteDesligado\(authz\.org\.orgId,/g) ?? [];
      const nome = relative(RAIZ, arquivo).split(sep).join("/");
      expect(handlers.length, nome).toBeGreaterThan(0);
      expect(guardas.length, nome).toBeGreaterThanOrEqual(handlers.length);
    }
  });
});
