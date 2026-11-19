import { describe, expect, it } from "vitest";

import { detalheDoErro } from "./detalhe-do-erro";

describe("detalheDoErro", () => {
  it("mantém Error como message", () => {
    expect(detalheDoErro(new Error("service_scope_mismatch"))).toBe("service_scope_mismatch");
  });

  it("mantém string como veio", () => {
    expect(detalheDoErro("tentativa não voltou")).toBe("tentativa não voltou");
  });

  it("objeto do PostgREST vira code | message | details | hint, nunca [object Object]", () => {
    const supabaseError = {
      message: 'record "x" not found',
      code: "P0002",
      details: "The result contains 0 rows",
      hint: null,
    };
    const detail = detalheDoErro(supabaseError);
    expect(detail).not.toContain("[object Object]");
    expect(detail).toBe('P0002 | record "x" not found | The result contains 0 rows');
  });

  it("objeto sem campos conhecidos vira JSON", () => {
    expect(detalheDoErro({ motivo: "stale", tentativas: 5 })).toBe(
      '{"motivo":"stale","tentativas":5}',
    );
  });

  it("objeto circular não derruba a serialização", () => {
    const circular: Record<string, unknown> = {};
    circular.eu = circular;
    expect(detalheDoErro(circular)).toBe("erro_objeto_nao_serializavel");
  });

  it("nulo e indefinido ganham sentinela em vez de string vazia", () => {
    expect(detalheDoErro(null)).toBe("erro_desconhecido");
    expect(detalheDoErro(undefined)).toBe("erro_desconhecido");
  });

  it("corta detail gigante em 500 caracteres", () => {
    expect(detalheDoErro({ message: "x".repeat(600) })).toHaveLength(500);
  });
});
