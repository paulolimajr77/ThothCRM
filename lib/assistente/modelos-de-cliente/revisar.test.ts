/**
 * A revisão é o único caminho para o modelo ficar aplicável: recusa formato
 * errado, follow-up fora do catálogo, marca esquecida, termo da origem e dado
 * de contato — dizendo onde.
 */
import { describe, expect, it } from "vitest";

import type { EstruturaDoModelo } from "./estrutura";
import { revisarEstrutura } from "./revisar";

const LIMPA: EstruturaDoModelo = {
  funis: [
    {
      nome: "Consultas",
      etapas: [
        { nome: "Primeiro contato", ganho: false, perdido: false },
        { nome: "Compareceu", ganho: true, perdido: false },
      ],
    },
  ],
  agentes: [{ nome: "Recepção {{negocio}}", descricao: "", prompt: "Você atende a {{negocio}} com calma." }],
  followups: [{ modelo_id: "clinica-consulta-retomada" }],
};

const TERMOS = ["Clínica Aurora", "Aurora"];

describe("revisarEstrutura", () => {
  it("estrutura limpa → aprovada, igual ao que entrou", () => {
    expect(revisarEstrutura(LIMPA, TERMOS)).toEqual({ ok: true, estrutura: LIMPA });
  });

  it("marca [REVISAR] esquecida → recusa apontando o agente", () => {
    const r = revisarEstrutura(
      { ...LIMPA, agentes: [{ ...LIMPA.agentes[0]!, prompt: "Ligue [REVISAR: telefone]." }] },
      TERMOS,
    );
    expect(r).toEqual({
      ok: false,
      motivo: "texto_sensivel",
      achados: [{ onde: "texto do agente «Recepção {{negocio}}»", tipos: ["marca [REVISAR] ainda no texto"] }],
    });
  });

  it("termo da origem que sobrou (até sem acento e em outra caixa) → recusa", () => {
    const r = revisarEstrutura(
      { ...LIMPA, funis: [{ ...LIMPA.funis[0]!, nome: "Funil da AURORA" }] },
      TERMOS,
    );
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo === "texto_sensivel" && r.achados[0]!.tipos).toEqual(["nome da empresa de origem"]);
    expect(revisarEstrutura({ ...LIMPA, agentes: [{ ...LIMPA.agentes[0]!, prompt: "Clinica aurora atende" }] }, TERMOS).ok).toBe(false);
  });

  it("palavra que só CONTÉM o termo não é achado («Auroras» de outra coisa, «laurora»)", () => {
    expect(
      revisarEstrutura({ ...LIMPA, agentes: [{ ...LIMPA.agentes[0]!, prompt: "Atendemos laurora e clientes." }] }, TERMOS).ok,
    ).toBe(true);
  });

  it("telefone digitado na revisão → recusa", () => {
    const r = revisarEstrutura({ ...LIMPA, agentes: [{ ...LIMPA.agentes[0]!, prompt: "Ligue (62) 99876-5432" }] });
    expect(r.ok === false && r.motivo === "texto_sensivel" && r.achados[0]!.tipos).toEqual(["telefone"]);
  });

  it("follow-up fora do catálogo → formato_invalido", () => {
    const r = revisarEstrutura({ ...LIMPA, followups: [{ modelo_id: "nao-existe" }] });
    expect(r).toMatchObject({ ok: false, motivo: "formato_invalido" });
  });

  it("campo a mais (ex.: um contato enfiado na estrutura) → formato_invalido", () => {
    expect(revisarEstrutura({ ...LIMPA, contatos: [{ telefone: "1" }] })).toMatchObject({
      ok: false,
      motivo: "formato_invalido",
    });
  });
});
