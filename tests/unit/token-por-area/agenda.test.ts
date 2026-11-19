// @vitest-environment node
/**
 * AGENDA ACEITA TOKEN (Spec 33, fatia R2, tarefa 4).
 *
 * `resolveAuthDual` entrega, no ramo do token, a service role: a RLS deixa de
 * proteger e o `.eq("organization_id", authz.organizationId)` de CADA cadeia é
 * a única barreira entre a organização do token e as demais. O cliente falso
 * (`../helpers/cliente-admin-falso`) vê: uma cadeia de tabela com
 * `organization_id` que não filtra a organização não alcança linha nenhuma, e
 * `cadeiasForaDaOrganizacao` aponta qual foi.
 *
 * Seis testes por método (a receita da R2): o token de A alcança o recurso de
 * A; o token de B não alcança; sem o escopo; abaixo do papel; acima do teto; e
 * a sessão segue com o mesmo portão. Depois, as garantias que só o ramo do
 * token precisa, o método que FICA DE FORA, e a borda do proxy.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";
import { audit } from "@/lib/audit";
import { isPublicPath } from "@/lib/auth/public-paths";
import { requireRole, orgAtivaDaApi } from "@/lib/auth/require-role";
import { loadAuthUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  arquivosForaDaOrganizacao,
  cadeiasDeEscrita,
  cadeiasForaDaOrganizacao,
  criarClienteAdminFalso,
  rpcsForaDaOrganizacao,
} from "../helpers/cliente-admin-falso";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    throw new Error("cliente de sessão usado no ramo do token");
  }),
}));
vi.mock("@/lib/auth/server", () => ({
  loadAuthUser: vi.fn(async () => {
    throw new Error("cliente de sessão usado no ramo do token");
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/ai/dispatcher/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(), isServiceRoleConfigured: vi.fn(() => true) }));
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(),
  orgAtivaDaApi: vi.fn(),
}));
vi.mock("@/lib/mcp/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mcp/auth")>("@/lib/mcp/auth");
  return { ...actual, validateBearerToken: vi.fn() };
});

const { validateBearerToken } = await import("@/lib/mcp/auth");

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TOKEN_A = "tok-a";
const TOKEN_B = "tok-b";
const PESSOA_DA_SESSAO = "c0000000-0000-4000-8000-000000000001";

const SEM_ORGANIZACAO = [] as const;

type Linha = Record<string, unknown>;
type Linhas = Record<string, Linha[]>;

/**
 * Linhas da organização A que cada rota precisa para responder 2xx, mais uma
 * linha da B na mesma tabela para o caso "token de A" provar que a de B não
 * aparece. Colunas conferidas no supabase/baseline.sql.
 */
const EVENTOS: Linha[] = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    organization_id: ORG_A,
    title: "Evento da A",
    starts_at: "2026-11-01T10:00:00.000Z",
    ends_at: "2026-11-01T11:00:00.000Z",
    status: "scheduled",
    owner_user_id: PESSOA_DA_SESSAO,
    contact_id: null,
    revision: 1,
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
  },
  {
    id: "b1111111-1111-4111-8111-111111111111",
    organization_id: ORG_B,
    title: "Evento secreto da B",
    starts_at: "2026-11-01T10:00:00.000Z",
    ends_at: "2026-11-01T11:00:00.000Z",
    status: "scheduled",
    owner_user_id: PESSOA_DA_SESSAO,
    contact_id: null,
    revision: 1,
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
  },
];

const LINHAS_BASE: Linhas = {
  calendar_appointments: EVENTOS,
  calendar_event_types: [],
  calendar_locations: [],
  organizations: [
    { id: ORG_A, settings: { agenda: {} } },
    { id: ORG_B, settings: { agenda: {} } },
  ],
  user_organizations: [],
  contacts: [],
  messages: [],
  conversations: [],
  job_queue: [],
  calendar_connections: [],
  appointment_recovery_receipts: [],
  followup_enrollments: [],
};

const SO_DA_A = [EVENTOS[0].id, ORG_A];
const SO_DA_B = [EVENTOS[1].id, ORG_B];

type Metodo = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Papel = "viewer" | "agent" | "manager" | "admin";

