/**
 * Consulta livre do assistente — as partes puras: o que o texto do SQL pode conter e o que as visões
 * expõem. O isolamento entre organizações, no banco, está em
 * `tests/invariants/assistente-consulta-livre-isolamento.test.ts`.
 */
import { describe, expect, it } from "vitest";

import { filtrarDicionario, sqlDasVisoes, sqlDosMembros } from "./executar";
import { validarConsulta } from "./validar";

const ORG = "eeeeeeee-9000-4000-8000-000000000001";

describe("validarConsulta", () => {
  it("aceita análise de verdade: JOIN, agrupar, CTE, janela e datas", () => {
    for (const bom of [
      "select owner_user_id, sum(value_cents) from crm_leads where status = 'won' group by 1",
      "with a as (select id from crm_leads) select count(*) from a",
      "select date_trunc('day', closed_at at time zone 'America/Sao_Paulo') d, count(*) from crm_leads group by 1 order by 1 desc",
      "select l.id, c.display_name from crm_leads l join contacts c on c.id = l.contact_id limit 10;",
      "select role, count(*) from user_organizations group by role",
      "select count(*) filter (where status = 'won'), round(avg(value_cents)::numeric(12,2) / 100, 2) from crm_leads",
      "select owner_user_id, rank() over (order by sum(value_cents) desc) from crm_leads where id in (select id from crm_leads) group by 1",
    ]) {
      expect(validarConsulta(bom), bom).toMatchObject({ ok: true });
    }
  });

  it("texto entre aspas simples é só valor: 'update' como status não derruba a consulta", () => {
    expect(validarConsulta("select count(*) from crm_leads where source = 'update'").ok).toBe(true);
  });

  it("recusa escrita, troca de papel, outro esquema, comentário, várias consultas e aspas", () => {
    // Sabotagem: esvaziar PALAVRAS_PROIBIDAS deixa vários destes vermelhos.
    for (const ruim of [
      "delete from contacts",
      "update contacts set display_name = 'x'",
      "insert into contacts (id) values (1)",
      "select * into novo from contacts",
      "select set_config('role', 'postgres', true)",
      "select current_setting('request.jwt.claims')",
      "select * from public.contacts",
      "select * from auth.users",
      "select * from information_schema.tables",
      "select * from pg_roles",
      "select pg_sleep(100)",
      // funções que executam TEXTO como SQL: o texto entre aspas passaria por um filtro de palavras
      "select query_to_xml('select * from public.contacts', true, true, '')",
      "select * from ts_stat('select to_tsvector(''x'')')",
      "select table_to_xml('contacts', true, false, '')",
      "select to_regclass('public.contacts')",
      "select query_to_xml(chr(115) || 'elect 1', true, true, '')",
      "select dblink('x','y')",
      "select public.fn_user_org_ids()",
      "select 1; select 2",
      "select 1 -- comentário",
      "select /* x */ 1",
      'select * from "contacts"',
      "explain select 1",
      "set role postgres",
      "show all",
      "",
    ]) {
      expect(validarConsulta(ruim).ok, ruim).toBe(false);
    }
  });

  it("recusa consulta enorme", () => {
    expect(validarConsulta(`select ${"1,".repeat(4000)}1`).ok).toBe(false);
  });
});

describe("filtrarDicionario e sqlDasVisoes", () => {
  const linhas = [
    { tabela: "crm_leads", coluna: "id", tipo: "uuid" },
    { tabela: "crm_leads", coluna: "organization_id", tipo: "uuid" },
    { tabela: "crm_leads", coluna: "value_cents", tipo: "bigint" },
    { tabela: "channel_sessions", coluna: "organization_id", tipo: "uuid" },
    { tabela: "channel_sessions", coluna: "webhook_secret_encrypted", tipo: "text" },
    { tabela: "channel_sessions", coluna: "meta_token_encrypted", tipo: "text" },
    { tabela: "channel_sessions", coluna: "webhook_path_token", tipo: "text" },
    { tabela: "contacts", coluna: "organization_id", tipo: "uuid" },
    { tabela: "contacts", coluna: "cpf_encrypted", tipo: "text" },
    { tabela: "llm_calls", coluna: "organization_id", tipo: "uuid" },
    { tabela: "llm_calls", coluna: "input_tokens", tipo: "integer" },
    { tabela: "ai_provider_credentials", coluna: "organization_id", tipo: "uuid" },
    { tabela: "api_tokens", coluna: "organization_id", tipo: "uuid" },
    { tabela: "ai_pricing", coluna: "prompt_cents_per_million_tokens", tipo: "integer" },
  ];

  it("some tabela de segredo e coluna de segredo; mantém uso de tokens de IA; só tabela de organização", () => {
    // Sabotagem: afrouxar COLUNA_DE_SEGREDO/TABELA_DE_SEGREDO deixa este teste vermelho.
    const d = filtrarDicionario(linhas);
    const nomes = d.map((t) => t.nome).sort();
    expect(nomes).toEqual(["channel_sessions", "contacts", "crm_leads", "llm_calls"]);
    const canal = d.find((t) => t.nome === "channel_sessions")!;
    expect(canal.colunas.map((c) => c.nome)).toEqual(["organization_id"]);
    expect(d.find((t) => t.nome === "contacts")!.colunas.map((c) => c.nome)).toEqual(["organization_id"]);
    expect(d.find((t) => t.nome === "llm_calls")!.colunas.map((c) => c.nome)).toContain("input_tokens");
  });

  it("a visão filtra na organização da sessão e só lista colunas liberadas", () => {
    const visoes = sqlDasVisoes(filtrarDicionario(linhas), ORG);
    expect(visoes).toContain(`where organization_id = '${ORG}'::uuid`);
    expect(visoes).not.toContain("encrypted");
    expect(visoes).not.toContain("webhook_path_token");
    expect(visoes.split(";\n")).toHaveLength(4);
  });

  it("organização que não é uuid não vira SQL", () => {
    expect(() => sqlDasVisoes(filtrarDicionario(linhas), "x'; drop table a; --")).toThrow();
  });
});

describe("sqlDosMembros", () => {
  it("só a organização da sessão, sem e-mail na saída, e organização que não é uuid não vira SQL", () => {
    const sql = sqlDosMembros(ORG);
    expect(sql).toContain(`uo.organization_id = '${ORG}'::uuid`);
    expect(sql).toContain("uo.revoked_at is null");
    expect(sql.split(" as nome")[0]).toContain("u.id as user_id");
    expect(sql).not.toMatch(/u\.email as/);
    expect(() => sqlDosMembros("x'; drop table a; --")).toThrow();
  });
});
