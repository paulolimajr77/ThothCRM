import { describe, expect, it } from "vitest";

import { idsSegurosParaLote, type PropostaCandidataAoLote } from "./lote-seguro";

function proposta(over: Partial<PropostaCandidataAoLote> = {}): PropostaCandidataAoLote {
  return { id: "id-1", risk: "seguro", status: "pendente", ...over };
}

describe("idsSegurosParaLote", () => {
  it("só seguras e pendentes, na ordem recebida", () => {
    const ids = idsSegurosParaLote([
      proposta({ id: "a", risk: "seguro", status: "pendente" }),
      proposta({ id: "b", risk: "atencao", status: "pendente" }),
      proposta({ id: "c", risk: "seguro", status: "pendente" }),
      proposta({ id: "d", risk: "seguro", status: "aprovada" }),
    ]);
    expect(ids).toEqual(["a", "c"]);
  });

  it("vencida fica fora", () => {
    const ids = idsSegurosParaLote([
      proposta({ id: "a", risk: "seguro", status: "pendente", vencida: true }),
      proposta({ id: "b", risk: "seguro", status: "pendente", vencida: false }),
    ]);
    expect(ids).toEqual(["b"]);
  });

  it("atencao fica fora", () => {
    const ids = idsSegurosParaLote([
      proposta({ id: "a", risk: "atencao", status: "pendente" }),
    ]);
    expect(ids).toEqual([]);
  });

  it("lista vazia", () => {
    expect(idsSegurosParaLote([])).toEqual([]);
  });

  it("vencida ausente não é considerada vencida", () => {
    const ids = idsSegurosParaLote([
      proposta({ id: "a", risk: "seguro", status: "pendente" }),
    ]);
    expect(ids).toEqual(["a"]);
  });
});