type Caso = {
  rota: string;
  metodo: Metodo;
  caminho: string;
  params?: Record<string, string>;
  corpo?: unknown;
  linhas: Linhas;
  papel: Papel;
  escopo: "mcp:read" | "mcp:write";
  papelDoToken?: Papel;
  recurso: string;
  rpc?: Record<string, unknown>;
  rotulo?: string;
  status: number;
  colecao?: { daA: string; daB: string };
  audita?: boolean;
  cria?: boolean;
};

/** Qual `route.ts` importar, por rota. */
const CARREGA: Record<string, () => Promise<Record<string, unknown>>> = {
  "agenda/configuracao": () => import("@/app/api/v1/agenda/configuracao/route"),
  "agenda/enderecos": () => import("@/app/api/v1/agenda/enderecos/route"),
  "agenda/google/calendarios": () => import("@/app/api/v1/agenda/google/calendarios/route"),
  "agenda/google/calendarios/atualizar": () =>
    import("@/app/api/v1/agenda/google/calendarios/atualizar/route"),
  "agenda/agendamentos/[id]": () => import("@/app/api/v1/agenda/agendamentos/[id]/route"),
  "agenda/agendamentos/[id]/google/resolver": () =>
    import("@/app/api/v1/agenda/agendamentos/[id]/google/resolver/route"),
  "agenda/agendamentos/[id]/google/retry": () =>
    import("@/app/api/v1/agenda/agendamentos/[id]/google/retry/route"),
  "agenda/horarios-livres": () => import("@/app/api/v1/agenda/horarios-livres/route"),
  "agenda/pessoas": () => import("@/app/api/v1/agenda/pessoas/route"),
  "agenda/tipos/reativar": () => import("@/app/api/v1/agenda/tipos/reativar/route"),
  "agenda/vinculos": () => import("@/app/api/v1/agenda/vinculos/route"),
};

// ─── Casos por rota ──────────────────────────────────────────────────────────

const VINCULOS_GET: Caso = {
  rota: "agenda/vinculos",
  metodo: "GET",
  caminho: "/api/v1/agenda/vinculos",
  linhas: { ...LINHAS_BASE, contacts: [] },
  papel: "agent",
  escopo: "mcp:read",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: false,
};

const HORARIOS_LIVRES_GET: Caso = {
  rota: "agenda/horarios-livres",
  metodo: "GET",
  caminho: "/api/v1/agenda/horarios-livres",
  linhas: LINHAS_BASE,
  papel: "viewer",
  escopo: "mcp:read",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: false,
};

const PESSOAS_GET: Caso = {
  rota: "agenda/pessoas",
  metodo: "GET",
  caminho: "/api/v1/agenda/pessoas",
  linhas: { ...LINHAS_BASE, user_organizations: [] },
  papel: "agent",
  escopo: "mcp:read",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: false,
};

const TIPOS_REATIVAR_POST: Caso = {
  rota: "agenda/tipos/reativar",
  metodo: "POST",
  caminho: "/api/v1/agenda/tipos/reativar",
  corpo: { id: "a2222222-2222-4222-8222-222222222222" },
  linhas: { ...LINHAS_BASE, calendar_event_types: EVENTOS },
  papel: "manager",
  escopo: "mcp:write",
  papelDoToken: undefined,
  recurso: "calendar_event_types",
  status: 200,
  audita: true,
};

const ENDERECOS_GET: Caso = {
  rota: "agenda/enderecos",
  metodo: "GET",
  caminho: "/api/v1/agenda/enderecos",
  linhas: { ...LINHAS_BASE, calendar_locations: [], calendar_event_types: [], calendar_appointments: [] },
  papel: "agent",
  escopo: "mcp:read",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: false,
};

const ENDERECOS_POST: Caso = {
  rota: "agenda/enderecos",
  metodo: "POST",
  caminho: "/api/v1/agenda/enderecos",
  corpo: { address: "Rua das Flores, 123" },
  linhas: LINHAS_BASE,
  papel: "agent",
  escopo: "mcp:write",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 201,
  audita: true,
};

const CALENDARIOS_GET: Caso = {
  rota: "agenda/google/calendarios",
  metodo: "GET",
  caminho: "/api/v1/agenda/google/calendarios",
  linhas: { ...LINHAS_BASE, calendar_connections: [] },
  papel: "agent",
  escopo: "mcp:read",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: false,
};

