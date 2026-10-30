/**
 * Consulta livre do assistente — a cerca de VERDADE: o banco.
 *
 * Como roda (uma transação por consulta, sempre desfeita no fim):
 *   1. `SET LOCAL ROLE authenticated` + a identidade da pessoa nos claims: a RLS do produto passa a
 *      valer como se a própria pessoa estivesse consultando (a mesma `fn_user_org_ids()`).
 *   2. Para cada tabela com `organization_id` que a sessão pode ler, uma VISÃO TEMPORÁRIA de mesmo nome,
 *      filtrada na organização ATIVA e SEM as colunas de segredo (cifradas, tokens, senhas, CPF cifrado).
 *      Quem tem conta em duas organizações vê só a da sessão: a RLS sozinha deixaria ver as duas.
 *   3. `search_path = pg_temp`: o SQL do agente só alcança essas visões. O esquema `public` fica fora do
 *      alcance (e `validar.ts` barra escrevê-lo), então tabela crua e função de `public` não são chamáveis.
 *   4. Somente leitura, tempo máximo por consulta e no máximo 200 linhas DEVOLVIDAS (a conta, ela sim,
 *      pode varrer a base toda: o limite é do que volta, nunca do que se analisa).
 *
 * O modelo nunca escolhe organização nem usuário: vêm da sessão (a rota do chat).
 */
import type pg from "pg";

import { validarConsulta } from "./validar";

export const LINHAS_DEVOLVIDAS = 200;
export const TEMPO_MAXIMO_EM_MS = 8000;
const TAMANHO_MAXIMO_DA_CELULA = 500;
const VALIDADE_DO_DICIONARIO_EM_MS = 10 * 60 * 1000;

const COLUNA_DE_SEGREDO = /(_encrypted|_iv$|_tag$|password|secret|api_key|token_hash|credential|_token$|^token$|cpf)/;
const TABELA_DE_SEGREDO = /(credential|secret|^api_tokens$|^mfa_|^platform_|oauth|integrations$|^calendar_connections$|^external_db_connections$)/;

