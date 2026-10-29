/**
 * A revisão: o único caminho para um modelo ficar `revisado` (aplicável).
 *
 * Recusa a estrutura fora do formato, o follow-up que não existe no catálogo e
 * qualquer texto que ainda tenha marca `[REVISAR: …]`, termo do nome da empresa
 * de origem ou dado com cara de contato. A recusa diz ONDE está cada achado — "texto inválido" faria quem
 * revisa reler dez prompts para achar um telefone.
 */
import { modeloPorId } from "@/lib/followup/modelos";

import { estruturaDoModeloSchema, textosDaEstrutura, type EstruturaDoModelo } from "./estrutura";
import { achadosSensiveis } from "./limpar";

export type ResultadoDaRevisao =
  | { ok: true; estrutura: EstruturaDoModelo }
  | { ok: false; motivo: "formato_invalido"; detalhe: string }
  | { ok: false; motivo: "texto_sensivel"; achados: { onde: string; tipos: string[] }[] };

/** `termos`: os do nome da empresa de origem (`source_terms`), que não podem sobrar no texto. */
export function revisarEstrutura(entrada: unknown, termos: readonly string[] = []): ResultadoDaRevisao {
  const parsed = estruturaDoModeloSchema.safeParse(entrada);
  if (!parsed.success) {
    const primeiro = parsed.error.issues[0];
    return {
      ok: false,
      motivo: "formato_invalido",
      detalhe: primeiro ? `${primeiro.path.join(".")}: ${primeiro.message}` : "estrutura inválida",
    };
  }
  const estrutura = parsed.data;
  const foraDoCatalogo = estrutura.followups.find((f) => modeloPorId(f.modelo_id) === undefined);
  if (foraDoCatalogo) {
    return {
      ok: false,
      motivo: "formato_invalido",
      detalhe: `follow-up «${foraDoCatalogo.modelo_id}» não existe no catálogo`,
    };
  }
  const achados = textosDaEstrutura(estrutura)
    .map(({ onde, texto }) => ({ onde, tipos: achadosSensiveis(texto, termos) }))
    .filter((a) => a.tipos.length > 0);
  if (achados.length > 0) return { ok: false, motivo: "texto_sensivel", achados };
  return { ok: true, estrutura };
}