const CALENDARIOS_PATCH: Caso = {
  rota: "agenda/google/calendarios",
  metodo: "PATCH",
  caminho: "/api/v1/agenda/google/calendarios",
  corpo: { connection_id: "a3333333-3333-4333-8333-333333333333" },
  linhas: { ...LINHAS_BASE, calendar_connections: EVENTOS },
  papel: "agent",
  escopo: "mcp:write",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: true,
};

const CALENDARIOS_ATUALIZAR_POST: Caso = {
  rota: "agenda/google/calendarios/atualizar",
  metodo: "POST",
  caminho: "/api/v1/agenda/google/calendarios/atualizar",
  corpo: { connection_id: "a3333333-3333-4333-8333-333333333333" },
  linhas: { ...LINHAS_BASE, calendar_connections: EVENTOS },
  papel: "agent",
  escopo: "mcp:write",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: true,
};

const AGENDAMENTO_GET: Caso = {
  rota: "agenda/agendamentos/[id]",
  metodo: "GET",
  caminho: `/api/v1/agenda/agendamentos/${EVENTOS[0].id}`,
  params: { id: EVENTOS[0].id },
  linhas: { ...LINHAS_BASE, messages: [], conversations: [], job_queue: [], appointment_recovery_receipts: [], followup_enrollments: [] },
  papel: "viewer",
  escopo: "mcp:read",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: false,
};

const RESOLVER_POST: Caso = {
  rota: "agenda/agendamentos/[id]/google/resolver",
  metodo: "POST",
  caminho: `/api/v1/agenda/agendamentos/${EVENTOS[0].id}/google/resolver`,
  params: { id: EVENTOS[0].id },
  corpo: {
    expected_domain_revision: "1",
    expected_google_local_revision: "1",
    etag: null,
    choice: "google",
  },
  linhas: LINHAS_BASE,
  papel: "agent",
  escopo: "mcp:write",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: true,
};

const RETRY_POST: Caso = {
  rota: "agenda/agendamentos/[id]/google/retry",
  metodo: "POST",
  caminho: `/api/v1/agenda/agendamentos/${EVENTOS[0].id}/google/retry`,
  params: { id: EVENTOS[0].id },
  corpo: { choice: "retry" },
  linhas: LINHAS_BASE,
  papel: "agent",
  escopo: "mcp:write",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: false,
};

const CONFIGURACAO_GET: Caso = {
  rota: "agenda/configuracao",
  metodo: "GET",
  caminho: "/api/v1/agenda/configuracao",
  linhas: LINHAS_BASE,
  papel: "viewer",
  escopo: "mcp:read",
  papelDoToken: undefined,
  recurso: "agenda",
  status: 200,
  audita: false,
};

const CASOS: readonly Caso[] = [
  VINCULOS_GET,
  HORARIOS_LIVRES_GET,
  PESSOAS_GET,
  TIPOS_REATIVAR_POST,
  ENDERECOS_GET,
  ENDERECOS_POST,
  CALENDARIOS_GET,
  CALENDARIOS_PATCH,
  CALENDARIOS_ATUALIZAR_POST,
  AGENDAMENTO_GET,
  RESOLVER_POST,
  RETRY_POST,
  CONFIGURACAO_GET,
];

// ─── Ferramentas do teste ───────────────────────────────────────────────────

const AUTORIZACAO = { authorization: "Bearer dsk_abc_def" };

type Manipulador = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

function nome(c: Caso): string {
  return `${c.metodo} ${c.caminho}${c.rotulo ? ` [${c.rotulo}]` : ""}`;
}

function requisicao(c: Caso, cabecalhos: Record<string, string> = {}): NextRequest {
  const h = new Headers(cabecalhos);
  if (c.corpo !== undefined) h.set("content-type", "application/json");
  return new NextRequest(`http://localhost${c.caminho}`, {
    method: c.metodo,
    headers: h,
    body: c.corpo === undefined ? undefined : JSON.stringify(c.corpo),
  });
}

