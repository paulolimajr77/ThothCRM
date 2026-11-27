/**
 * A LINHA DO TEMPO DIZ QUEM ESCREVEU — inclusive quando quem escreveu foi a IA
 * preenchendo o cartão (#5317, ordem 4 item 9).
 *
 * `emitLeadActivity` só promove o ator a `ai` quando há lastro (`evidence`), e a
 * regra vive em `buildLeadActivityRow`. O que este arquivo prende é o CHAMADOR:
 * `updateLeadHandler` precisa passar `evidence.run_ids` quando a escrita veio de
 * `opcoes.preenchidoPelaIa`, e não passar nada numa edição humana comum. Sem
 * isso, o preenchimento pela IA apareceria como "sistema" — autoria perdida em
 * silêncio, que é o modo de falha que a migration 0071 tentou fechar.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(async () => undefined),
  isServiceRoleConfigured: vi.fn(() => false),
}));
vi.mock("@/lib/leads/activity-emitter", () => ({
  emitLeadActivity: vi.fn(async () => ({ ok: true })),
  stageChangeReason: () => "movido",
}));
vi.mock("@/lib/leads/activity-write-failure", () => ({
  registraFalhaDeAtividade: vi.fn(async () => undefined),
}));
vi.mock("@/lib/atendimento/origem", () => ({
  observeServiceOrigin: vi.fn(async () => null),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

import { updateLeadHandler } from "@/app/api/v1/leads/_handler";
import { emitLeadActivity } from "@/lib/leads/activity-emitter";
import type * as Emitter from "@/lib/leads/activity-emitter";
import type { HandlerCtx } from "@/lib/api/handlers/types";

const ORG = "22222222-2222-4222-8222-222222222222";
const LEAD = "33333333-3333-4333-8333-333333333333";

/** Banco falso mínimo: lê e atualiza `crm_leads`; a atividade é mockada acima. */
function bancoFalso() {
  const lead = () => ({
    id: LEAD,
    organization_id: ORG,
    contact_id: null,
    title: "Antes",
    tags: [],
    custom_fields: {},
    updated_at: "2026-09-15T12:00:00.000Z",
  });

  const from = (tabela: string) => {
    if (tabela !== "crm_leads") throw new Error(`tabela inesperada: ${tabela}`);
    return {
      select: () => {
        const leitura: Record<string, unknown> = {};
        leitura.eq = () => leitura;
        leitura.maybeSingle = async () => ({ data: lead(), error: null });
        return leitura;
      },
      update: () => {
        const escrita: Record<string, unknown> = {};
        escrita.eq = () => escrita;
        escrita.select = () => escrita;
        escrita.maybeSingle = async () => ({ data: lead(), error: null });
        return escrita;
      },
    };
  };

  return {
    from,
    rpc: () => ({ then: (fn: (r: { error: null }) => void) => Promise.resolve(fn({ error: null })) }),
  };
}

const ctxIA: HandlerCtx = {
  organization_id: ORG,
  actor: { type: "ai_agent", id: "agent-engine", role: "ai_operator", agent_id: "agent-1" },
  requestId: "req-ia",
  idioma: "pt-BR",
};

const ctxHumano: HandlerCtx = {
  organization_id: ORG,
  actor: { type: "user", id: "11111111-1111-4111-8111-111111111111" },
  requestId: "req-humano",
  idioma: "pt-BR",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("autoria da IA na atividade lead_edited (#5317)", () => {
  it("com preenchidoPelaIa: a atividade leva evidence.run_ids e buildLeadActivityRow a promove a 'ai'", async () => {
    const { buildLeadActivityRow } =
      await vi.importActual<typeof Emitter>("@/lib/leads/activity-emitter");

    await updateLeadHandler(bancoFalso() as never, ctxIA, LEAD, { title: "Depois" }, {
      preenchidoPelaIa: { condicao: "hash" },
    });

    expect(emitLeadActivity).toHaveBeenCalledTimes(1);
    const [, input] = vi.mocked(emitLeadActivity).mock.calls[0]!;
    expect(input.evidence).toEqual({ run_ids: ["req-ia"] });
    expect(buildLeadActivityRow(input).actor_kind).toBe("ai");
  });

  it("sem preenchidoPelaIa: edição humana comum não ganha evidence", async () => {
    await updateLeadHandler(bancoFalso() as never, ctxHumano, LEAD, { title: "Depois" });

    expect(emitLeadActivity).toHaveBeenCalledTimes(1);
    const [, input] = vi.mocked(emitLeadActivity).mock.calls[0]!;
    expect(input.evidence).toBeUndefined();
  });
});
