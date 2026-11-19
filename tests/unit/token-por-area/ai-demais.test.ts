/**
 * Token de integração nas rotas de `ai (demais)` (Spec 33, fatia R1, Task 6).
 *
 * As 17 rotas convertidas (17 métodos) têm, por método:
 *  - token de A alcança o recurso de A (2xx, nada de B lido ou escrito);
 *  - token de B não alcança o recurso de A (404, ou lista vazia de B);
 *  - token sem o escopo exigido → 403;
 *  - token abaixo do papel (tokenRole admin) → 403;
 *  - acima do teto do token → 429 com Retry-After, sem tocar no banco;
 *  - sessão continua com o mesmo portão (`requireRole` com o papel da tabela).
 *
 * O banco é `criarClienteAdminFalso`: guarda linhas das duas organizações e
 * acusa cadeia sem `organization_id` (ou RPC com outra organização).
 * O ramo de token usa o cliente admin; o cliente de sessão e o `requireRole`
 * lançam/recusam se o ramo de token os tocar.
 *
 * PAREI (não convertido): `ai/jev` GET/PATCH, `ai/mapas/testar` POST,
 * `ai/pacing` GET/PUT, `ai/voz/preview` POST — usam `getRequestPool()` (pg Pool
 * cru), item 8 da receita.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { isPublicPath } from "@/lib/auth/public-paths";
import type { Role } from "@/lib/auth/types";
import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { loadAuthUser } from "@/lib/auth/server";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { validateBearerToken } from "@/lib/mcp/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  arquivosForaDaOrganizacao,
  cadeiasDeEscrita,
  cadeiasForaDaOrganizacao,
  criarClienteAdminFalso,
  rpcsForaDaOrganizacao,
} from "@/tests/unit/helpers/cliente-admin-falso";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ loadAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/mcp/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/auth")>()),
  validateBearerToken: vi.fn(),
}));
vi.mock("@/lib/ai/dispatcher/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

// ---------------------------------------------------------------------------
// Fixtures — declaradas antes do uso
// ---------------------------------------------------------------------------

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TOKEN_A = "tok-a";
const TOKEN_B = "tok-b";
const ID_A = "66666666-6666-4666-8666-666666666666";
const ID_B = "77777777-7777-4777-8777-777777777777";
const TODOS_OS_ESCOPOS = ["config:read", "config:write"];
const MENSAGEM_DO_CLIENTE_DE_SESSAO = "cliente de sessão usado no ramo do token";

const AGENTE_A = { id: ID_A, organization_id: ORG_A, name: "Agente A", kind: "rag_bot" };
const AGENTE_B = { ...AGENTE_A, id: ID_B, organization_id: ORG_B, name: "Agente B" };

const ORCAMENTO_A = {
  id: "orcamento-a",
  organization_id: ORG_A,
  monthly_limit_cents: 1000,
  alarm_threshold_pct: 80,
  enforcement_mode: "off",
  enforcement_effective_at: null,
  current_period_start: "2026-01-01",
  last_alarm_sent_at: null,
  updated_at: "2026-01-01T00:00:00Z",
};
const ORCAMENTO_B = { ...ORCAMENTO_A, id: "orcamento-b", organization_id: ORG_B };

const GUARDRAIL_A = {
  id: "guardrail-a",
  organization_id: ORG_A,
  layer: "afirmacao_clinica",
  enabled: true,
  updated_at: "2026-01-01T00:00:00Z",
};
const GUARDRAIL_B = { ...GUARDRAIL_A, id: "guardrail-b", organization_id: ORG_B };

const MAPA_A = {
  id: "mapa-a",
  organization_id: ORG_A,
  provider: "google_maps",
  api_key_last4: "1234",
  updated_at: "2026-01-01T00:00:00Z",
};
const MAPA_B = { ...MAPA_A, id: "mapa-b", organization_id: ORG_B };

const EVENTO_A = {
  id: "evento-a",
  organization_id: ORG_A,
  event_type: "agent.operator_turn",
  payload: {},
  created_at: "2026-01-01T00:00:00Z",
};
const EVENTO_B = { ...EVENTO_A, id: "evento-b", organization_id: ORG_B };

const CHAMADA_A = {
  id: "chamada-a",
  organization_id: ORG_A,
  purpose: "sentiment_classify",
  status: "ok",
  cost_cents: 10,
  created_at: "2026-01-01T00:00:00Z",
};
const CHAMADA_B = { ...CHAMADA_A, id: "chamada-b", organization_id: ORG_B };

const VOZ_A = { id: "voz-a", organization_id: ORG_A, settings: { voz: { voice_id: "v1" } } };
const VOZ_B = { ...VOZ_A, id: "voz-b", organization_id: ORG_B };

const CREDENCIAL_ELEVENLABS_A = {
  id: "cred-a",
  organization_id: ORG_A,
  provider: "elevenlabs",
  label: "Eleven A",
  is_active: true,
  validated_at: "2026-01-01T00:00:00Z",
  models_available: ["v1"],
};
const CREDENCIAL_ELEVENLABS_B = {
  ...CREDENCIAL_ELEVENLABS_A,
  id: "cred-b",
  organization_id: ORG_B,
};

/** Tabelas SEM a coluna `organization_id` (conferidas no baseline). */
const SEM_ORGANIZACAO: readonly string[] = [] as const;