async function chamar(c: Caso, req: NextRequest): Promise<Response> {
  const carregar = CARREGA[c.rota];
  if (!carregar) throw new Error(`rota sem carregador: ${c.rota}`);
  const modulo = (await carregar()) as unknown as Record<string, unknown>;
  const manipulador = modulo[c.metodo] as Manipulador;
  return manipulador(req, { params: Promise.resolve(c.params ?? {}) });
}

function tokenValido(o: { org: string; id: string; papel: string; escopos: string[] }): void {
  vi.mocked(validateBearerToken).mockResolvedValue({
    organizationId: o.org,
    role: o.papel,
    actor: { type: "api_token", id: o.id, role: o.papel },
    apiTokenId: o.id,
    scopes: o.escopos,
  } as never);
}

type OpcoesDoToken = { org?: string; papel?: string; escopos?: string[]; linhas?: Linhas };

async function comoToken(c: Caso, o: OpcoesDoToken = {}) {
  const org = o.org ?? ORG_A;
  const falso = criarClienteAdminFalso({
    orgDona: org,
    linhas: o.linhas ?? c.linhas,
    rpc: c.rpc,
    tabelasSemOrganizacao: SEM_ORGANIZACAO,
  });
  vi.mocked(createAdminClient).mockReturnValue(falso.cliente as never);
  tokenValido({
    org,
    id: org === ORG_A ? TOKEN_A : TOKEN_B,
    papel: o.papel ?? c.papelDoToken ?? c.papel,
    escopos: o.escopos ?? [c.escopo],
  });
  const res = await chamar(c, requisicao(c, AUTORIZACAO));
  const texto = await res.text();
  return { res, texto, falso };
}

async function comoSessao(c: Caso) {
  const falso = criarClienteAdminFalso({
    orgDona: ORG_A,
    linhas: c.linhas,
    rpc: c.rpc,
    tabelasSemOrganizacao: SEM_ORGANIZACAO,
  });
  vi.mocked(createClient).mockResolvedValue({
    ...(falso.cliente as object),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: PESSOA_DA_SESSAO, idioma: "pt-BR" } },
        error: null,
      }),
    },
  } as never);
  vi.mocked(createAdminClient).mockReturnValue(falso.cliente as never);
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: PESSOA_DA_SESSAO, idioma: "pt-BR" },
    org: { orgId: ORG_A, name: "Org", role: c.papel },
  } as never);
  vi.mocked(loadAuthUser).mockResolvedValue({
    id: PESSOA_DA_SESSAO,
    idioma: "pt-BR",
  } as never);
  vi.mocked(orgAtivaDaApi).mockResolvedValue({
    ok: true,
    org: { orgId: ORG_A, name: "Org", role: c.papel, org_status: "active" },
  } as never);
  const res = await chamar(c, requisicao(c));
  const texto = await res.text();
  return { res, texto, falso };
}

function daOrganizacao(linhas: Linhas, org: string, tabelas: string[]): Linhas {
  return Object.fromEntries(
    tabelas.map((tabela) => [tabela, (linhas[tabela] ?? []).filter((l) => l.organization_id === org)]),
  );
}

function json<T>(texto: string): T {
  return JSON.parse(texto) as T;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createClient).mockImplementation(async () => {
    throw new Error("cliente de sessão usado no ramo do token");
  });
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as never);
  vi.mocked(requireRole).mockImplementation(async () => {
    throw new Error("requireRole chamado no ramo do token");
  });
  vi.mocked(audit).mockResolvedValue(undefined);
});

// ─── Os seis testes de cada método ──────────────────────────────────────────

const DEGRAU_ABAIXO: Record<Papel, Papel> = {
  admin: "manager",
  manager: "agent",
  agent: "viewer",
  viewer: "viewer",
};