export interface TabelaDoDicionario {
  nome: string;
  colunas: { nome: string; tipo: string }[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O que a visão expõe: tabela e coluna sem segredo. Pura, para o teste prender a regra. */
export function filtrarDicionario(linhas: { tabela: string; coluna: string; tipo: string }[]): TabelaDoDicionario[] {
  const porTabela = new Map<string, TabelaDoDicionario>();
  for (const l of linhas) {
    if (TABELA_DE_SEGREDO.test(l.tabela) || COLUNA_DE_SEGREDO.test(l.coluna)) continue;
    const t = porTabela.get(l.tabela) ?? { nome: l.tabela, colunas: [] };
    t.colunas.push({ nome: l.coluna, tipo: l.tipo });
    porTabela.set(l.tabela, t);
  }
  return [...porTabela.values()].filter((t) => t.colunas.some((c) => c.nome === "organization_id"));
}

/** As visões temporárias da organização. `orgId` precisa ser uuid (conferido aqui, de novo). */
export function sqlDasVisoes(tabelas: TabelaDoDicionario[], orgId: string): string {
  if (!UUID.test(orgId)) throw new Error("organização inválida");
  const simples = (nome: string): boolean => /^[a-z_][a-z0-9_]*$/.test(nome);
  return tabelas
    .filter((t) => simples(t.nome))
    .map((t) => {
      const colunas = t.colunas.filter((c) => simples(c.nome)).map((c) => `"${c.nome}"`);
      return `create temp view "${t.nome}" as select ${colunas.join(", ")} from public."${t.nome}" where organization_id = '${orgId}'::uuid`;
    })
    .join(";\n");
}

/**
 * `membros`: quem é cada usuário da organização (o nome do vendedor). O nome mora no esquema de login,
 * fora do alcance do papel `authenticated`; esta visão é criada ANTES da troca de papel, só com as
 * pessoas da organização da sessão e só três colunas (sem e-mail, sem telefone).
 */
export const TABELA_DOS_MEMBROS: TabelaDoDicionario = {
  nome: "membros",
  colunas: [
    { nome: "user_id", tipo: "uuid" },
    { nome: "nome", tipo: "text" },
    { nome: "papel", tipo: "text" },
  ],
};

export function sqlDosMembros(orgId: string): string {
  if (!UUID.test(orgId)) throw new Error("organização inválida");
  return (
    "create temp view membros as select u.id as user_id, " +
    // Nome é texto que a própria pessoa escreve: só letras, espaço, ponto, apóstrofo e hífen, até 60; sem nome = 'sem nome' (nunca o e-mail).
    "coalesce(nullif(left(btrim(regexp_replace(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), '[^[:alpha:] .''-]', '', 'g')), 60), ''), 'sem nome') as nome, " +
    "uo.role as papel from auth.users u join public.user_organizations uo on uo.user_id = u.id " +
    `where uo.organization_id = '${orgId}'::uuid and uo.revoked_at is null`
  );
}

let dicionarioEmCache:{ em: number; tabelas: TabelaDoDicionario[] } | null = null;

async function lerDicionario(pool: pg.Pool): Promise<TabelaDoDicionario[]> {
  if (dicionarioEmCache && Date.now() - dicionarioEmCache.em < VALIDADE_DO_DICIONARIO_EM_MS) {
    return dicionarioEmCache.tabelas;
  }
  const { rows } = await pool.query<{ tabela: string; coluna: string; tipo: string }>(
    `select c.table_name as tabela, c.column_name as coluna, c.data_type as tipo
       from information_schema.columns c
       join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
        and has_table_privilege('authenticated', format('%I.%I', c.table_schema, c.table_name), 'select')
      order by c.table_name, c.ordinal_position`,
  );
  const tabelas = filtrarDicionario(rows);
  dicionarioEmCache = { em: Date.now(), tabelas };
  return tabelas;
}

/** Só para teste. */
export function limparDicionarioEmCache(): void {
  dicionarioEmCache = null;
}

export async function dicionarioDeDados(pool: pg.Pool): Promise<TabelaDoDicionario[]> {
  return [...(await lerDicionario(pool)), TABELA_DOS_MEMBROS];
}

export type ResultadoDaConsulta =
  | { ok: true; colunas: string[]; linhas: Record<string, unknown>[]; truncado: boolean }
  | { ok: false; motivo: "consulta_recusada" | "erro_na_consulta" | "indisponivel"; detalhe: string };

function limitarCelula(valor: unknown): unknown {
  if (typeof valor === "string") return valor.length > TAMANHO_MAXIMO_DA_CELULA ? `${valor.slice(0, TAMANHO_MAXIMO_DA_CELULA)}…` : valor;
  if (valor !== null && typeof valor === "object" && !(valor instanceof Date)) {
    const texto = JSON.stringify(valor);
    return texto.length > TAMANHO_MAXIMO_DA_CELULA ? `${texto.slice(0, TAMANHO_MAXIMO_DA_CELULA)}…` : valor;
  }
  if (typeof valor === "bigint") return valor.toString();
  return valor;
}

export async function executarConsultaLivre(
  pool: pg.Pool,
  sessao: { userId: string; orgId: string },
  sqlDoAgente: string,
): Promise<ResultadoDaConsulta> {
  const validacao = validarConsulta(sqlDoAgente);
  if (!validacao.ok) return { ok: false, motivo: "consulta_recusada", detalhe: validacao.motivo };
  if (!UUID.test(sessao.userId) || !UUID.test(sessao.orgId)) {
    return { ok: false, motivo: "indisponivel", detalhe: "sessão inválida" };
  }

  let tabelas: TabelaDoDicionario[];
  try {
    tabelas = await lerDicionario(pool);
  } catch {
    return { ok: false, motivo: "indisponivel", detalhe: "não consegui ler o dicionário de dados" };
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(sqlDosMembros(sessao.orgId));
    await client.query("grant select on pg_temp.membros to authenticated");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [
      JSON.stringify({ sub: sessao.userId, role: "authenticated" }),
      sessao.userId,
    ]);
    await client.query(`set local statement_timeout = ${TEMPO_MAXIMO_EM_MS}`);
    await client.query(sqlDasVisoes(tabelas, sessao.orgId));
    await client.query("set local search_path = pg_temp");
    await client.query("set local transaction_read_only = on");
    try {
      const r = await client.query({
        text: `select * from (${validacao.sql}) as consulta limit ${LINHAS_DEVOLVIDAS + 1}`,
        values: [],
      });
      const linhas = r.rows.slice(0, LINHAS_DEVOLVIDAS).map((l: Record<string, unknown>) => {
        const saida: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(l)) saida[k] = limitarCelula(v);
        return saida;
      });
      return {
        ok: true,
        colunas: r.fields.map((f) => f.name),
        linhas,
        truncado: r.rows.length > LINHAS_DEVOLVIDAS,
      };
    } catch (erro) {
      // Erro de SQL do agente (coluna que não existe, tipo errado…): a mensagem ajuda ele a corrigir.
      const mensagem = erro instanceof Error ? erro.message : "erro desconhecido";
      return { ok: false, motivo: "erro_na_consulta", detalhe: mensagem.slice(0, 300) };
    }
  } catch {
    return { ok: false, motivo: "indisponivel", detalhe: "a consulta não pôde ser preparada" };
  } finally {
    try {
      await client.query("rollback");
    } catch {
      /* a conexão quebrada é descartada abaixo */
    }
    client.release();
  }
}
