/**
 * Consulta livre do assistente (30/10/2026) — o ISOLAMENTO entre DUAS organizações, no banco de verdade.
 *
 * O agente escreve SQL; quem segura é o banco: papel `authenticated` (RLS), visões temporárias só da
 * organização ATIVA e `search_path = pg_temp`. Monta o mesmo roteiro que `executarConsultaLivre` roda
 * (a visão vem de `sqlDasVisoes`, a mesma função), com um usuário que é membro das DUAS organizações:
 * a RLS sozinha deixaria ver as duas, a visão deixa ver só a da sessão.
 *
 * Sabotagem: tirar o `where organization_id` de `sqlDasVisoes` → o teste "membro de duas" fica vermelho.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sqlDasVisoes } from "@/lib/assistente/consulta-livre/executar";
import { validarConsulta } from "@/lib/assistente/consulta-livre/validar";

import { lastLine, sql } from "./gov-helpers";

const ORG1 = "eeeeeeee-9000-4000-8000-000000000001";
const ORG2 = "eeeeeeee-9000-4000-8000-000000000002";
const SO_ORG1 = "eeeeeeee-9111-4000-8000-000000000001";
const NAS_DUAS = "eeeeeeee-9111-4000-8000-000000000002";
const C1 = "eeeeeeee-9333-4000-8000-000000000001";
const C2 = "eeeeeeee-9333-4000-8000-000000000002";

const VISAO = sqlDasVisoes(
  [
    {
      nome: "contacts",
      colunas: [
        { nome: "id", tipo: "uuid" },
        { nome: "organization_id", tipo: "uuid" },
        { nome: "display_name", tipo: "text" },
      ],
    },
  ],
  ORG1,
);

/** O roteiro de `executarConsultaLivre`, com a consulta do agente já validada. */
function comoAgente(usuario: string, orgAtiva: string, consulta: string): string {
  const validada = validarConsulta(consulta);
  if (!validada.ok) throw new Error(`recusada: ${validada.motivo}`);
  const visao = orgAtiva === ORG1 ? VISAO : VISAO.replace(ORG1, orgAtiva);
  return lastLine(
    sql(`begin;
      set local role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${usuario}","role":"authenticated"}', true);
      ${visao};
      set local search_path = pg_temp;
      set local transaction_read_only = on;
      select * from (${validada.sql}) as consulta;
      rollback;`),
  );
}

describe("consulta livre do assistente — isolamento entre organizações", () => {
  beforeAll(() => {
    sql(`
      insert into auth.users (id, email) values ('${SO_ORG1}','cl-1@invariant.test'),('${NAS_DUAS}','cl-2@invariant.test') on conflict (id) do nothing;
      insert into public.organizations (id, slug, legal_name, display_name) values
        ('${ORG1}','cl-org1','CL1','CL1'),('${ORG2}','cl-org2','CL2','CL2') on conflict (id) do nothing;
      insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
        ('${SO_ORG1}','${ORG1}','manager',now()),('${NAS_DUAS}','${ORG1}','manager',now()),('${NAS_DUAS}','${ORG2}','manager',now())
        on conflict (user_id, organization_id) do nothing;
      insert into public.contacts (id, organization_id, display_name) values ('${C1}','${ORG1}','c1'),('${C2}','${ORG2}','c2') on conflict (id) do nothing;
    `);
  });
  afterAll(() => {
    sql(`delete from public.user_organizations where organization_id in ('${ORG1}','${ORG2}');
         delete from public.contacts where organization_id in ('${ORG1}','${ORG2}');
         delete from public.organizations where id in ('${ORG1}','${ORG2}');
         delete from auth.users where id in ('${SO_ORG1}','${NAS_DUAS}');`);
  });

  it("membro de uma só organização: conta só os contatos da dele", () => {
    expect(comoAgente(SO_ORG1, ORG1, "select count(*) from contacts")).toBe("1");
  });

  it("membro de DUAS organizações: a visão da sessão mostra só a ativa (a RLS sozinha mostraria as duas)", () => {
    expect(comoAgente(NAS_DUAS, ORG1, "select count(*) from contacts")).toBe("1");
    expect(comoAgente(NAS_DUAS, ORG2, "select display_name from contacts")).toBe("c2");
    const semVisao = lastLine(
      sql(`begin; set local role authenticated;
        select set_config('request.jwt.claims', '{"sub":"${NAS_DUAS}","role":"authenticated"}', true);
        select count(*) from public.contacts where id in ('${C1}','${C2}'); rollback;`),
    );
    expect(semVisao).toBe("2");
  });

  it("quem não é membro de nenhuma organização não vê linha nenhuma", () => {
    expect(comoAgente("eeeeeeee-9111-4000-8000-0000000000ff", ORG1, "select count(*) from contacts")).toBe("0");
  });

  it("o agente não alcança a tabela crua nem escreve: a consulta é recusada antes de chegar ao banco", () => {
    for (const ataque of [
      "select * from public.contacts",
      "select set_config('role','postgres',true)",
      "select 1; delete from contacts",
      "with x as (delete from contacts returning id) select * from x",
      "select * from auth.users",
      'select * from "contacts"',
    ]) {
      expect(validarConsulta(ataque).ok, ataque).toBe(false);
    }
  });

  it("mesmo que o texto passasse, o banco é somente leitura", () => {
    let erro = "";
    try {
      sql(`begin; set local role authenticated;
        select set_config('request.jwt.claims', '{"sub":"${SO_ORG1}","role":"authenticated"}', true);
        set local transaction_read_only = on;
        update public.contacts set display_name = 'x' where id = '${C1}'; rollback;`);
    } catch (err) {
      erro = ((err as { stderr?: string }).stderr ?? "").replace(/\s+/g, " ");
    }
    expect(erro).toContain("read-only transaction");
    expect(lastLine(sql(`select display_name from public.contacts where id='${C1}';`))).toBe("c1");
  });
});
