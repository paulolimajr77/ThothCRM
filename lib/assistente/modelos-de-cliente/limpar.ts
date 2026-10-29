/**
 * A limpeza do texto que sai de um cliente real para virar modelo.
 *
 * Cada organização é um cliente pagante: o prompt de um agente costuma trazer o
 * nome da empresa, o telefone, o site, o e-mail e às vezes o CNPJ. Nada disso
 * pode chegar a outra empresa. A limpeza troca o que reconhece por uma MARCA
 * visível (`[REVISAR: telefone]`) — nunca apaga em silêncio — e o nome da
 * empresa de origem por `{{negocio}}`, que a aplicação preenche com o nome da
 * empresa de destino.
 *
 * O nome não aparece só inteiro: "Recepção Aurora" é da "Clínica Aurora". Por
 * isso os TERMOS da origem são o nome inteiro e cada palavra própria dele (4+
 * letras, fora das palavras de ramo como "clínica" ou "ltda"), comparados sem
 * acento e sem caixa.
 *
 * A limpeza automática é a primeira trava, não a única: o modelo só fica
 * aplicável depois que o admin da plataforma revisa o texto, e a revisão
 * recusa texto que ainda tenha marca, termo da origem ou dado com cara de
 * contato (`achadosSensiveis`).
 */

/** O que a limpeza reconhece, na ordem em que aplica (e-mail antes de site). */
const PADROES: readonly { tipo: string; regex: RegExp }[] = [
  { tipo: "e-mail", regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  { tipo: "site", regex: /\bhttps?:\/\/[^\s)\]]+|\bwww\.[^\s)\]]+/gi },
  { tipo: "documento", regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g },
  { tipo: "documento", regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g },
  {
    tipo: "telefone",
    regex: /(?:\+?55[\s.-]?)?\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/g,
  },
  { tipo: "site", regex: /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|app|site)(?:\.br)?\b/gi },
  { tipo: "perfil", regex: /(^|[\s(])@[a-z0-9_.]{3,30}\b/gim },
];

export const MARCADOR_DO_NEGOCIO = "{{negocio}}";

/** Palavras de ramo e de razão social: não identificam a empresa sozinhas. */
const PALAVRAS_GENERICAS = new Set(
  [
    "ltda", "eireli", "epp", "mei", "cia", "companhia", "grupo", "empresa", "comercio", "servicos",
    "clinica", "consultorio", "odontologia", "odonto", "medicos", "medica", "medico", "saude",
    "estetica", "beleza", "salao", "studio", "estudio", "centro", "instituto", "academia",
    "imobiliaria", "imoveis", "corretor", "corretora", "escritorio", "advocacia", "advogados",
    "associados", "loja", "store", "comercial", "industria", "agencia", "digital", "solucoes",
    "tecnologia", "consultoria", "cursos", "escola", "educacao", "veterinaria", "petshop",
  ],
);

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O nome inteiro e as palavras próprias dele, sem repetição, do mais longo ao mais curto. */
export function termosDaOrigem(nomes: readonly string[]): string[] {
  const termos = new Set<string>();
  for (const nome of nomes) {
    const limpo = nome.trim();
    if (limpo.length >= 3) termos.add(limpo);
    for (const palavra of limpo.split(/[^\p{L}\p{N}]+/u)) {
      if (palavra.length >= 4 && !PALAVRAS_GENERICAS.has(semAcento(palavra))) termos.add(palavra);
    }
  }
  return [...termos].sort((a, b) => b.length - a.length);
}

const VARIANTES: Record<string, string> = {
  a: "[aáàâãä]",
  e: "[eéèêë]",
  i: "[iíìîï]",
  o: "[oóòôõö]",
  u: "[uúùûü]",
  c: "[cç]",
};

/** O termo como regex de palavra inteira, sem acento e sem caixa. */
function regexDoTermo(termo: string): RegExp {
  const corpo = [...semAcento(termo)]
    .map((ch) => VARIANTES[ch] ?? ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${corpo}(?![\\p{L}\\p{N}])`, "giu");
}

const marca = (tipo: string) => `[REVISAR: ${tipo}]`;

export interface TextoLimpo {
  texto: string;
  /** Uma linha por troca feita, sem o valor trocado. */
  avisos: string[];
}

/**
 * Limpa um texto. `nomesDaOrigem` são os nomes da empresa de origem (nome de
 * exibição, razão social): eles e as palavras próprias deles viram `{{negocio}}`.
 */
export function limparTexto(texto: string, nomesDaOrigem: readonly string[]): TextoLimpo {
  const avisos: string[] = [];
  let saida = texto;

  for (const { tipo, regex } of PADROES) {
    let vezes = 0;
    saida = saida.replace(regex, (_achado: string, antes?: unknown) => {
      vezes += 1;
      // O padrão de perfil captura o espaço anterior para não pegar e-mail.
      return tipo === "perfil" && typeof antes === "string" ? `${antes}${marca(tipo)}` : marca(tipo);
    });
    if (vezes > 0) avisos.push(`${tipo} trocado por ${marca(tipo)} (${vezes}×)`);
  }

  // Contato ANTES do nome: o nome dentro de um e-mail ou site some junto com ele.
  let trocasDeNome = 0;
  for (const termo of termosDaOrigem(nomesDaOrigem)) {
    saida = saida.replace(regexDoTermo(termo), () => {
      trocasDeNome += 1;
      return MARCADOR_DO_NEGOCIO;
    });
  }
  // "{{negocio}} {{negocio}}" sobra quando o nome inteiro tinha duas palavras próprias.
  saida = saida.replace(/\{\{negocio\}\}(?:\s+\{\{negocio\}\})+/g, MARCADOR_DO_NEGOCIO);
  if (trocasDeNome > 0) avisos.push(`nome da empresa trocado por ${MARCADOR_DO_NEGOCIO} (${trocasDeNome}×)`);

  return { texto: saida, avisos };
}

/**
 * O que ainda impede o texto de ser aplicado em outra empresa: marca de
 * revisão esquecida, termo da empresa de origem ou dado com cara de contato.
 * Lista vazia = pode seguir.
 */
export function achadosSensiveis(texto: string, termos: readonly string[] = []): string[] {
  const achados = new Set<string>();
  if (/\[REVISAR:/i.test(texto)) achados.add("marca [REVISAR] ainda no texto");
  if (termos.some((t) => regexDoTermo(t).test(texto))) achados.add("nome da empresa de origem");
  for (const { tipo, regex } of PADROES) {
    if (new RegExp(regex.source, regex.flags.replace("g", "")).test(texto)) achados.add(tipo);
  }
  return [...achados];
}
