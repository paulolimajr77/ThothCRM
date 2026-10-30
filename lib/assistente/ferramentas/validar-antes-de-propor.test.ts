// @vitest-environment node
import { describe, expect, it } from "vitest";

import { problemasDoCorpo } from "./validar-antes-de-propor";

const GRAFO_COM_PASSO_VAZIO = {
  draft_graph: {
    nodes: [
      { id: "inicio", type: "trigger", label: "Início", config: {}, position: { x: 0, y: 0 } },
      {
        id: "resposta-1",
        type: "match_reply",
        label: "Aguardar resposta",
        config: { branches: [{ id: "topou", op: "contains", label: "Respondeu", pattern: "" }], grace_timeout_ms: 900000 },
        position: { x: 160, y: 0 },
      },
    ],
    edges: [{ id: "e1", source: "inicio", target: "resposta-1", priority: 0, condition: { type: "always" } }],
  },
};

describe("problemasDoCorpo", () => {
  it("recusa o follow-up com passo de comparação vazio e diz o campo", () => {
    // Caso real de 30/10: o cartão nasceu quebrado e falhou com 422. Sabotagem: esvaziar ESQUEMAS → vermelho.
    const p = problemasDoCorpo("ai/followup-flows/:id", "PATCH", GRAFO_COM_PASSO_VAZIO);
    expect(p).not.toBeNull();
    expect(p).toContain("pattern");
  });

  it("porta sem esquema conhecido não é barrada aqui (a rota continua sendo a autoridade)", () => {
    expect(problemasDoCorpo("tags/vocabulario", "POST", { qualquer: 1 })).toBeNull();
  });
});
