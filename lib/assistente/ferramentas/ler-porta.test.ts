// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ToolSet } from "ai";

import { criarLerPorta } from "./ler-porta";
import { montarParaTeste, chamar } from "./auxiliar-de-teste";

vi.mock("@/lib/assistente/portas/abrir", () => ({
  abrirPorta: vi.fn(),
}));

vi.mock("@/lib/assistente/metricas/chamar-rota", () => ({
  chamarRotaPorDentro: vi.fn(),
}));

import { abrirPorta } from "@/lib/assistente/portas/abrir";
import { chamarRotaPorDentro } from "@/lib/assistente/metricas/chamar-rota";

const mockAbrirPorta = abrirPorta as ReturnType<typeof vi.fn>;
const mockChamarRota = chamarRotaPorDentro as ReturnType<typeof vi.fn>;

describe("ler_porta", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAbrirPorta.mockReturnValue(null);
    mockChamarRota.mockResolvedValue({ status: 200, corpo: { data: { id: "abc" } } });
  });

  it("recusa porta proibida com porta_proibida", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "ler_porta", { porta: "cron/routing-worker" });
    expect(saida).toEqual({ ok: false, motivo: "porta_proibida" });
  });

  it("recusa porta inexistente com porta_proibida", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "ler_porta", { porta: "inexistente" });
    expect(saida).toEqual({ ok: false, motivo: "porta_proibida" });
  });

  it("entrada com porta vazia é recusada", async () => {
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "ler_porta", { porta: "" });
    expect(saida).toEqual({ ok: false, motivo: "parametro_invalido" });
  });

  it("lê uma porta GET permitida quando abrirPorta retorna handler", async () => {
    mockAbrirPorta.mockReturnValue({
      handler: async () => new Response(JSON.stringify({ data: { id: "abc" } }), { status: 200 }),
      caminho: "/api/v1/ai/agents",
    });
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "ler_porta", { porta: "ai/agents" });
    expect(saida).toEqual({ dados: { id: "abc" }, cortado: false });
  });

  // Medido no espelho em 29/10/2026: a porta de dados do banco externo respondeu erro
  // de pedido e o modelo leu "porta_proibida" — concluiu que a leitura foi BLOQUEADA
  // e desistiu, em vez de corrigir schema/tabela/filtro.
  it("erro da porta chega ao modelo com o código e a mensagem, não como proibida", async () => {
    mockAbrirPorta.mockReturnValue({ handler: async () => new Response(), caminho: "/api/v1/x" });
    mockChamarRota.mockResolvedValue({
      status: 404,
      corpo: { error: { code: "not_found", message: "Tabela ou view não encontrada." } },
    });
    const { ferramentas } = montarParaTeste("admin");
    const saida = await chamar(ferramentas, "ler_porta", { porta: "external-db/connections" });
    expect(saida).toEqual({
      ok: false,
      motivo: "porta_respondeu_erro",
      status: 404,
      codigo: "not_found",
      mensagem: "Tabela ou view não encontrada.",
    });
  });

  it("a mensagem do erro vem cortada em 300 letras", async () => {
    mockAbrirPorta.mockReturnValue({ handler: async () => new Response(), caminho: "/api/v1/x" });
    mockChamarRota.mockResolvedValue({ status: 422, corpo: { error: { code: "validation_failed", message: "x".repeat(900) } } });
    const { ferramentas } = montarParaTeste("admin");
    const saida = (await chamar(ferramentas, "ler_porta", { porta: "contacts" })) as { mensagem: string };
    expect(saida.mensagem.length).toBe(300);
  });

  // Medido no espelho em 29/10/2026: os negócios de um funil vinham com todas as
  // colunas, a lista passava dos 24 KB e o modelo não chegava aos ganhos.
  it("campos encolhe cada linha da lista para as colunas pedidas", async () => {
    mockAbrirPorta.mockReturnValue({ handler: async () => new Response(), caminho: "/api/v1/pipelines/p1/leads" });
    const linhas = Array.from({ length: 60 }, (_, i) => ({
      id: `l${i}`,
      title: `Negócio ${i}`,
      status: i % 2 === 0 ? "won" : "open",
      value_cents: 1000 * i,
      description: "y".repeat(800),
      custom_fields: { longo: "z".repeat(400) },
    }));
    mockChamarRota.mockResolvedValue({ status: 200, corpo: { data: linhas } });
    const { ferramentas } = montarParaTeste("agent");

    const inteira = (await chamar(ferramentas, "ler_porta", { porta: "pipelines/:id/leads", valores: { id: "p1" } })) as {
      cortado: boolean;
    };
    expect(inteira.cortado).toBe(true);

    const enxuta = (await chamar(ferramentas, "ler_porta", {
      porta: "pipelines/:id/leads",
      valores: { id: "p1" },
      campos: ["title", "status", "value_cents", "inexistente"],
    })) as { dados: Record<string, unknown>[]; cortado: boolean };
    expect(enxuta.cortado).toBe(false);
    expect(enxuta.dados).toHaveLength(60);
    expect(enxuta.dados[2]).toEqual({ title: "Negócio 2", status: "won", value_cents: 2000 });
  });

  it("campos com nome fora do padrão é recusado", async () => {
    const { ferramentas } = montarParaTeste("agent");
    const saida = await chamar(ferramentas, "ler_porta", { porta: "contacts", campos: ["nome; drop"] });
    expect(saida).toEqual({ ok: false, motivo: "parametro_invalido" });
  });
});
