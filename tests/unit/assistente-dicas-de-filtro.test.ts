/**
 * As dicas de filtro do assistente (`lib/assistente/portas/dicas.ts`) só podem citar
 * filtros que a porta de fato lê — uma dica velha faria o modelo pedir um recorte que
 * a rota ignora e concluir pela lista inteira, o defeito que elas existem para evitar.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CATALOGO_DE_PORTAS } from "@/lib/assistente/portas/catalogo.gerado";
import { DICAS_DE_FILTRO } from "@/lib/assistente/portas/dicas";

/** Onde cada porta lê os filtros: a rota e, quando houver, o esquema que ela usa. */
const FONTES: Record<string, readonly string[]> = {
  contacts: ["lib/schemas/contacts.ts"],
  conversations: ["app/api/v1/conversations/route.ts"],
  "agenda/agendamentos": ["app/api/v1/agenda/agendamentos/route.ts"],
  "external-db/connections/:id/tables/:schema/:tabela": [
    "app/api/v1/external-db/connections/[id]/tables/[schema]/[tabela]/route.ts",
  ],
};

const lido = (arquivos: readonly string[]): string =>
  arquivos.map((a) => readFileSync(join(process.cwd(), a), "utf8")).join("\n");

describe("dicas de filtro do assistente", () => {
  it("toda dica tem a fonte declarada aqui", () => {
    expect(Object.keys(DICAS_DE_FILTRO).sort()).toEqual(Object.keys(FONTES).sort());
  });

  it("toda porta com dica existe no catálogo e tem leitura", () => {
    for (const id of Object.keys(DICAS_DE_FILTRO)) {
      const porta = CATALOGO_DE_PORTAS.find((p) => p.id === id);
      expect(porta, id).toBeDefined();
      expect(porta?.metodos, id).toContain("GET");
    }
  });

  it.each(Object.entries(DICAS_DE_FILTRO))("a porta %s lê cada filtro que a dica cita", (id, dica) => {
    const fonte = lido(FONTES[id] ?? []);
    for (const filtro of dica.filtros) {
      const lê = fonte.includes(`"${filtro}"`) || new RegExp(`\\b${filtro}\\s*:`).test(fonte);
      expect(lê, `${id}: filtro ${filtro}`).toBe(true);
    }
  });
});