/** Linhas das DUAS organizações: o dublê precisa ver as duas para acusar vazamento. */
const LINHAS = {
  ai_agents: [AGENTE_A, AGENTE_B],
  ai_budgets: [ORCAMENTO_A, ORCAMENTO_B],
  org_guardrail_layers: [GUARDRAIL_A, GUARDRAIL_B],
  map_provider_credentials: [MAPA_A, MAPA_B],
  event_log: [EVENTO_A, EVENTO_B],
  llm_calls: [CHAMADA_A, CHAMADA_B],
  organizations: [
    { id: ORG_A, settings: {} },
    { id: ORG_B, settings: {} },
  ],
};

/** RPC de uso de IA: devolve agregado só para a org A. */
const RPCS = {
  fn_uso_de_ia: (args: Record<string, unknown>) => ({
    data:
      args.p_org === ORG_A
        ? { chamadas: 1, custo_cents: 10, input_tokens: 100, output_tokens: 20, p50_latency_ms: 100, p95_latency_ms: 200 }
        : { chamadas: 0, custo_cents: 0, input_tokens: 0, output_tokens: 0, p50_latency_ms: 0, p95_latency_ms: 0 },
  }),
};

function novoFalso() {
  return criarClienteAdminFalso({ orgDona: ORG_A, linhas: LINHAS, rpc: RPCS, tabelasSemOrganizacao: SEM_ORGANIZACAO });
}

let falso: ReturnType<typeof novoFalso>;

function tokenDe(org: string, token: string, role: Role, scopes: string[] = TODOS_OS_ESCOPOS): void {
  vi.mocked(validateBearerToken).mockResolvedValue({
    organizationId: org,
    role,
    actor: { type: "api_token", id: token, role },
    apiTokenId: token,
    scopes,
  } as never);
}

function reqJson(corpo: unknown, token?: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/ai/x", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(corpo),
  });
}

