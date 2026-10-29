/**
 * Ligar o assistente de UMA empresa é ato da plataforma: recusa quem não é
 * admin pleno, grava só a linha do id recebido, preserva as outras chaves de
 * `settings` e deixa a trilha de auditoria.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  escrita: vi.fn(),
  audit: vi.fn(),
  linhas: new Map<string, { settings: unknown }>(),
  gravacoes: [] as { id: string; settings: unknown }[],
}));

vi.mock("@/lib/auth/escritaDeAdminOuRecusa", () => ({ escritaDeAdminOuRecusa: deps.escrita }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "teste" }) }));
vi.mock("@/lib/audit", () => ({ audit: deps.audit }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_coluna: string, id: string) => ({
          maybeSingle: async () => ({ data: deps.linhas.get(id) ?? null, error: null }),
        }),
      }),
      update: (valores: { settings: unknown }) => ({
        eq: async (_coluna: string, id: string) => {
          deps.gravacoes.push({ id, settings: valores.settings });
          return { error: null };
        },
      }),
    }),
  }),
}));

import { ligarAssistenteDoTenant } from "./assistenteDoTenant";

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";

beforeEach(() => {
  vi.clearAllMocks();
  deps.gravacoes.length = 0;
  deps.linhas.clear();
  deps.linhas.set(A, { settings: { proposals: { enabled: true }, plan: "pro" } });
  deps.linhas.set(B, { settings: {} });
  deps.escrita.mockResolvedValue({ ok: true, ctx: { user: { id: "dono" } } });
});

describe("ligarAssistenteDoTenant", () => {
  it("recusa quem não é admin da plataforma: nada lido, nada gravado, nada auditado", async () => {
    deps.escrita.mockResolvedValue({ ok: false, error: "forbidden" });
    const r = await ligarAssistenteDoTenant({ organization_id: A, ligado: true });
    expect(r.ok).toBe(false);
    expect(deps.gravacoes).toEqual([]);
    expect(deps.audit).not.toHaveBeenCalled();
  });

  it("⭐ 2 empresas: ligar a A grava só a A e a B continua sem a chave", async () => {
    const r = await ligarAssistenteDoTenant({ organization_id: A, ligado: true });
    expect(r).toEqual({ ok: true, ligado: true });
    expect(deps.gravacoes).toHaveLength(1);
    expect(deps.gravacoes[0]!.id).toBe(A);
    expect(deps.linhas.get(B)).toEqual({ settings: {} });
  });

  it("preserva as outras chaves de settings", async () => {
    await ligarAssistenteDoTenant({ organization_id: A, ligado: true });
    expect(deps.gravacoes[0]!.settings).toEqual({
      proposals: { enabled: true },
      plan: "pro",
      assistente: { enabled: true },
    });
  });

  it("desligar grava enabled false (nunca apaga a chave das outras)", async () => {
    await ligarAssistenteDoTenant({ organization_id: A, ligado: false });
    expect(deps.gravacoes[0]!.settings).toMatchObject({ plan: "pro", assistente: { enabled: false } });
  });

  it("audita platform.tenant_assistant_toggled com a organização alvo", async () => {
    await ligarAssistenteDoTenant({ organization_id: A, ligado: true });
    expect(deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform.tenant_assistant_toggled",
        organizationId: A,
        actorUserId: "dono",
        actingAsPlatformAdmin: true,
        metadata: { ligado: true },
      }),
    );
  });

  it("id que não é uuid, corpo com campo a mais e empresa que não existe: recusados sem gravar", async () => {
    expect(await ligarAssistenteDoTenant({ organization_id: "x", ligado: true })).toEqual({ ok: false, error: "invalid_input" });
    expect(
      await ligarAssistenteDoTenant({ organization_id: A, ligado: true, extra: 1 } as never),
    ).toEqual({ ok: false, error: "invalid_input" });
    expect(
      await ligarAssistenteDoTenant({ organization_id: "cccccccc-0000-4000-8000-00000000000c", ligado: true }),
    ).toEqual({ ok: false, error: "not_found" });
    expect(deps.gravacoes).toEqual([]);
  });
});
