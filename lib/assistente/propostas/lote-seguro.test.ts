import { describe, expect, it } from "vitest";

import { ESCRITA_PERMITIDA } from "@/lib/assistente/portas/listas";
import { riscoDaProposta } from "./operacoes";
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

describe("o lote nunca recebe porta com efeito fora do sistema", () => {
  it("toda porta `externo` nasce com o risco que o servidor grava, e esse risco fica fora do lote", () => {
    const externas = ESCRITA_PERMITIDA.filter((e) => e.externo === true);
    expect(externas.length).toBeGreaterThan(0);
    for (const e of externas) {
      const risk = riscoDaProposta("acao", { porta: e.porta, metodo: e.metodo });
      expect(idsSegurosParaLote([proposta({ id: `${e.metodo} ${e.porta}`, risk })]), `${e.metodo} ${e.porta}`).toEqual([]);
    }
  });
});
