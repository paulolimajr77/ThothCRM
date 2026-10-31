/**
 * O invólucro `protegida`: o `execute` de toda ferramenta nunca lança, e a
 * mensagem do erro nunca chega ao modelo.
 *
 * Testes de registro de resultado: o registro nunca muda o que o modelo
 * recebe e nunca vaza dado de cliente no log.
 */
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { protegida } from "./protegida";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const info = vi.mocked(logger.info);
const warn = vi.mocked(logger.warn);

beforeEach(() => {
  info.mockClear();
  warn.mockClear();
});

const esquema = z.strictObject({ n: z.number() });

describe("protegida", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- 3 testes antigos do HEAD (sem alteração) ---
  it("entrada que não cabe no esquema devolve parametro_invalido e NÃO chama o corpo", async () => {
    const corpo = vi.fn(async (entrada: { n: number }) => ({ ok: true as const, dobro: entrada.n * 2 }));
    const execute = protegida("teste", esquema, corpo);

    expect(await execute({ n: "três" })).toEqual({ ok: false, motivo: "parametro_invalido" });
    expect(await execute({ n: 3, extra: true })).toEqual({ ok: false, motivo: "parametro_invalido" });
    expect(await execute(null)).toEqual({ ok: false, motivo: "parametro_invalido" });
    expect(corpo).toHaveBeenCalledTimes(0);
  });

  it("entrada válida chega ao corpo já validada e o resultado volta como está", async () => {
    const execute = protegida("teste", esquema, async (entrada) => ({ ok: true as const, dobro: entrada.n * 2 }));

    expect(await execute({ n: 21 })).toEqual({ ok: true, dobro: 42 });
  });

  it("exceção no corpo vira indisponivel, sem a mensagem do erro, e fica registrada no log", async () => {
    const aviso = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const execute = protegida("teste", esquema, async () => {
      throw new Error("SEGREDO-DO-ERRO");
    });

    const saida = await execute({ n: 1 });

    expect(saida).toEqual({ ok: false, motivo: "indisponivel" });
    expect(JSON.stringify(saida)).not.toContain("SEGREDO-DO-ERRO");
    expect(aviso).toHaveBeenCalledWith("assistente.ferramentas.falhou", {
      ferramenta: "teste",
      detalhe: "SEGREDO-DO-ERRO",
    });
  });

  // --- 6 testes novos de registro de resultado ---
  it("sucesso: registra { ferramenta, ok: true, ms } e nao tem motivo", async () => {
    const execute = protegida(
      "procurar_porta",
      z.object({}),
      async () => ({ ok: true, dados: [] }),
    );

    const resultado = await execute({});

    expect(resultado).toEqual({ ok: true, dados: [] });
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();

    const ctx = (info.mock.calls[0]?.[1] ?? {}) as Record<string, unknown>;
    expect(ctx.ferramenta).toBe("procurar_porta");
    expect(ctx.ok).toBe(true);
    expect(typeof ctx.ms).toBe("number");
    expect(ctx.motivo).toBeUndefined();
    expect(ctx.porta).toBeUndefined();
    expect(ctx.status).toBeUndefined();
  });

  it("corpo devolve falha porta_respondeu_erro: registra ok:false, motivo, status e porta", async () => {
    const execute = protegida(
      "ler_porta",
      z.object({ porta: z.string(), valores: z.record(z.string(), z.string()) }),
      async () => ({
        ok: false,
        motivo: "porta_respondeu_erro",
        status: 404,
        codigo: "not_found",
        mensagem: "Tabela X",
      }),
    );

    const resultado = await execute({ porta: "contacts", valores: { id: "segredo-123" } });

    // O retorno ao modelo nao muda.
    expect(resultado).toEqual({
      ok: false,
      motivo: "porta_respondeu_erro",
      status: 404,
      codigo: "not_found",
      mensagem: "Tabela X",
    });

    expect(info).toHaveBeenCalledTimes(1);
    const ctx = (info.mock.calls[0]?.[1] ?? {}) as Record<string, unknown>;
    expect(ctx.ferramenta).toBe("ler_porta");
    expect(ctx.ok).toBe(false);
    expect(ctx.motivo).toBe("porta_respondeu_erro");
    expect(ctx.status).toBe(404);
    expect(ctx.porta).toBe("contacts");
  });

  it("mesmo caso de falha: o JSON da linha nao contem segredo, mensagem nem valores", async () => {
    const execute = protegida(
      "ler_porta",
      z.object({ porta: z.string(), valores: z.record(z.string(), z.string()) }),
      async () => ({
        ok: false,
        motivo: "porta_respondeu_erro",
        status: 404,
        codigo: "not_found",
        mensagem: "Tabela X",
      }),
    );

    await execute({ porta: "contacts", valores: { id: "segredo-123" } });

    const ctx = (info.mock.calls[0]?.[1] ?? {}) as Record<string, unknown>;
    const json = JSON.stringify(ctx);

    expect(json).not.toContain("segredo-123");
    expect(json).not.toContain("Tabela X");
    expect(json).not.toContain("valores");
    expect(ctx.porta).toBe("contacts");
  });

  it("entrada invalida: registra motivo parametro_invalido", async () => {
    const execute = protegida(
      "procurar_porta",
      z.object({ porta: z.string() }),
      async () => ({ ok: true }),
    );

    const resultado = await execute({ porta: 123 });

    expect(resultado).toEqual({ ok: false, motivo: "parametro_invalido" });
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();

    const ctx = (info.mock.calls[0]?.[1] ?? {}) as Record<string, unknown>;
    expect(ctx.ferramenta).toBe("procurar_porta");
    expect(ctx.ok).toBe(false);
    expect(ctx.motivo).toBe("parametro_invalido");
    expect(typeof ctx.ms).toBe("number");
    expect(ctx.porta).toBeUndefined();
    expect(ctx.status).toBeUndefined();
  });

  it("excecao: registra motivo indisponivel e mantem o warn de antes", async () => {
    const execute = protegida(
      "procurar_porta",
      z.object({}),
      async () => {
        throw new Error("banco caiu");
      },
    );

    const resultado = await execute({});

    expect(resultado).toEqual({ ok: false, motivo: "indisponivel" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe("assistente.ferramentas.falhou");
    expect(info).toHaveBeenCalledTimes(1);

    const ctx = (info.mock.calls[0]?.[1] ?? {}) as Record<string, unknown>;
    expect(ctx.ferramenta).toBe("procurar_porta");
    expect(ctx.ok).toBe(false);
    expect(ctx.motivo).toBe("indisponivel");
    expect(typeof ctx.ms).toBe("number");
    expect(ctx.porta).toBeUndefined();
    expect(ctx.status).toBeUndefined();
  });

  it("entrada string sem porta: z.string com 'abc', resultado igual e registro sem porta", async () => {
    const execute = protegida(
      "procurar_porta",
      z.string(),
      async () => ({ ok: true, dados: [] }),
    );

    const resultado = await execute("abc");

    expect(resultado).toEqual({ ok: true, dados: [] });
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();

    const ctx = (info.mock.calls[0]?.[1] ?? {}) as Record<string, unknown>;
    expect(ctx.ferramenta).toBe("procurar_porta");
    expect(ctx.ok).toBe(true);
    expect(typeof ctx.ms).toBe("number");
    expect(ctx.motivo).toBeUndefined();
    expect(ctx.porta).toBeUndefined();
    expect(ctx.status).toBeUndefined();
  });
});
