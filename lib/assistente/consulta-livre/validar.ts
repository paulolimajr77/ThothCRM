/**
 * Consulta livre do assistente — a PRIMEIRA cerca: o texto do SQL.
 *
 * O agente escreve a análise que quiser (JOIN, soma, média, agrupar por vendedor ou por dia), mas só
 * LEITURA, uma instrução só. A cerca de verdade é o banco (papel `authenticated` + RLS + visões
 * temporárias só da organização, em `executar.ts`); aqui se barra o que é óbvio e o que escaparia do
 * desenho: trocar de papel, olhar outro esquema, abrir comentário ou identificador entre aspas.
 *
 * Tudo em minúsculas e por palavra inteira: "set_config" barra, "reset_password_at" (coluna) não.
 */

export const TAMANHO_MAXIMO_DO_SQL = 6000;

/** Palavras que nunca aparecem numa leitura de dados. Barrar é barato; o falso positivo é raro. */
const PALAVRAS_PROIBIDAS = [
  "insert", "update", "delete", "drop", "alter", "create", "truncate", "grant", "revoke", "copy",
  "execute", "set", "reset", "into",
  // trocar de papel ou ler configuração do servidor
  "set_config", "current_setting", "session_authorization",
  // outros esquemas e catálogos
  "public", "pg_temp", "pg_catalog", "information_schema", "auth", "storage", "vault", "realtime",
  "extensions", "graphql", "graphql_public", "supabase_functions", "pgsodium",
  // funções de arquivo, rede e bloqueio
  "dblink", "lo_import", "lo_export", "pg_sleep", "txid_current",
];

const PROIBIDAS = new Set(PALAVRAS_PROIBIDAS);

export type ResultadoDaValidacao = { ok: true; sql: string } | { ok: false; motivo: string };

export function validarConsulta(bruto: string): ResultadoDaValidacao {
  let sql = bruto.trim();
  if (sql.endsWith(";")) sql = sql.slice(0, -1).trimEnd();
  if (sql.length === 0) return { ok: false, motivo: "consulta vazia" };
  if (sql.length > TAMANHO_MAXIMO_DO_SQL) return { ok: false, motivo: "consulta grande demais" };
  if (sql.includes(";")) return { ok: false, motivo: "só uma consulta por vez (sem ponto e vírgula)" };
  if (sql.includes("--") || sql.includes("/*")) return { ok: false, motivo: "sem comentários na consulta" };
  if (sql.includes('"')) return { ok: false, motivo: "sem aspas duplas: use os nomes simples das tabelas e colunas" };
  if (sql.includes("$")) return { ok: false, motivo: "sem cifrão ($) na consulta" };
  if (sql.includes("\\")) return { ok: false, motivo: "sem barra invertida na consulta" };

  const minusculo = sql.toLowerCase();
  if (!/^(select|with)\b/.test(minusculo)) return { ok: false, motivo: "a consulta tem de começar com SELECT ou WITH" };

  // Palavras inteiras, fora de textos entre aspas simples (um texto como 'role' é só um valor).
  const semTextos = minusculo.replace(/'(?:[^']|'')*'/g, "''");
  for (const palavra of semTextos.match(/[a-z_][a-z0-9_]*/g) ?? []) {
    if (PROIBIDAS.has(palavra)) return { ok: false, motivo: `a palavra "${palavra}" não é permitida` };
    if (palavra.startsWith("pg_")) return { ok: false, motivo: `nomes que começam com pg_ não são permitidos` };
  }
  return { ok: true, sql };
}
