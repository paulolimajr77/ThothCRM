/**
 * A tela não pode dizer "pronto" com a chave morta: se a última leitura do
 * material foi recusada pelo provedor, o estado traz o aviso do que fazer.
 */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ ultima: { current: null as unknown } }));

vi.mock("@/lib/ai/embeddings/chave", () => ({
  EXPLICACAO_DA_ORIGEM: { instalacao: "Usando a chave da instalação." },
  FamiliaDaBaseIlegivelError: class extends Error {},
  familiaDaBase: async () => null,
  provedorDaBase: () => "openai",
  resolverChaveDeEmbedding: async () => ({ origem: "instalacao", rotulo: null, avisos: [] }),
}));

import { AVISO_DA_CHAVE_RECUSADA, montarEstadoDaChave } from "./estado";

function banco() {
  const lista = { order: () => lista, in: () => lista, eq: () => lista, then: (r: (v: unknown) => void) => r({ data: [] }) };
  const ultima = {
    eq: () => ultima,
    order: () => ultima,
    limit: () => ultima,
    maybeSingle: async () => ({ data: deps.ultima.current }),
  };
  return {
    from: (t: string) => ({ select: () => (t === "ai_knowledge_versions" ? ultima : lista) }),
  } as never;
}

beforeEach(() => {
  deps.ultima.current = null;
});

describe("montarEstadoDaChave × chave recusada", () => {
  it("última leitura falhou com 'User not found' → aviso; pode_indexar segue true (dá para trocar a chave e tentar de novo)", async () => {
    deps.ultima.current = { status: "failed", error_message: "embed@lote 0-7: User not found." };
    const e = await montarEstadoDaChave(banco(), "org");
    expect(e.avisos).toContain(AVISO_DA_CHAVE_RECUSADA);
    expect(e.pode_indexar).toBe(true);
  });

  it("falha que não é recusa de chave, ou última leitura boa → sem aviso", async () => {
    deps.ultima.current = { status: "failed", error_message: "timeout" };
    expect((await montarEstadoDaChave(banco(), "org")).avisos).toEqual([]);
    deps.ultima.current = { status: "ready", error_message: null };
    expect((await montarEstadoDaChave(banco(), "org")).avisos).toEqual([]);
  });
});
