import { describe, expect, it } from "vitest";

import { telaPorCaminho, type TelaEmVista } from "./tela-por-caminho";

describe("telaPorCaminho", () => {
  it("caminho com id casa com o maior prefixo do catálogo (funil com etapa)", () => {
    const tela = telaPorCaminho("/app/kanban/etapas/123") as TelaEmVista;
    expect(tela).toMatchObject({
      nome: "Funis",
      href: "/app/kanban",
    });
    expect(tela.descricao).toContain("funis de venda");
  });

  it("caminho exato da tela casa com ela mesma", () => {
    const tela = telaPorCaminho("/app/ai/agents") as TelaEmVista;
    expect(tela).toMatchObject({ nome: "Agentes", href: "/app/ai/agents" });
  });

  it("segmento inteiro: /app/ai/agentsx NÃO casa com /app/ai/agents", () => {
    expect(telaPorCaminho("/app/ai/agentsx")).toBeNull();
    expect(telaPorCaminho("/app/ai/agentsx/123")).toBeNull();
  });

  it("sem caminho devolve null", () => {
    expect(telaPorCaminho(undefined)).toBeNull();
    expect(telaPorCaminho(null)).toBeNull();
    expect(telaPorCaminho("")).toBeNull();
  });

  it("caminho fora do catálogo devolve null", () => {
    expect(telaPorCaminho("/app/qualquer-coisa")).toBeNull();
    expect(telaPorCaminho("/outra/pagina")).toBeNull();
  });

  it("o maior prefixo vence sobre o menor", () => {
    const curto = telaPorCaminho("/app/inbox") as TelaEmVista;
    expect(curto.href).toBe("/app/inbox");
    // `/app/kanban/etapas/123` casa com `/app/kanban` (2 segmentos), não com
    // `/app` (1 segmento).
    const longo = telaPorCaminho("/app/kanban/etapas/123") as TelaEmVista;
    expect(longo.href).toBe("/app/kanban");
    expect(longo.href).not.toBe("/app");
  });
});
