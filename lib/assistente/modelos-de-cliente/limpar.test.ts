/**
 * A limpeza do texto de um cliente real: o que identifica a empresa de origem
 * vira marca visível, nunca some em silêncio, e a revisão recusa o que sobrou.
 */
import { describe, expect, it } from "vitest";

import { achadosSensiveis, limparTexto } from "./limpar";

const PROMPT = [
  "Você é a recepção da Clínica Aurora Ltda, a Clínica Aurora de Goiânia.",
  "Telefone (62) 99876-5432 ou +55 62 3241-1234.",
  "E-mail contato@clinicaaurora.com.br, site https://clinicaaurora.com.br/agenda e www.aurora.med.br.",
  "CNPJ 12.345.678/0001-90. Instagram @clinica.aurora.",
  "Consulta em até 3 dias, valor a combinar.",
].join("\n");

describe("limparTexto", () => {
  const r = limparTexto(PROMPT, ["Clínica Aurora", "Clínica Aurora Ltda"]);

  it("o nome da empresa vira {{negocio}} (o mais longo primeiro, sem sobrar «Ltda»)", () => {
    expect(r.texto).toContain("Você é a recepção da {{negocio}}, a {{negocio}} de Goiânia.");
    expect(r.texto).not.toMatch(/aurora/i);
  });

  it("telefone, e-mail, site, documento e perfil viram marca [REVISAR]", () => {
    expect(r.texto).not.toMatch(/9876|3241|contato@|https?:|www\.|12\.345|@clinica/);
    for (const tipo of ["telefone", "e-mail", "site", "documento", "perfil"]) {
      expect(r.texto).toContain(`[REVISAR: ${tipo}]`);
    }
  });

  it("o que não é dado de contato fica como estava", () => {
    expect(r.texto).toContain("Consulta em até 3 dias, valor a combinar.");
  });

  it("cada troca vira um aviso, sem repetir o valor trocado", () => {
    expect(r.avisos.length).toBeGreaterThanOrEqual(6);
    expect(r.avisos.join(" ")).not.toMatch(/9876|contato@|Aurora/);
  });

  it("nome curto demais não é trocado (comeria pedaço de palavra)", () => {
    expect(limparTexto("Bem-vindo ao Ok", ["Ok"]).texto).toBe("Bem-vindo ao Ok");
  });
});

describe("achadosSensiveis", () => {
  it("texto limpo e revisado → nada", () => {
    expect(achadosSensiveis("Você é a recepção da {{negocio}}. Marque pelo WhatsApp desta conversa.")).toEqual([]);
  });

  it("marca esquecida e telefone digitado na revisão → os dois aparecem", () => {
    const achados = achadosSensiveis("Ligue [REVISAR: telefone] ou (11) 91234-5678");
    expect(achados).toContain("marca [REVISAR] ainda no texto");
    expect(achados).toContain("telefone");
  });

  it("e-mail e site digitados à mão são achados", () => {
    expect(achadosSensiveis("escreva para a@b.com.br")).toContain("e-mail");
    expect(achadosSensiveis("veja exemplo.com.br")).toContain("site");
  });
});
