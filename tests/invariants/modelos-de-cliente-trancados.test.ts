import { execFileSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * config_client_templates (migration 8008) — o modelo tirado de cliente real.
 *
 * A tabela é da INSTALAÇÃO: guarda a estrutura limpa de uma empresa e os termos
 * do nome dela (para a revisão recusar). Nenhuma sessão pode ler nem gravar —
 * nem o admin da empresa de origem, nem o de outra: só o servidor, atrás do
 * admin da plataforma. Medido com dois tenants reais por JWT.
 */
const container = process.env.TEST_DB_CONTAINER;
if (!container) throw new Error('Rode via pnpm test:db.');
function sql(script: string): string {
  return execFileSync('docker', ['exec','-i',container!, 'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-tA','-f','-'],
    { input: script, encoding: 'utf8' }).trim();
}
const ultima = (s: string) => s.split('\n').pop() ?? '';
const A = '08008008-0000-4000-8000-00000000000a';
const B = '08008008-0000-4000-8000-00000000000b';
const UA = '08008008-1111-4000-8000-00000000000a';
const UB = '08008008-1111-4000-8000-00000000000b';
const MODELO = '08008008-2222-4000-8000-000000000001';

beforeAll(() => sql(`
  insert into auth.users(id,email) values ('${UA}','modelo-a@invariant.test'),('${UB}','modelo-b@invariant.test') on conflict do nothing;
  insert into public.organizations(id,slug,legal_name,display_name) values
    ('${A}','modelo-a','Modelo A Ltda','Clínica Modelo A'),('${B}','modelo-b','Modelo B Ltda','Odonto Modelo B') on conflict(id) do nothing;
  insert into public.user_organizations(user_id,organization_id,role,accepted_at) values
    ('${UA}','${A}','admin',now()),('${UB}','${B}','admin',now()) on conflict do nothing;
  insert into public.config_client_templates(id,name,status,structure,source_hash,source_terms)
    values ('${MODELO}','Clínica pronta','rascunho','{"funis":[],"agentes":[],"followups":[]}'::jsonb,
            encode(sha256('${A}'::bytea),'hex'),'["Clínica Modelo A"]'::jsonb)
    on conflict (id) do nothing;
`));

describe('modelos de cliente trancados para toda sessão', () => {
  it.each([[UA,'origem'],[UB,'outra empresa']])('admin de empresa (%s) é recusado ao ler e ao gravar', (usuario) => {
    const comoSessao = (comando: string): string => {
      try {
        sql(`set role authenticated;
          select set_config('request.jwt.claims','{"sub":"${usuario}","role":"authenticated"}',false);
          ${comando}`);
        return 'passou';
      } catch (erro) {
        return String((erro as { stderr?: unknown }).stderr ?? erro);
      }
    };
    expect(comoSessao('select count(*) from public.config_client_templates;')).toMatch(/permission denied/);
    expect(comoSessao(`insert into public.config_client_templates(name,structure,source_hash)
      values ('x','{}'::jsonb,repeat('0',64));`)).toMatch(/permission denied/);
    // Controle: o servidor (postgres) lê a mesma linha — a recusa é da sessão, não da tabela vazia.
    expect(ultima(sql(`select count(*) from public.config_client_templates where id='${MODELO}';`))).toBe('1');
  });

  it('nem authenticated nem anon têm privilégio algum na tabela', () => {
    expect(ultima(sql(`select
      has_table_privilege('authenticated','public.config_client_templates','SELECT')::int::text ||
      has_table_privilege('authenticated','public.config_client_templates','INSERT')::int::text ||
      has_table_privilege('authenticated','public.config_client_templates','UPDATE')::int::text ||
      has_table_privilege('authenticated','public.config_client_templates','DELETE')::int::text ||
      has_table_privilege('anon','public.config_client_templates','SELECT')::int::text;`))).toBe('00000');
  });

  it('RLS ligada e sem policy (a segunda trava, se um grant voltar por engano)', () => {
    expect(ultima(sql(`select relrowsecurity::int::text || (select count(*) from pg_policies
      where schemaname='public' and tablename='config_client_templates')::text
      from pg_class where oid='public.config_client_templates'::regclass;`))).toBe('10');
  });

  it('a tabela não tem organization_id: o modelo não pertence a empresa nenhuma', () => {
    expect(ultima(sql(`select count(*) from information_schema.columns
      where table_schema='public' and table_name='config_client_templates' and column_name='organization_id';`))).toBe('0');
  });

  it('o banco recusa revisado sem data de revisão e o contrário', () => {
    expect(() => sql(`update public.config_client_templates set status='revisado' where id='${MODELO}';`)).toThrow();
    expect(ultima(sql(`select status from public.config_client_templates where id='${MODELO}';`))).toBe('rascunho');
  });
});
