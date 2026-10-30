import { describe, expect, it } from "vitest";

import { ESCRITA_PERMITIDA } from "@/lib/assistente/portas/listas";
import { riscoDaProposta } from "./operacoes";
import { idsParaAprovarTudo, idsSegurosParaLote, type PropostaCandidataAoLote } from "./lote-seguro";

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

describe("idsParaAprovarTudo", () => {
  it("entram seguras e de atenção, na ordem de criação; cartão de efeito fora e já decidida ficam de fora", () => {
    // Pedido do dono (30/10): um só "Aprovar tudo". Sabotagem: tirar o filtro de propostaAgeFora → vermelho.
    const ids = idsParaAprovarTudo([
      proposta({ id: "c", risk: "atencao", created_at: "2026-10-30T10:03:00Z" }),
      proposta({ id: "a", risk: "seguro", created_at: "2026-10-30T10:01:00Z" }),
      proposta({
        id: "x",
        risk: "atencao",
        created_at: "2026-10-30T10:02:00Z",
        payload: { porta: "attendants/sector/:user_id", metodo: "PUT" },
      }),
      proposta({ id: "d", risk: "atencao", status: "aprovada", created_at: "2026-10-30T10:04:00Z" }),
      proposta({ id: "v", risk: "atencao", vencida: true, created_at: "2026-10-30T10:05:00Z" }),
      proposta({
        id: "p",
        risk: "atencao",
        created_at: "2026-10-30T10:06:00Z",
        payload: { porta: "ai/agents/:id/publish", metodo: "POST" },
      }),
    ]);
    // publicar o que está no ar nunca vai no botão. Sabotagem: esvaziar FORA_DO_APROVAR_TUDO → vermelho.
    expect(ids).toEqual(["a", "c"]);
  });
});
