import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/automation/campo-do-gatilho-de-data", () => ({
  regrasDeDataQuePerdemOCampo: vi.fn(async () => ({ nomes: [] })),
  mensagemDasRegrasQuePerdemOCampo: vi.fn(() => "regra perde o campo"),
}));

const ORG = "11111111-1111-4000-8000-000000000001";
const OUTRA = "22222222-2222-4000-8000-000000000002";
const PIPE = "33333333-3333-4000-8000-000000000003";

type Linha = { id: string; organization_id: string; name: string; vocabulary: object; settings: object; is_archived: boolean };

function bancoCom(linhas: Linha[]) {
  const escritas: { patch: unknown; filtros: [string, unknown][] }[] = [];
  const client = {
    from: () => ({
      select: () => {
        const filtros: [string, unknown][] = [];
        const q = {
          eq: (c: string, v: unknown) => {
            filtros.push([c, v]);
            return q;
          },
          maybeSingle: async () => ({
            data: linhas.find((l) => filtros.every(([c, v]) => (l as Record<string, unknown>)[c] === v)) ?? null,
            error: null,
          }),
        };
        return q;
      },
      update: (patch: unknown) => {
        const filtros: [string, unknown][] = [];
        const q = {
          eq: (c: string, v: unknown) => {
            filtros.push([c, v]);
            if (filtros.length === 2) escritas.push({ patch, filtros });
            return filtros.length === 2 ? Promise.resolve({ error: null }) : q;
          },
        };
        return q;
      },
    }),
  };
  vi.mocked(createClient).mockResolvedValue(client as never);
  return escritas;
}

function autorizado() {
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: "u1", idioma: "pt-BR" },
    org: { orgId: ORG },
  } as never);
}

function req(body: unknown) {
  return new NextRequest(`http://localhost/api/v1/pipelines/${PIPE}/config`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
const ctx = { params: Promise.resolve({ id: PIPE }) };

const FUNIL: Linha = {
  id: PIPE,
  organization_id: ORG,
  name: "Oficina",
  vocabulary: { lead: "Cliente" },
  settings: { lost_reasons: ["Preço"], fields: [] },
  is_archived: false,
};

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/v1/pipelines/[id]/config", () => {
  it("sem permissão → repassa a recusa e não escreve", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: fail("forbidden_role", "x", 403, {}) });
    const escritas = bancoCom([FUNIL]);
    const { PATCH } = await import("./route");
    expect((await PATCH(req({ won_reasons: ["Indicação"] }), ctx)).status).toBe(403);
    expect(escritas).toEqual([]);
  });

  it("grava campos personalizados e motivos sem perder o resto do settings; filtra a organização", async () => {
    autorizado();
    const escritas = bancoCom([FUNIL]);
    const { PATCH } = await import("./route");
    const res = await PATCH(
      req({
        fields: [{ key: "placa", label: "Placa", type: "text" }],
        won_reasons: ["Indicação"],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(escritas).toHaveLength(1);
    expect(escritas[0]!.filtros).toContainEqual(["organization_id", ORG]);
    const { settings, vocabulary } = escritas[0]!.patch as { settings: Record<string, unknown>; vocabulary: object };
    expect(settings.lost_reasons).toEqual(["Preço"]);
    expect(settings.won_reasons).toEqual(["Indicação"]);
    expect(settings.fields).toEqual([expect.objectContaining({ key: "placa", label: "Placa" })]);
    expect(vocabulary).toEqual({ lead: "Cliente" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline.config_updated", organizationId: ORG }));
  });

  it("funil de outra empresa → 404, nada escrito", async () => {
    autorizado();
    const escritas = bancoCom([{ ...FUNIL, organization_id: OUTRA }]);
    const { PATCH } = await import("./route");
    expect((await PATCH(req({ won_reasons: ["x"] }), ctx)).status).toBe(404);
    expect(escritas).toEqual([]);
  });

  it("corpo vazio ou com chave desconhecida → 422", async () => {
    autorizado();
    bancoCom([FUNIL]);
    const { PATCH } = await import("./route");
    expect((await PATCH(req({}), ctx)).status).toBe(422);
  });

  it("funil arquivado → 409", async () => {
    autorizado();
    bancoCom([{ ...FUNIL, is_archived: true }]);
    const { PATCH } = await import("./route");
    expect((await PATCH(req({ won_reasons: ["x"] }), ctx)).status).toBe(409);
  });
});
