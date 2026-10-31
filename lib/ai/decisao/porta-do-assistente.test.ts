/**
 * A CONSULTA DO ASSISTENTE, ESCOLHIDA PELO JEV (só observa) — o emissor.
 *
 * O banco é um dublê (`organizations` responde o estado, `llm_calls` recebe a
 * linha) e a rede é um `fetch` de mentira: nenhum teste toca o fornecedor.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const registros = vi.hoisted(() => ({
  info: [] as Array<[string, Record<string, unknown>]>,
  warn: [] as Array<[string, Record<string, unknown>]>,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: (msg: string, ctx: Record<string, unknown>) => registros.info.push([msg, ctx]),
    warn: (msg: string, ctx: Record<string, unknown>) => registros.warn.push([msg, ctx]),
    error: () => undefined,
    debug: () => undefined,
  },
}));

import { observarEscolhaDePorta, perguntaDaPorta } from "@/lib/ai/decisao/porta-do-assistente";

const ADMIN = "22222222-2222-4222-8222-222222222222";
const LIGADO = { jev: { ligado: true, aceite: { em: "2026-09-23T12:00:00.000Z", por: ADMIN } } };
const CANDIDATAS = [
  { id: "contacts", resumo: "Lista os contatos" },
  { id: "team", resumo: "" },
  { id: "pipelines", resumo: "Funis de venda" },
];
const PERGUNTA = "quem faz aniversário este mês? fale com Maria Souza 11 98765-4321";

/** O disjuntor é por (organização, tarefa) e vive no processo: cada caso usa a sua. */
let seq = 0;
const novaOrg = () => `org-porta-${++seq}`;

function bancoCom(settings: unknown, opts: { falhaNaLeitura?: boolean } = {}) {
  const linhas: Array<Record<string, unknown>> = [];
  const admin = {
    from: (tabela: string) => {
      if (tabela === "organizations") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () =>
            opts.falhaNaLeitura
              ? { data: null, error: { message: "banco fora" } }
              : { data: { settings }, error: null },
        };
        return chain;
      }
      return {
        insert: async (linha: Record<string, unknown>) => {
          linhas.push(linha);
          return { error: null };
        },
      };
    },
  };
  return { admin: admin as never, linhas };
}