describe("agenda aceita token", () => {
  for (const c of CASOS) {
    const n = nome(c);
    const tabelas = Object.keys(c.linhas);

    it(`${n}: token de A alcança o recurso de A`, async () => {
      const { res, texto, falso } = await comoToken(c);

      expect(res.status, texto).toBe(c.status);
      expect(
        cadeiasForaDaOrganizacao(falso.cadeias, ORG_A, { tabelasSemOrganizacao: SEM_ORGANIZACAO }),
      ).toEqual([]);
      expect(rpcsForaDaOrganizacao(falso.rpcs, ORG_A)).toEqual([]);
      expect(arquivosForaDaOrganizacao(falso.uploads, ORG_A)).toEqual([]);
      for (const deB of SO_DA_B) expect(texto).not.toContain(deB);
      if (c.colecao) expect(texto).toContain(c.colecao.daA);

      expect(requireRole).not.toHaveBeenCalled();
      expect(createClient).not.toHaveBeenCalled();
      if (c.audita) {
        expect(audit).toHaveBeenCalledWith(
          expect.objectContaining({ organizationId: ORG_A, actorUserId: null, actorApiTokenId: TOKEN_A }),
        );
      } else {
        expect(audit).not.toHaveBeenCalled();
      }
    });

    it(`${n}: token de B não alcança o recurso de A`, async () => {
      const idsAntes = new Set((c.linhas.calendar_appointments ?? []).map((l) => l.id));
      const { res, texto, falso } = await comoToken(c, { org: ORG_B });

      if (c.colecao) {
        expect(res.status, texto).toBe(200);
        for (const deA of SO_DA_A) expect(texto).not.toContain(deA);
        expect(texto).toContain(c.colecao.daB);
        expect(cadeiasDeEscrita(falso.cadeias)).toEqual([]);
      } else if (c.cria) {
        expect(res.status, texto).toBe(c.status);
        for (const deA of SO_DA_A) expect(texto).not.toContain(deA);
        const criadas = (falso.linhas.calendar_appointments ?? []).filter((l) => !idsAntes.has(l.id));
        expect(criadas).toHaveLength(1);
        expect(criadas[0]?.organization_id).toBe(ORG_B);
        expect(audit).toHaveBeenCalledWith(expect.objectContaining({ organizationId: ORG_B, actorApiTokenId: TOKEN_B }));
        expect(audit).not.toHaveBeenCalledWith(expect.objectContaining({ organizationId: ORG_A }));
      } else {
        expect(res.status, texto).toBe(404);
        expect(audit).not.toHaveBeenCalled();
      }

      expect(
        cadeiasForaDaOrganizacao(falso.cadeias, ORG_B, { tabelasSemOrganizacao: SEM_ORGANIZACAO }),
      ).toEqual([]);
      expect(rpcsForaDaOrganizacao(falso.rpcs, ORG_B)).toEqual([]);
      expect(arquivosForaDaOrganizacao(falso.uploads, ORG_B)).toEqual([]);
      expect(daOrganizacao(falso.linhas, ORG_A, tabelas)).toEqual(daOrganizacao(c.linhas, ORG_A, tabelas));
    });

    it(`${n}: token sem o escopo é recusado`, async () => {
      const outro = c.escopo === "mcp:read" ? "mcp:write" : "mcp:read";
      const { res, texto, falso } = await comoToken(c, { escopos: [outro] });

      expect(res.status, texto).toBe(403);
      expect(falso.cadeias).toEqual([]);
      expect(falso.rpcs).toEqual([]);
      expect(audit).not.toHaveBeenCalled();
    });

    if (c.papel === "viewer") {
      // viewer é o degrau mais baixo: não existe papel abaixo dele.
    } else {
      it(`${n}: token abaixo do papel é recusado`, async () => {
        const { res, texto, falso } = await comoToken(c, { papel: DEGRAU_ABAIXO[c.papelDoToken ?? c.papel] });

        expect(res.status, texto).toBe(403);
        expect(falso.cadeias).toEqual([]);
        expect(falso.rpcs).toEqual([]);
        expect(audit).not.toHaveBeenCalled();
      });
    }

    it(`${n}: acima do teto do token → 429`, async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false } as never);
      const { res, texto, falso } = await comoToken(c);

      expect(res.status, texto).toBe(429);
      expect(res.headers.get("Retry-After")).toBeTruthy();
      expect(falso.cadeias).toEqual([]);
      expect(falso.rpcs).toEqual([]);
      expect(vi.mocked(checkRateLimit).mock.calls[0]?.[0]).toBe(`${c.recurso}:tok:${TOKEN_A}`);
    });

    it(`${n}: sessão continua com o mesmo portão`, async () => {
      const { res, texto, falso } = await comoSessao(c);

      expect(res.status, texto).toBe(c.status);
      expect(requireRole).toHaveBeenCalledWith(c.papel, expect.objectContaining({ resource: c.recurso }));
      expect(validateBearerToken).not.toHaveBeenCalled();
      expect(checkRateLimit).not.toHaveBeenCalled();
      if (c.audita) {
        expect(audit).toHaveBeenCalledWith(
          expect.objectContaining({ organizationId: ORG_A, actorUserId: PESSOA_DA_SESSAO, actorApiTokenId: null }),
        );
      }
    });
  }
});

