/**
 * O assistente só responde para a empresa que a plataforma ligou: a guarda do
 * servidor recusa com 404 e falha fechada (erro de leitura = desligado).
 */
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ capacidades: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/organizacao/capacidades", () => ({ capacidadesDaOrganizacao: deps.capacidades }));

import { assistenteLigado, recusarSeAssistenteDesligado } from "./ligado";

beforeEach(() => vi.clearAllMocks());

describe("assistenteLigado", () => {
  it("ligado só quando a capacidade da organização consultada inclui o assistente", async () => {
    deps.capacidades.mockImplementation(async (_db: unknown, org: string) => (org === "A" ? ["assistente"] : ["propostas"]));
    expect(await assistenteLigado("A")).toBe(true);
    expect(await assistenteLigado("B")).toBe(false);
    expect(deps.capacidades).toHaveBeenCalledWith(expect.anything(), "B");
  });

  it("falha fechada: a leitura lançou → desligado", async () => {
    deps.capacidades.mockRejectedValue(new Error("banco fora"));
    expect(await assistenteLigado("A")).toBe(false);
  });
});

describe("recusarSeAssistenteDesligado", () => {
  it("desligado → 404 not_found em português; ligado → null (segue)", async () => {
    deps.capacidades.mockResolvedValue([]);
    const resposta = await recusarSeAssistenteDesligado("A", "req-1", "pt-BR");
    expect(resposta?.status).toBe(404);
    expect(await resposta!.json()).toMatchObject({
      error: { code: "not_found", message: "O assistente não está ligado para esta empresa." },
    });
    deps.capacidades.mockResolvedValue(["assistente"]);
    expect(await recusarSeAssistenteDesligado("A", "req-2", "pt-BR")).toBeNull();
  });
});
