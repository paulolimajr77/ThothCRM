import { describe, expect, it } from "vitest";

import { proximosPassosDaAcao } from "./proximos-passos";

describe("proximosPassosDaAcao", () => {
  it("ai/agents POST com id: publicar agente e ligar ao roteador", () => {
    const passos = proximosPassosDaAcao(
      { porta: "ai/agents", metodo: "POST" },
      { id: "11111111-2222-4333-8444-555555555555" },
    );
    expect(passos).toEqual([
      { texto: "Publicar o agente quando o texto estiver pronto", href: "/app/ai/agents/11111111-2222-4333-8444-555555555555" },
      { texto: "Ligar o agente ao número do WhatsApp num roteador", href: "/app/ai/routers" },
    ]);
  });

  it("ai/agents POST sem id: href da lista de agentes", () => {
    const passos = proximosPassosDaAcao({ porta: "ai/agents", metodo: "POST" }, null);
    expect(passos).toEqual([
      { texto: "Publicar o agente quando o texto estiver pronto", href: "/app/ai/agents" },
      { texto: "Ligar o agente ao número do WhatsApp num roteador", href: "/app/ai/routers" },
    ]);
  });

  it("ai/followup-flows POST com id: revisar e publicar o follow-up", () => {
    const passos = proximosPassosDaAcao(
      { porta: "ai/followup-flows", metodo: "POST" },
      { id: "22222222-3333-4444-8444-555555555555" },
    );
    expect(passos).toEqual([
      { texto: "Revisar e publicar o follow-up", href: "/app/ai/followups/22222222-3333-4444-8444-555555555555" },
    ]);
  });

  it("ai/followup-flows/from-model POST com id: revisar e publicar o follow-up", () => {
    const passos = proximosPassosDaAcao(
      { porta: "ai/followup-flows/from-model", metodo: "POST" },
      { id: "33333333-4444-5555-8444-555555555555" },
    );
    expect(passos).toEqual([
      { texto: "Revisar e publicar o follow-up", href: "/app/ai/followups/33333333-4444-5555-8444-555555555555" },
    ]);
  });

  it("ai/followup-flows POST sem id: href da lista de follow-ups", () => {
    const passos = proximosPassosDaAcao({ porta: "ai/followup-flows", metodo: "POST" }, null);
    expect(passos).toEqual([
      { texto: "Revisar e publicar o follow-up", href: "/app/ai/followups" },
    ]);
  });

  it("pipelines POST: conferir as etapas do funil", () => {
    const passos = proximosPassosDaAcao({ porta: "pipelines", metodo: "POST" }, null);
    expect(passos).toEqual([
      { texto: "Conferir as etapas do funil", href: "/app/kanban" },
    ]);
  });

  it("ai/agents/:id/publish POST: lista vazia", () => {
    const passos = proximosPassosDaAcao(
      { porta: "ai/agents/11111111-2222-4333-8444-555555555555/publish", metodo: "POST" },
      null,
    );
    expect(passos).toEqual([]);
  });

  it("ai/followup-flows/:id/publish POST: lista vazia", () => {
    const passos = proximosPassosDaAcao(
      { porta: "ai/followup-flows/22222222-3333-4444-8444-555555555555/publish", metodo: "POST" },
      null,
    );
    expect(passos).toEqual([]);
  });

  it("qualquer outra porta: lista vazia", () => {
    const passos = proximosPassosDaAcao({ porta: "contatos", metodo: "POST" }, null);
    expect(passos).toEqual([]);
  });

  it("GET (não POST): lista vazia", () => {
    const passos = proximosPassosDaAcao({ porta: "ai/agents", metodo: "GET" }, null);
    expect(passos).toEqual([]);
  });

  it("id ausente com porta de criação: href sem id", () => {
    const passos = proximosPassosDaAcao(
      { porta: "ai/followup-flows/from-model", metodo: "POST" },
      { },
    );
    expect(passos).toEqual([
      { texto: "Revisar e publicar o follow-up", href: "/app/ai/followups" },
    ]);
  });
});
