// @vitest-environment node
import { describe, expect, it } from "vitest";

import { lerEventosDoTurno, registrarEventoDoTurno } from "./progresso-do-turno";

const ORG = "11111111-1111-4111-8111-111111111111";
const OUTRA = "22222222-2222-4222-8222-222222222222";
const PESSOA = "33333333-3333-4333-8333-333333333333";
const TURNO = "44444444-4444-4444-8444-444444444444";

describe("progresso do turno", () => {
  it("devolve só o que a tela ainda não viu", () => {
    registrarEventoDoTurno(ORG, PESSOA, TURNO, { tipo: "teste_comecou", mensagem: "oi" });
    const primeira = lerEventosDoTurno(ORG, PESSOA, TURNO, 0);
    expect(primeira.eventos).toHaveLength(1);

    registrarEventoDoTurno(ORG, PESSOA, TURNO, { tipo: "tela", href: "/app/x", rotulo: "X" });
    const segunda = lerEventosDoTurno(ORG, PESSOA, TURNO, primeira.proximo);
    expect(segunda.eventos).toEqual([{ tipo: "tela", href: "/app/x", rotulo: "X" }]);
  });

  it("outra organização ou outra pessoa não lê o andamento", () => {
    registrarEventoDoTurno(ORG, PESSOA, TURNO, { tipo: "teste_comecou", mensagem: "segredo" });
    expect(lerEventosDoTurno(OUTRA, PESSOA, TURNO, 0).eventos).toEqual([]);
    expect(lerEventosDoTurno(ORG, "55555555-5555-4555-8555-555555555555", TURNO, 0).eventos).toEqual([]);
  });

  it("turno velho some sozinho", () => {
    const antigo = "66666666-6666-4666-8666-666666666666";
    registrarEventoDoTurno(ORG, PESSOA, antigo, { tipo: "teste_comecou", mensagem: "a" }, 1000);
    // O registro seguinte, 11 minutos depois, varre o vencido.
    registrarEventoDoTurno(ORG, PESSOA, TURNO, { tipo: "teste_comecou", mensagem: "b" }, 1000 + 11 * 60 * 1000);
    expect(lerEventosDoTurno(ORG, PESSOA, antigo, 0).eventos).toEqual([]);
  });
});
