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

/**
 * Funções que a consulta pode chamar (TUDO o que vem logo antes de "(" fora de texto entre aspas).
 * É lista de PERMITIDAS, não de proibidas: funções como `query_to_xml('...')`, `ts_stat('...')`,
 * `table_to_xml`, `dblink` executam TEXTO como SQL, e o texto entre aspas passa por qualquer filtro de
 * palavras. Só agregação, janela, data, texto, número e JSON; nada que receba SQL, caminho ou nome de
 * objeto como texto. Falta alguma legítima? O agente recebe o nome recusado e adapta; amplie aqui.
 */
const FUNCOES_PERMITIDAS = new Set([
  // agregação
  "count", "sum", "avg", "min", "max", "bool_and", "bool_or", "every", "array_agg", "string_agg", "json_agg",
  "jsonb_agg", "json_object_agg", "jsonb_object_agg", "percentile_cont", "percentile_disc", "mode", "stddev",
  "stddev_pop", "stddev_samp", "variance", "var_pop", "var_samp", "corr", "regr_slope", "regr_intercept",
  // janela
  "row_number", "rank", "dense_rank", "percent_rank", "cume_dist", "ntile", "lag", "lead", "first_value",
  "last_value", "nth_value",
  // condicional e número
  "coalesce", "nullif", "greatest", "least", "abs", "ceil", "ceiling", "floor", "round", "trunc", "mod", "power",
  "sqrt", "exp", "ln", "log", "sign", "div",
  // texto
  "lower", "upper", "initcap", "length", "char_length", "trim", "ltrim", "rtrim", "btrim", "substr", "substring",
  "left", "right", "replace", "concat", "concat_ws", "split_part", "position", "strpos", "lpad", "rpad", "repeat",
  "reverse", "translate", "starts_with", "overlay", "regexp_replace", "regexp_match", "regexp_matches", "to_char",
  "to_number", "to_date", "to_timestamp",
  // data e hora
  "date_trunc", "date_part", "extract", "now", "age", "make_date", "make_timestamp", "make_interval", "timezone",
  "justify_days",
  // json
  "jsonb_extract_path", "jsonb_extract_path_text", "json_extract_path", "json_extract_path_text",
  "jsonb_array_length", "json_array_length", "jsonb_array_elements", "jsonb_array_elements_text",
  "json_array_elements", "json_array_elements_text", "jsonb_each", "jsonb_each_text", "jsonb_object_keys",
  "jsonb_typeof", "json_typeof", "to_jsonb", "to_json", "row_to_json", "jsonb_build_object", "json_build_object",
  "jsonb_build_array", "json_build_array", "jsonb_strip_nulls",
  // listas
  "generate_series", "unnest", "array_length", "array_to_string", "cardinality", "array_position", "array_remove",
  "array_cat", "array_append",
  // tipos com tamanho: numeric(10,2), varchar(20), timestamp(3)
  "numeric", "decimal", "varchar", "char", "character", "timestamp", "timestamptz", "time", "interval", "bit", "float",
  // palavras da linguagem que vêm antes de "("
  "in", "not", "and", "or", "on", "using", "exists", "any", "all", "some", "over", "filter", "within", "values", "as",
  "from", "select", "where", "having", "by", "then", "when", "else", "case", "join", "union", "intersect", "except",
  "limit", "offset", "between", "like", "ilike", "similar", "to", "is", "distinct", "array", "row", "lateral", "end",
  "partition", "order", "group", "rows", "range", "with", "materialized", "asc", "desc", "nulls", "first", "last",
]);

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
  // Chamada de função: o nome (com ponto, se houver) logo antes de "(" tem de estar na lista.
  for (const chamada of semTextos.matchAll(/([a-z_][a-z0-9_.]*)\s*\(/g)) {
    if (!FUNCOES_PERMITIDAS.has(chamada[1]!)) {
      return { ok: false, motivo: `a função "${chamada[1]}" não é permitida (só agregação, data, texto, número e JSON)` };
    }
  }
  return { ok: true, sql };
}