function reqVazio(token?: string, metodo = "POST"): NextRequest {
  return new NextRequest("http://localhost/api/v1/ai/x", {
    method: metodo,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function paramsDe(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** Os 4 casos de recusa que valem para todo método: escopo, papel, teto e sessão. */
function casosDeNegacao(cfg: {
  chamar: (token: string | undefined) => Promise<Response>;
  papel: Role;
  escopoExigido: string;
  resource: string;
}) {
  it("token sem o escopo exigido é recusado (403), sem escrita", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin", TODOS_OS_ESCOPOS.filter((e) => e !== cfg.escopoExigido));
    const res = await cfg.chamar(TOKEN_A);
    expect(res.status).toBe(403);
    expect(cadeiasDeEscrita(falso.cadeias)).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel (tokenRole admin) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await cfg.chamar(TOKEN_A);
    expect(res.status).toBe(403);
    expect(cadeiasDeEscrita(falso.cadeias)).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("acima do teto do token → 429 com Retry-After, sem tocar no banco", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await cfg.chamar(TOKEN_A);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("sessão continua com o mesmo portão (requireRole com o papel da tabela)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await cfg.chamar(undefined);
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith(cfg.papel, expect.objectContaining({ resource: cfg.resource }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  falso = novoFalso();
  // Cliente admin do token: o dublê. Sem a sessão, o mesmo dublê não existe.
  vi.mocked(createAdminClient).mockImplementation(() => falso.cliente as never);
  // Tripwires: se o ramo de token tocar a sessão, a chamada quebra.
  vi.mocked(createClient).mockImplementation(async () => {
    throw new Error(MENSAGEM_DO_CLIENTE_DE_SESSAO);
  });
  vi.mocked(loadAuthUser).mockImplementation(async () => {
    throw new Error(MENSAGEM_DO_CLIENTE_DE_SESSAO);
  });
  vi.mocked(requireRole).mockImplementation(async () => {
    throw new Error("requireRole chamado no ramo do token");
  });
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, count: 1, limit: 30 } as never);
});

// ===========================================================================
// GET /ai/automatico-ativo — existe atendimento automático? (receita A)
// ===========================================================================
import * as rotaAutomatico from "@/app/api/v1/ai/automatico-ativo/route";

describe("GET /ai/automatico-ativo — existe atendimento automático?", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaAutomatico.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { ativo: boolean } };
    expect(corpo.data.ativo).toBe(false);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só o acervo de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "agent");
    const res = await rotaAutomatico.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { ativo: boolean } };
    expect(corpo.data.ativo).toBe(false);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent", ["config:write"]);
    const res = await rotaAutomatico.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "viewer");
    const res = await rotaAutomatico.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaAutomatico.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('agent', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaAutomatico.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("agent", expect.objectContaining({ resource: "ai_agents" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/budget — orçamento da org (receita A)
// ===========================================================================
import * as rotaBudget from "@/app/api/v1/ai/budget/route";

describe("GET /ai/budget — orçamento da org", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaBudget.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { organization_id: string } };
    expect(corpo.data.organization_id).toBe(ORG_A);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só o orçamento de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaBudget.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { organization_id: string } };
    expect(corpo.data.organization_id).toBe(ORG_B);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaBudget.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaBudget.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaBudget.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaBudget.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_budget" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// PATCH /ai/budget — muda teto/modo do orçamento (receita A)
// ===========================================================================
describe("PATCH /ai/budget — muda teto/modo do orçamento", () => {
  it("token de A atualiza o orçamento de A, com auditoria do token", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaBudget.PATCH(reqJson({ enforcement_mode: "avisar", monthly_limit_cents: 5000 }, TOKEN_A));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, actorApiTokenId: TOKEN_A, organizationId: ORG_A }),
    );
  });

  it("token de B com orçamento de A → 404; nada de A lido nem escrito", async () => {
    tokenDe(ORG_B, TOKEN_B, "admin");
    const res = await rotaBudget.PATCH(reqJson({ enforcement_mode: "avisar" }, TOKEN_B), paramsDe(ID_A));
    expect(res.status).toBe(404);
    expect(cadeiasDeEscrita(falso.cadeias)).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token sem config:write é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin", ["config:read"]);
    const res = await rotaBudget.PATCH(reqJson({ enforcement_mode: "avisar" }, TOKEN_A));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel (manager) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaBudget.PATCH(reqJson({ enforcement_mode: "avisar" }, TOKEN_A));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaBudget.PATCH(reqJson({ enforcement_mode: "avisar" }, TOKEN_A));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('admin', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaBudget.PATCH(reqVazio(undefined, "PATCH"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("admin", expect.objectContaining({ resource: "ai_budget" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/evolution — painel de evolução da IA (receita A)
// ===========================================================================
import * as rotaEvolution from "@/app/api/v1/ai/evolution/route";

describe("GET /ai/evolution — painel de evolução da IA", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaEvolution.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: unknown };
    expect(corpo.data).toBeDefined();
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só a evolução de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaEvolution.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaEvolution.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaEvolution.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaEvolution.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaEvolution.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_evolution" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/guardrail-layers — camadas de guardrail (receita A)
// ===========================================================================
import * as rotaGuardrail from "@/app/api/v1/ai/guardrail-layers/route";

describe("GET /ai/guardrail-layers — camadas de guardrail", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaGuardrail.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só as camadas de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaGuardrail.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaGuardrail.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaGuardrail.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaGuardrail.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaGuardrail.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_guardrail_layers" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// PUT /ai/guardrail-layers — muda uma camada (receita A)
// ===========================================================================
describe("PUT /ai/guardrail-layers — muda uma camada", () => {
  it("token de A atualiza a camada de A, com auditoria do token", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaGuardrail.PUT(reqJson({ layer: "afirmacao_clinica", enabled: false }, TOKEN_A));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, actorApiTokenId: TOKEN_A, organizationId: ORG_A }),
    );
  });

  it("token de B com camada de A → upsert não encontra (500); nada de A escrito", async () => {
    tokenDe(ORG_B, TOKEN_B, "admin");
    const res = await rotaGuardrail.PUT(reqJson({ layer: "afirmacao_clinica", enabled: false }, TOKEN_B));
    expect(res.status).toBe(500);
    expect(cadeiasDeEscrita(falso.cadeias)).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token sem config:write é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin", ["config:read"]);
    const res = await rotaGuardrail.PUT(reqJson({ layer: "afirmacao_clinica", enabled: false }, TOKEN_A));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel (manager) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaGuardrail.PUT(reqJson({ layer: "afirmacao_clinica", enabled: false }, TOKEN_A));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaGuardrail.PUT(reqJson({ layer: "afirmacao_clinica", enabled: false }, TOKEN_A));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('admin', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaGuardrail.PUT(reqVazio(undefined, "PUT"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("admin", expect.objectContaining({ resource: "ai_guardrail_layers" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/mapas — estado da chave de mapas (receita A)
// ===========================================================================
import * as rotaMapas from "@/app/api/v1/ai/mapas/route";

describe("GET /ai/mapas — estado da chave de mapas", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaMapas.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { organization_id?: string; configurada: boolean } };
    expect(corpo.data.configurada).toBe(true);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só o estado de mapas de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaMapas.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaMapas.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaMapas.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaMapas.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaMapas.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_maps" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// PUT /ai/mapas — grava/troca a chave de mapas (receita A)
// ===========================================================================
describe("PUT /ai/mapas — grava/troca a chave de mapas", () => {
  it("token de A grava a chave de mapas de A, com auditoria do token", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaMapas.PUT(reqJson({ api_key: "AIzaSyAbcdefghijklmnopqrstuvwxyz012345678" }, TOKEN_A));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, actorApiTokenId: TOKEN_A, organizationId: ORG_A }),
    );
  });

  it("token de B não grava na chave de A (upsert casa zero); nada de A escrito", async () => {
    tokenDe(ORG_B, TOKEN_B, "admin");
    const res = await rotaMapas.PUT(reqJson({ api_key: "AIzaSyAbcdefghijklmnopqrstuvwxyz012345678" }, TOKEN_B));
    expect(res.status).toBe(500);
    expect(cadeiasDeEscrita(falso.cadeias)).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token sem config:write é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin", ["config:read"]);
    const res = await rotaMapas.PUT(reqJson({ api_key: "AIzaSyAbcdefghijklmnopqrstuvwxyz012345678" }, TOKEN_A));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel (manager) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaMapas.PUT(reqJson({ api_key: "AIzaSyAbcdefghijklmnopqrstuvwxyz012345678" }, TOKEN_A));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaMapas.PUT(reqJson({ api_key: "AIzaSyAbcdefghijklmnopqrstuvwxyz012345678" }, TOKEN_A));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('admin', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaMapas.PUT(reqVazio(undefined, "PUT"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("admin", expect.objectContaining({ resource: "ai_maps" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// DELETE /ai/mapas — remove a chave de mapas (receita A)
// ===========================================================================
describe("DELETE /ai/mapas — remove a chave de mapas", () => {
  it("token de A remove a chave de mapas de A, com auditoria do token", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaMapas.DELETE(reqVazio(TOKEN_A, "DELETE"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, actorApiTokenId: TOKEN_A, organizationId: ORG_A }),
    );
  });

  it("token de B não remove a chave de A (delete casa zero); nada de A escrito", async () => {
    tokenDe(ORG_B, TOKEN_B, "admin");
    const res = await rotaMapas.DELETE(reqVazio(TOKEN_B, "DELETE"));
    expect(res.status).toBe(200);
    expect(cadeiasDeEscrita(falso.cadeias)).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token sem config:write é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin", ["config:read"]);
    const res = await rotaMapas.DELETE(reqVazio(TOKEN_A, "DELETE"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel (manager) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaMapas.DELETE(reqVazio(TOKEN_A, "DELETE"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaMapas.DELETE(reqVazio(TOKEN_A, "DELETE"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('admin', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaMapas.DELETE(reqVazio(undefined, "DELETE"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("admin", expect.objectContaining({ resource: "ai_maps" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/operator-metrics — métricas do operador (receita A)
// ===========================================================================
import * as rotaOperatorMetrics from "@/app/api/v1/ai/operator-metrics/route";

describe("GET /ai/operator-metrics — métricas do operador", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaOperatorMetrics.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { turnos: number } };
    expect(corpo.data.turnos).toBeGreaterThanOrEqual(0);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só as métricas de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaOperatorMetrics.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaOperatorMetrics.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaOperatorMetrics.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaOperatorMetrics.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaOperatorMetrics.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_operator_metrics" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/runs — execuções de IA (receita A)
// ===========================================================================
import * as rotaRuns from "@/app/api/v1/ai/runs/route";

describe("GET /ai/runs — execuções de IA", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaRuns.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { execucoes: unknown[] } };
    expect(corpo.data.execucoes).toEqual([]);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só as execuções de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaRuns.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaRuns.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaRuns.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaRuns.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaRuns.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_runs" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/style-adjustments — ajustes de estilo (receita A)
// ===========================================================================
import * as rotaStyleAdjustments from "@/app/api/v1/ai/style-adjustments/route";

describe("GET /ai/style-adjustments — ajustes de estilo", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaStyleAdjustments.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só os ajustes de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaStyleAdjustments.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaStyleAdjustments.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaStyleAdjustments.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaStyleAdjustments.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaStyleAdjustments.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_style_adjustments" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// PUT /ai/style-adjustments — muda um ajuste de estilo (receita A)
// ===========================================================================
describe("PUT /ai/style-adjustments — muda um ajuste de estilo", () => {
  it("token de A atualiza o ajuste de estilo de A, com auditoria do token", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaStyleAdjustments.PUT(reqJson({ ajuste: "tamanho_fonte", enabled: true }, TOKEN_A));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, actorApiTokenId: TOKEN_A, organizationId: ORG_A }),
    );
  });

  it("token de B com ajuste de A → upsert não encontra (500); nada de A escrito", async () => {
    tokenDe(ORG_B, TOKEN_B, "admin");
    const res = await rotaStyleAdjustments.PUT(reqJson({ ajuste: "tamanho_fonte", enabled: true }, TOKEN_B));
    expect(res.status).toBe(500);
    expect(cadeiasDeEscrita(falso.cadeias)).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token sem config:write é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin", ["config:read"]);
    const res = await rotaStyleAdjustments.PUT(reqJson({ ajuste: "tamanho_fonte", enabled: true }, TOKEN_A));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel (manager) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaStyleAdjustments.PUT(reqJson({ ajuste: "tamanho_fonte", enabled: true }, TOKEN_A));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaStyleAdjustments.PUT(reqJson({ ajuste: "tamanho_fonte", enabled: true }, TOKEN_A));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('admin', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaStyleAdjustments.PUT(reqVazio(undefined, "PUT"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("admin", expect.objectContaining({ resource: "ai_style_adjustments" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/turn-traces — traços de turno (receita A)
// ===========================================================================
import * as rotaTurnTraces from "@/app/api/v1/ai/turn-traces/route";

describe("GET /ai/turn-traces — traços de turno", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaTurnTraces.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { tracos: unknown[] } };
    expect(corpo.data.tracos).toEqual([]);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só os traços de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaTurnTraces.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaTurnTraces.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaTurnTraces.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaTurnTraces.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaTurnTraces.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_turn_traces" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/usage — uso de IA (receita A)
// ===========================================================================
import * as rotaUsage from "@/app/api/v1/ai/usage/route";

describe("GET /ai/usage — uso de IA", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaUsage.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { totais: { invocations: number } } };
    expect(corpo.data.totais.invocations).toBe(1);
    expect(rpcsForaDaOrganizacao(falso.rpcs, ORG_A)).toEqual([]);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só o uso de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaUsage.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    expect(rpcsForaDaOrganizacao(falso.rpcs, ORG_B)).toEqual([]);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaUsage.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaUsage.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaUsage.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaUsage.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_usage" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// GET /ai/voz — voz da organização (receita A)
// ===========================================================================
import * as rotaVoz from "@/app/api/v1/ai/voz/route";

describe("GET /ai/voz — voz da organização", () => {
  it("token de A alcança o recurso de A e só ele", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaVoz.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { voiceId: string | null } };
    expect(corpo.data.voiceId).toBe("v1");
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(requireRole).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("token de B vê só a voz de B", async () => {
    tokenDe(ORG_B, TOKEN_B, "manager");
    const res = await rotaVoz.GET(reqVazio(TOKEN_B, "GET"));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:read (só config:write) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager", ["config:write"]);
    const res = await rotaVoz.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "agent");
    const res = await rotaVoz.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaVoz.GET(reqVazio(TOKEN_A, "GET"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('manager', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaVoz.GET(reqVazio(undefined, "GET"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "ai_providers" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});

// ===========================================================================
// PATCH /ai/voz — troca a voz da organização (receita A)
// ===========================================================================
describe("PATCH /ai/voz — troca a voz da organização", () => {
  it("token de A atualiza a voz de A, com auditoria do token", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaVoz.PATCH(reqJson({ voice_id: "v2" }, TOKEN_A));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_A)).toEqual([]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, actorApiTokenId: TOKEN_A, organizationId: ORG_A }),
    );
  });

  it("token de B não altera a voz de A; a de B é gravada em B", async () => {
    tokenDe(ORG_B, TOKEN_B, "admin");
    const res = await rotaVoz.PATCH(reqJson({ voice_id: "v2" }, TOKEN_B));
    expect(res.status).toBe(200);
    expect(cadeiasForaDaOrganizacao(falso.cadeias, ORG_B)).toEqual([]);
  });

  it("token sem config:write é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "admin", ["config:read"]);
    const res = await rotaVoz.PATCH(reqJson({ voice_id: "v2" }, TOKEN_A));
    expect(res.status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });

  it("token abaixo do papel (manager) é recusado (403)", async () => {
    tokenDe(ORG_A, TOKEN_A, "manager");
    const res = await rotaVoz.PATCH(reqJson({ voice_id: "v2" }, TOKEN_A));
    expect(res.status).toBe(403);
  });

  it("acima do teto do token → 429 com Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, count: 31, limit: 30 } as never);
    tokenDe(ORG_A, TOKEN_A, "admin");
    const res = await rotaVoz.PATCH(reqJson({ voice_id: "v2" }, TOKEN_A));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(falso.cadeias).toEqual([]);
  });

  it("sessão continua com o mesmo portão: requireRole('admin', ...)", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    const res = await rotaVoz.PATCH(reqVazio(undefined, "PATCH"));
    expect(res.status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("admin", expect.objectContaining({ resource: "ai_providers" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(falso.cadeias).toEqual([]);
  });
});
