// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ToolSet } from "ai";

import { criarProcurarPorta } from "./procurar-porta";
import { montarParaTeste, chamar } from "./auxiliar-de-teste";
import { CATALOGO_DE_PORTAS } from "@/lib/assistente/portas/catalogo.gerado";

vi.mock("@/lib/assistente/portas/regras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/assistente/portas/regras")>();
  return {
    ...actual,
    portaDeLeituraPermitida: vi.fn((id: string) =>
      !id.startsWith("cron/") &&
      !id.startsWith("admin/") &&
      !id.startsWith("auth/") &&
      !id.startsWith("webhooks/") &&
      !id.startsWith("webhook-sources/") &&
      !id.startsWith("lgpd/") &&
      !id.startsWith("ai/credentials/") &&
      !id.startsWith("mcp/") &&
      !id.startsWith("system/") &&
      !id.startsWith("tenants/") &&
      !id.startsWith("onboarding/") &&
      !id.startsWith("extensions/") &&
      !id.startsWith("health/") &&
      !id.startsWith("settings/api-tokens/") &&
      id !== "team/invites" &&
      id !== "messages/:id/media" &&
      id !== "contacts/export" &&
      id !== "contacts/:id/avatar" &&
      id !== "conversations/:id/notes/:noteId/media" &&
      !id.endsWith("/connect") &&
      !id.endsWith("/callback"),
    ),
    escritaPermitida: vi.fn((id: string, metodo: string) => {
      if (id === "ai/agents" && metodo === "POST") return true;
      if (id === "ai/agents/:id" && metodo === "PATCH") return true;
      return false;
    }),
  };
});

import {
  portaDeLeituraPermitida,
  escritaPermitida,
} from "@/lib/assistente/portas/regras";

const mockLeitura = portaDeLeituraPermitida as ReturnType<typeof vi.fn>;
const mockEscrita = escritaPermitida as ReturnType<typeof vi.fn>;

interface PortaEncontrada {
  id: string;
  caminho: string;
  metodos: string[];
  parametros: string[];
  resumo: string;
}

