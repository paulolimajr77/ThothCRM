import { describe, expect, it } from "vitest";

import { camposDoFunil, camposQueAIaPreenche } from "@/lib/leads/campos-do-funil";
import { customFieldSchema, type CustomFieldDef } from "@/lib/schemas/settings";

/** Campo mínimo válido; `extra` sobrescreve (issue #5317). */
function campo(extra: Record<string, unknown> = {}): CustomFieldDef {
  return customFieldSchema.parse({
    key: "condicao",
    label: "Condição de saúde",
    type: "text",
    ...extra,
  });
}

describe("camposQueAIaPreenche (issue #5317)", () => {
  it("campo sem ia_preenche não entra, mesmo com ia_pode_ler: true", () => {
    const campos = [campo({ ia_pode_ler: true })];
    expect(camposQueAIaPreenche(campos)).toEqual([]);
  });

  it("campo com ia_preenche: true e ia_pode_ler: true entra, na ordem do funil", () => {
    const primeiro = campo({ key: "condicao", ia_preenche: true, ia_pode_ler: true });
    const meio = campo({ key: "alergia", label: "Alergia", ia_preenche: true, ia_pode_ler: true });
    const segundo = campo({ key: "medicacao", label: "Medicação", ia_preenche: true, ia_pode_ler: true });
    const campos = [
      primeiro,
      campo({ key: "interno", label: "Interno", ia_pode_ler: true }),
      meio,
      segundo,
    ];
    expect(camposQueAIaPreenche(campos)).toEqual([primeiro, meio, segundo]);
  });

  it("ia_preenche: true sem ia_pode_ler: true NÃO entra", () => {
    const campos = [campo({ ia_preenche: true })];
    expect(camposQueAIaPreenche(campos)).toEqual([]);
  });

  it("campo com escopo: contato não entra", () => {
    const campos = [campo({ escopo: "contato", ia_preenche: true, ia_pode_ler: true })];
    expect(camposQueAIaPreenche(campos)).toEqual([]);
  });

  it("tipos currency e file não entram, mesmo marcados", () => {
    const campos = [
      campo({ key: "valor", label: "Valor", type: "currency", ia_preenche: true, ia_pode_ler: true }),
      campo({ key: "anexo", label: "Anexo", type: "file", ia_preenche: true, ia_pode_ler: true }),
    ];
    expect(camposQueAIaPreenche(campos)).toEqual([]);
  });
});

describe("schema não descarta as chaves novas (issue #5317)", () => {
  it("camposDoFunil({ fields: [...] }) preserva ia_preenche e ia_orientacao", () => {
    const out = camposDoFunil({
      fields: [
        {
          key: "condicao",
          label: "Condição de saúde",
          type: "text",
          ia_pode_ler: true,
          ia_preenche: true,
          ia_orientacao: "Preencha quando o cliente disser a condição.",
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.ia_preenche).toBe(true);
    expect(out[0]?.ia_orientacao).toBe("Preencha quando o cliente disser a condição.");
  });

  it("customFieldSchema recusa ia_orientacao com 501 caracteres e aceita com 500", () => {
    const base = { key: "condicao", label: "Condição de saúde", type: "text" };
    expect(customFieldSchema.safeParse({ ...base, ia_orientacao: "a".repeat(500) }).success).toBe(true);
    expect(customFieldSchema.safeParse({ ...base, ia_orientacao: "a".repeat(501) }).success).toBe(false);
  });
});
