/**
 * Editar um guia do assistente é ato da plataforma: recusa quem não é admin pleno, só
 * aceita nome `assistente-*` (nunca uma skill de agente), cria versão nova no escopo
 * da plataforma (organization_id nulo), move o ponteiro e deixa a trilha de auditoria.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  escrita: vi.fn(),
  audit: vi.fn(),
  insertSkillVersion: vi.fn(),
  setSkillPointer: vi.fn(),
  ponteiro: { version_id: "v-antiga" } as { version_id: string } | null,
}));

vi.mock("@/lib/auth/escritaDeAdminOuRecusa", () => ({ escritaDeAdminOuRecusa: deps.escrita }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "teste" }) }));
vi.mock("@/lib/audit", () => ({ audit: deps.audit }));
vi.mock("@/lib/ai/skills/db", () => ({ getSkillsPool: () => ({}) }));
vi.mock("@/lib/agent-engine/agent/skills", () => ({
  PREFIXO_DOS_GUIAS_DO_ASSISTENTE: "assistente-",
  insertSkillVersion: deps.insertSkillVersion,
  setSkillPointer: deps.setSkillPointer,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabela: string) => ({
      select: () => ({
        is: () => ({ eq: () => ({ maybeSingle: async () => ({ data: deps.ponteiro, error: null }) }) }),
        eq: () => ({
          maybeSingle: async () => ({
            data: tabela === "skill_versions" ? { matcher: { any_keywords: ["x"] }, manifest: [] } : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

import { salvarGuiaDoAssistente } from "./guiasDoAssistente";

const ENTRADA = { name: "assistente-prompt", description: "Como afinar prompt.", body: "# Guia" };

beforeEach(() => {
  vi.clearAllMocks();
  deps.ponteiro = { version_id: "v-antiga" };
  deps.escrita.mockResolvedValue({ ok: true, ctx: { user: { id: "dono" } } });
  deps.insertSkillVersion.mockResolvedValue({ id: "v-nova" });
});

describe("salvarGuiaDoAssistente", () => {
  it("recusa quem não é admin da plataforma: nada gravado", async () => {
    deps.escrita.mockResolvedValue({ ok: false, error: "forbidden" });
    expect((await salvarGuiaDoAssistente(ENTRADA)).ok).toBe(false);
    expect(deps.insertSkillVersion).not.toHaveBeenCalled();
  });

  it("recusa nome que não é de guia do assistente (skill de agente fica fora)", async () => {
    const r = await salvarGuiaDoAssistente({ ...ENTRADA, name: "prospec-abordagem" });
    expect(r).toEqual({ ok: false, error: "invalid_input" });
    expect(deps.insertSkillVersion).not.toHaveBeenCalled();
  });

  it("cria a versão no escopo da plataforma, move o ponteiro e audita", async () => {
    const r = await salvarGuiaDoAssistente(ENTRADA);
    expect(r).toEqual({ ok: true, version_id: "v-nova" });
    expect(deps.insertSkillVersion.mock.calls[0]![1]).toMatchObject({ tenantId: null, name: "assistente-prompt" });
    expect(deps.setSkillPointer.mock.calls[0]![1]).toEqual({ tenantId: null, name: "assistente-prompt", versionId: "v-nova" });
    expect(deps.audit.mock.calls[0]![0]).toMatchObject({ action: "platform.assistant_guide_saved", organizationId: null });
  });

  it("guia que não existe devolve not_found e não grava", async () => {
    deps.ponteiro = null;
    expect(await salvarGuiaDoAssistente(ENTRADA)).toEqual({ ok: false, error: "not_found" });
    expect(deps.insertSkillVersion).not.toHaveBeenCalled();
  });
});