describe("procurar_porta", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockLeitura.mockImplementation((id: string) =>
      !id.startsWith("cron/") &&
      !id.startsWith("admin/") &&
      !id.startsWith("auth/") &&
      !id.startsWith("webhooks/") &&
      !id.startsWith("webhook-sources/") &&
      !id.startsWith("lgpd/") &&
      !id.startsWith("ai/credentials/") &&
      !id.startsWith("mcp/") &&
      !id.startsWith("system/") &&
      !id.startsWith("tenants/") &&
      !id.startsWith("onboarding/") &&
      !id.startsWith("extensions/") &&
      !id.startsWith("health/") &&
      !id.startsWith("settings/api-tokens/") &&
      id !== "team/invites" &&
      id !== "messages/:id/media" &&
      id !== "contacts/export" &&
      id !== "contacts/:id/avatar" &&
      id !== "conversations/:id/notes/:noteId/media" &&
      !id.endsWith("/connect") &&
      !id.endsWith("/callback"),
    );
    mockEscrita.mockImplementation((id: string, metodo: string) => {
      if (id === "ai/agents" && metodo === "POST") return true;
      if (id === "ai/agents/:id" && metodo === "PATCH") return true;
      return false;
    });
  });

  it("busca por palavra no id", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "procurar_porta", { pergunta: "agents" });
    const portas = (saida as { portas: PortaEncontrada[] }).portas;
    const ids = portas.map((p) => p.id);
    expect(ids.some((id) => id.startsWith("ai/agents"))).toBe(true);
    expect(ids).not.toContain("cron/routing-worker");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(12);
  });

  it("busca por palavra na área", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "procurar_porta", { pergunta: "pipelines" });
    const portas = (saida as { portas: PortaEncontrada[] }).portas;
    const ids = portas.map((p) => p.id);
    expect(ids.some((id) => id.startsWith("pipelines"))).toBe(true);
  });

  it("nunca devolve porta proibida", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "procurar_porta", { pergunta: "cron" });
    const portas = (saida as { portas: PortaEncontrada[] }).portas;
    const ids = portas.map((p) => p.id);
    expect(ids.some((id) => id.startsWith("cron/"))).toBe(false);
  });

  it("informa métodos de leitura quando permitido", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "procurar_porta", { pergunta: "ai/agents" });
    const portas = (saida as { portas: PortaEncontrada[] }).portas;
    const agentes = portas.find((p) => p.id === "ai/agents");
    expect(agentes).toBeDefined();
    expect(agentes?.metodos).toContain("GET");
    expect(agentes?.metodos).toContain("POST");
  });

  it("pergunta muito curta é recusada", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "procurar_porta", { pergunta: "ab" });
    expect(saida).toEqual({ ok: false, motivo: "parametro_invalido" });
  });

  it("pergunta muito longa é recusada", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "procurar_porta", { pergunta: "x".repeat(201) });
    expect(saida).toEqual({ ok: false, motivo: "parametro_invalido" });
  });

  // Medido no espelho em 29/10/2026: "Quem é a equipe e o cargo de cada um?" não
  // achava `team` (id em inglês, resumo vazio em 213 de 373 portas) e a descrição
  // da ferramenta dizia que equipe era proibida — o modelo desistiu sem ler.
  const idsDa = async (pergunta: string): Promise<string[]> => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "procurar_porta", { pergunta });
    return (saida as { portas: PortaEncontrada[] }).portas.map((p) => p.id);
  };

  it.each([
    ["equipe e cargo de cada um", "team"],
    ["aniversário dos clientes", "contacts"],
    ["últimas compras do cliente", "contacts/:id/compras"],
    ["negócios do funil", "leads"],
    ["etapas do funil", "pipelines"],
    ["imóveis do banco externo", "external-db/connections"],
    ["compromissos da agenda", "agenda/agendamentos"],
  ])("a pergunta em português %s acha a porta %s", async (pergunta, porta) => {
    expect(await idsDa(pergunta)).toContain(porta);
  });

  it("a porta que casa mais palavras vem antes do corte de 12", async () => {
    // `contacts` tem 20 portas: sem ordem, o corte de 12 podia deixar a de compras de fora.
    const ids = await idsDa("compras do contato");
    expect(ids.indexOf("contacts/:id/compras")).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf("contacts/:id/compras")).toBeLessThan(3);
  });

  it("sem nenhuma porta, devolve as áreas para tentar de novo", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = (await chamar(ferramentas, "procurar_porta", { pergunta: "zzzzqqq" })) as {
      portas: PortaEncontrada[];
      areas?: string[];
    };
    expect(saida.portas).toEqual([]);
    expect(saida.areas).toContain("team");
    expect(saida.areas).toContain("contacts");
  });

  it("a porta de contatos chega com a dica do filtro de aniversário e da busca por nome", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = (await chamar(ferramentas, "procurar_porta", { pergunta: "aniversariantes da semana" })) as {
      portas: (PortaEncontrada & { filtros?: { filtros: string[] } })[];
    };
    const contatos = saida.portas.find((p) => p.id === "contacts");
    expect(contatos?.filtros?.filtros).toEqual(expect.arrayContaining(["aniversario", "search"]));
  });

  it("a descrição não diz ao modelo que ler a equipe é proibido", () => {
    const { ferramentas } = montarParaTeste("admin");
    const descricao = String((ferramentas.procurar_porta as { description?: string }).description);
    expect(descricao).not.toMatch(/proibidas \([^)]*equipe/);
    expect(descricao).toMatch(/equipe/i);
  });
});

interface PortaEncontrada {
  id: string;
  caminho: string;
  metodos: string[];
  parametros: string[];
  resumo: string;
}
