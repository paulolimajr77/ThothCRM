// @vitest-environment node
import { describe, expect, it } from "vitest";

import { formatoDoCorpo } from "./ler-formato-da-porta";

describe("formatoDoCorpo", () => {
  it("o follow-up mostra TODOS os tipos de passo, inclusive mover o card de etapa", () => {
    // Caso real de 30/10: o assistente disse que não dava para mover o card porque nunca viu o formato.
    // Sabotagem: tirar a entrada de `ai/followup-flows/:id|PATCH` de ESQUEMAS → vermelho.
    const r = formatoDoCorpo("ai/followup-flows/:id", "PATCH");
    expect(r.ok).toBe(true);
    const texto = JSON.stringify(r.ok ? r.formato : null);
    expect(texto).toContain("move_lead");
    expect(texto).toContain("stage_id");
    expect(texto).not.toContain("$schema");
    expect(texto).not.toContain('"additionalProperties":false');
  });

  it("a agenda mostra os campos obrigatórios do tipo de agendamento", () => {
    const r = formatoDoCorpo("agenda/tipos", "POST");
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r.ok ? r.formato : null)).toContain("location_kind");
  });

  it("porta sem esquema registrado diz isso, em vez de inventar um formato", () => {
    expect(formatoDoCorpo("tags/vocabulario", "POST")).toEqual({ ok: false, motivo: "sem_formato_registrado" });
  });
});