// ─── O que segue só de sessão ───────────────────────────────────────────────

describe("o que segue só de sessão", () => {
  it("PATCH /api/v1/agenda/configuracao: fica só de sessão (fn_agenda_settings exige auth.uid())", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    } as never);
    const modulo = await import("@/app/api/v1/agenda/configuracao/route");
    const res = await modulo.PATCH(
      new NextRequest(`http://localhost/api/v1/agenda/configuracao`, {
        method: "PATCH",
        headers: { ...AUTORIZACAO, "content-type": "application/json" },
        body: JSON.stringify({ prazo_confirmacao_horas: 24 }),
      }),
      { params: Promise.resolve({}) },
    );

    expect(res.status).toBe(401);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.objectContaining({ resource: "agenda" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("POST /api/v1/agenda/excecoes: fica só de sessão (user_id NOT NULL com auth.uid())", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    } as never);
    const modulo = await import("@/app/api/v1/agenda/excecoes/route");
    const res = await modulo.POST(
      new NextRequest(`http://localhost/api/v1/agenda/excecoes`, {
        method: "POST",
        headers: { ...AUTORIZACAO, "content-type": "application/json" },
        body: JSON.stringify({ tipo: "indisponibilidade", starts_at: "2026-11-02T10:00:00Z", ends_at: "2026-11-02T12:00:00Z" }),
      }),
      { params: Promise.resolve({}) },
    );

    expect(res.status).toBe(401);
    expect(requireRole).toHaveBeenCalledWith("agent", expect.objectContaining({ resource: "agenda" }));
    expect(validateBearerToken).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});

// ─── A borda que nenhum teste de handler alcança: o proxy ───────────────────

/**
 * O `proxy.ts` roda ANTES de qualquer route handler e só reconhece cookie. Sem
 * entrada em PUBLIC_PATHS o Bearer nem chega à rota. A porta precisa ser
 * ESTREITA: id em forma de UUID, âncora nos dois lados.
 *
 * Irmãos literais (ls app/api/v1/agenda/): tipos/[id] (DELETE reativar não),
 * excecoes (POST não), google/calendarios/[id] (não convertido), etc.
 */
describe("PUBLIC_PATHS — as portas de agenda", () => {
  const UUID = "00000000-0000-4000-8000-000000000000";

  it.each([
    "/api/v1/agenda/configuracao",
    "/api/v1/agenda/enderecos",
    "/api/v1/agenda/google/calendarios",
    "/api/v1/agenda/google/calendarios/atualizar",
    `/api/v1/agenda/agendamentos/${UUID}`,
    `/api/v1/agenda/agendamentos/${UUID}/google/resolver`,
    `/api/v1/agenda/agendamentos/${UUID}/google/retry`,
    "/api/v1/agenda/horarios-livres",
    "/api/v1/agenda/pessoas",
    "/api/v1/agenda/tipos/reativar",
    "/api/v1/agenda/vinculos",
  ])("libera %s para Bearer", (caminho) => {
    expect(isPublicPath(caminho)).toBe(true);
  });

  it.each([
    // segmento que não é UUID
    "/api/v1/agenda/agendamentos/abc",
    "/api/v1/agenda/agendamentos/x",
    // sub-path futuro sob uma porta existente
    `/api/v1/agenda/agendamentos/${UUID}/x`,
    // irmão literal do mesmo nível que NÃO ganhou porta (excecoes POST)
    "/api/v1/agenda/excecoes",
    // irmão literal de calendarios (callback continua só-sessão/OAuth)
    "/api/v1/agenda/google/callback",
  ])("não libera %s", (caminho) => {
    expect(isPublicPath(caminho)).toBe(false);
  });
});