function respostaCom(escolha: string): Response {
  return new Response(
    JSON.stringify({
      model: "jev-1.13.0",
      answers: { porta: { type: "choice", choice: escolha, probabilities: { [escolha]: 0.9 }, confidence: 0.8 } },
      usage: { input_tokens: 120, output_tokens: 2 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const deps = (admin: never, fetchImpl: ReturnType<typeof vi.fn>, chave: string | null = "tsk_duble") => ({
  admin,
  buscarChave: async () => chave,
  baseUrl: "https://jev.duble.test",
  fetchImpl: fetchImpl as unknown as typeof fetch,
});

const entrada = (organizationId: string, over: Partial<Parameters<typeof observarEscolhaDePorta>[0]> = {}) => ({
  organizationId,
  pergunta: PERGUNTA,
  candidatas: CANDIDATAS,
  primeiraDaBusca: "contacts",
  ...over,
});

beforeEach(() => {
  registros.info.length = 0;
  registros.warn.length = 0;
});

describe("perguntaDaPorta", () => {
  it("as opções são os ids das candidatas mais 'nenhuma'; resumo vazio vira sem critério", () => {
    const p = perguntaDaPorta(CANDIDATAS);
    expect(p).toMatchObject({ tipo: "choice" });
    expect(p && p.tipo === "choice" ? Object.keys(p.criterios) : []).toEqual(["contacts", "team", "pipelines", "nenhuma"]);
    expect(p && p.tipo === "choice" ? p.criterios.team : "x").toBeNull();
  });

  it("não há escolha com menos de 2 candidatas, com mais de 12, repetidas ou chamadas 'nenhuma'", () => {
    expect(perguntaDaPorta([CANDIDATAS[0]!])).toBeNull();
    expect(perguntaDaPorta(Array.from({ length: 13 }, (_, i) => ({ id: `p${i}`, resumo: "" })))).toBeNull();
    expect(perguntaDaPorta([CANDIDATAS[0]!, CANDIDATAS[0]!])).toBeNull();
    expect(perguntaDaPorta([CANDIDATAS[0]!, { id: "nenhuma", resumo: "" }])).toBeNull();
    expect(perguntaDaPorta(Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, resumo: "" })))).not.toBeNull();
  });
});

describe("observarEscolhaDePorta", () => {
  it("Jev desligado: nenhuma requisição, nenhuma linha, nenhum log de comparação", async () => {
    const { admin, linhas } = bancoCom({ jev: { ligado: false } });
    const fetchImpl = vi.fn();
    await observarEscolhaDePorta(entrada(novaOrg()), deps(admin, fetchImpl));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(linhas).toEqual([]);
    expect(registros.info).toEqual([]);
  });

  it("ligado mas sem aceite do administrador: nada sai", async () => {
    const { admin, linhas } = bancoCom({ jev: { ligado: true } });
    const fetchImpl = vi.fn();
    await observarEscolhaDePorta(entrada(novaOrg()), deps(admin, fetchImpl));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(linhas).toEqual([]);
  });

  it("tarefa pausada pela empresa: nada sai", async () => {
    const { admin, linhas } = bancoCom({
      jev: { ...LIGADO.jev, tarefas: { porta_do_assistente: { estado: "desligada" } } },
    });
    const fetchImpl = vi.fn();
    await observarEscolhaDePorta(entrada(novaOrg()), deps(admin, fetchImpl));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(linhas).toEqual([]);
  });

  it("sem credencial: nada sai e nada se grava", async () => {
    const { admin, linhas } = bancoCom(LIGADO);
    const fetchImpl = vi.fn();
    await observarEscolhaDePorta(entrada(novaOrg()), deps(admin, fetchImpl, null));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(linhas).toEqual([]);
    expect(registros.warn).toEqual([]);
  });

  it("menos de 2 candidatas: nem lê o estado", async () => {
    const { admin } = bancoCom(LIGADO);
    const fetchImpl = vi.fn();
    const from = vi.spyOn(admin as { from: (t: string) => unknown }, "from");
    await observarEscolhaDePorta(entrada(novaOrg(), { candidatas: [CANDIDATAS[0]!] }), deps(admin, fetchImpl));
    expect(from).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("a escolha coincide com a 1ª da busca: registra, grava o custo e NÃO leva a pergunta ao log", async () => {
    const { admin, linhas } = bancoCom(LIGADO);
    const fetchImpl = vi.fn(async () => respostaCom("contacts"));
    await observarEscolhaDePorta(entrada(novaOrg()), deps(admin, fetchImpl));

    expect(registros.info).toEqual([
      ["assistente.jev_porta", { jev_escolheu: "contacts", primeira_da_busca: "contacts", coincidem: true, ms: expect.any(Number) }],
    ]);
    expect(JSON.stringify(registros)).not.toContain("Maria");
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      purpose: "porta_do_assistente",
      status: "ok",
      provider: "typesafe",
      origem_da_escolha: "jev_observacao",
      contact_id: null,
      agent_id: null,
      input_tokens: 120,
    });
    // O telefone da pergunta passa pelo scrub antes de sair.
    const corpo = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as { state: string };
    expect(corpo.state).not.toContain("98765-4321");
  });

  it("a escolha difere da 1ª da busca: coincidem false", async () => {
    const { admin } = bancoCom(LIGADO);
    await observarEscolhaDePorta(entrada(novaOrg()), deps(admin, vi.fn(async () => respostaCom("pipelines"))));
    expect(registros.info[0]![1]).toMatchObject({ jev_escolheu: "pipelines", primeira_da_busca: "contacts", coincidem: false });
  });

  it("'nenhuma' vira jev_escolheu null e não coincide", async () => {
    const { admin } = bancoCom(LIGADO);
    await observarEscolhaDePorta(entrada(novaOrg()), deps(admin, vi.fn(async () => respostaCom("nenhuma"))));
    expect(registros.info[0]![1]).toMatchObject({ jev_escolheu: null, coincidem: false });
  });

  it("escolha fora das opções: não compara, grava a falha e não lança", async () => {
    const { admin, linhas } = bancoCom(LIGADO);
    await expect(
      observarEscolhaDePorta(entrada(novaOrg()), deps(admin, vi.fn(async () => respostaCom("inventada")))),
    ).resolves.toBeUndefined();
    expect(registros.info).toEqual([]);
    expect(linhas[0]).toMatchObject({ purpose: "porta_do_assistente", status: "erro", error_code: "jev_resposta_ilegivel" });
  });

  it("o Jev fora do ar (503): não lança, grava a falha em llm_calls e não registra comparação", async () => {
    const { admin, linhas } = bancoCom(LIGADO);
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 503 }));
    await expect(observarEscolhaDePorta(entrada(novaOrg()), deps(admin, fetchImpl))).resolves.toBeUndefined();
    expect(registros.info).toEqual([]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ purpose: "porta_do_assistente", status: "erro", origem_da_escolha: "jev_observacao" });
  });

  it("a rede que lança, a leitura do estado que falha e a gravação que lança: nunca lança", async () => {
    const { admin } = bancoCom(LIGADO);
    const rede = vi.fn(async () => {
      throw new Error("rede caiu");
    });
    await expect(observarEscolhaDePorta(entrada(novaOrg()), deps(admin, rede))).resolves.toBeUndefined();

    const sem = bancoCom(LIGADO, { falhaNaLeitura: true });
    await expect(
      observarEscolhaDePorta(entrada(novaOrg()), deps(sem.admin, vi.fn(async () => respostaCom("contacts")))),
    ).resolves.toBeUndefined();
    expect(registros.info).toEqual([]);

    const quebrado = {
      from: () => {
        throw new Error("sem cliente");
      },
    } as never;
    await expect(
      observarEscolhaDePorta(entrada(novaOrg()), deps(quebrado, vi.fn(async () => respostaCom("contacts")))),
    ).resolves.toBeUndefined();
  });
});
