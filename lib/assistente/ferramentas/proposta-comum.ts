/**
 * O que as cinco ferramentas `propor_*` (F2b, T19) têm em comum.
 *
 * PRINCÍPIO: propor NÃO muda nada no negócio. Estas ferramentas só LEEM (GET por
 * dentro, com a sessão da pessoa, para conferir que cada id citado é da
 * organização e para montar o "antes") e chamam UMA rota de escrita: o POST de
 * propostas, que grava uma linha `pendente`. Nenhuma chama rota de escrita de
 * roteador, conhecimento, memória, provedor ou funil — quem aplica é a T20,
 * depois do clique do administrador. `proposta-comum.test.ts` e o teste de cada
 * ferramenta provam isso pelo registro de chamadas.
 *
 * Texto de terceiros lido aqui (nome de funil, FAQ, memória) é DADO: vai para o
 * `antes` da proposta e para o resultado, nunca é obedecido.
 */
import { z } from "zod";

import { escritaPermitida, acaoPermitida } from "@/lib/assistente/portas/regras";
import { chamarRotaPorDentro, type HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";
import { riscoDaProposta } from "@/lib/assistente/propostas/operacoes";
import { esquemaDoCorpoDaProposta } from "@/lib/assistente/propostas/payload";
import type { TipoDeProposta } from "@/lib/assistente/propostas/tipos";

import type { EntradaDasFerramentas } from "./tipos";
import { anotarCartaoDeProposta, avisarTelaDaPorta } from "./tipos";

/** O texto que toda proposta traz: o título para leigo e o porquê. */
export const camposDeTexto = {
  resumo: z.string().trim().min(3).max(300),
  motivo: z.string().trim().min(3).max(2000),
};

// ─── as fontes de LEITURA e a rota de propostas ─────────────────────────────

export interface FontesDeProposta {
  canais?: HandlerDeRota;
  roteadores?: HandlerDeRota;
  roteador?: HandlerDeRota;
  agentes?: HandlerDeRota;
  memoria?: HandlerDeRota;
  conhecimento?: HandlerDeRota;
  funis?: HandlerDeRota;
  etapas?: HandlerDeRota;
  provedores?: HandlerDeRota;
  propostas?: HandlerDeRota;
  aprovar?: HandlerDeRota;
  aplicar?: HandlerDeRota;
}

let sobrepostas: FontesDeProposta | null = null;

/** Só para testes: troca os handlers reais (que exigiriam sessão) por dublês. */
export function sobreporFontesDeProposta(fontes: FontesDeProposta | null): void {
  sobrepostas = fontes;
}

export const CAMINHOS = {
  canais: "/api/v1/channel-sessions",
  roteadores: "/api/v1/ai/routers",
  agentes: "/api/v1/ai/agents",
  memoria: "/api/v1/ai/memory",
  conhecimento: "/api/v1/ai/knowledge/sources",
  funis: "/api/v1/pipelines",
  provedores: "/api/v1/ai/providers",
  propostas: "/api/v1/ai/assistente/propostas",
} as const;

export const FONTES = {
  async canais(): Promise<HandlerDeRota> {
    if (sobrepostas?.canais) return sobrepostas.canais;
    return (await import("@/app/api/v1/channel-sessions/route")).GET;
  },
  async roteadores(): Promise<HandlerDeRota> {
    if (sobrepostas?.roteadores) return sobrepostas.roteadores;
    return (await import("@/app/api/v1/ai/routers/route")).GET;
  },
  async roteador(id: string): Promise<HandlerDeRota> {
    if (sobrepostas?.roteador) return sobrepostas.roteador;
    const modulo = await import("@/app/api/v1/ai/routers/[id]/route");
    return (req) => modulo.GET(req, { params: Promise.resolve({ id }) });
  },
  async agentes(): Promise<HandlerDeRota> {
    if (sobrepostas?.agentes) return sobrepostas.agentes;
    return (await import("@/app/api/v1/ai/agents/route")).GET;
  },
  async memoria(): Promise<HandlerDeRota> {
    if (sobrepostas?.memoria) return sobrepostas.memoria;
    return (await import("@/app/api/v1/ai/memory/route")).GET;
  },
  async conhecimento(): Promise<HandlerDeRota> {
    if (sobrepostas?.conhecimento) return sobrepostas.conhecimento;
    return (await import("@/app/api/v1/ai/knowledge/sources/route")).GET;
  },
  async funis(): Promise<HandlerDeRota> {
    if (sobrepostas?.funis) return sobrepostas.funis;
    return (await import("@/app/api/v1/pipelines/route")).GET;
  },
  async etapas(pipelineId: string): Promise<HandlerDeRota> {
    if (sobrepostas?.etapas) return sobrepostas.etapas;
    const modulo = await import("@/app/api/v1/pipelines/[id]/stages/route");
    return (req) => modulo.GET(req, { params: Promise.resolve({ id: pipelineId }) });
  },
  async provedores(): Promise<HandlerDeRota> {
    if (sobrepostas?.provedores) return sobrepostas.provedores;
    return (await import("@/app/api/v1/ai/providers/route")).GET;
  },
  async propostas(): Promise<HandlerDeRota> {
    if (sobrepostas?.propostas) return sobrepostas.propostas;
    return (await import("@/app/api/v1/ai/assistente/propostas/route")).POST;
  },
};

// ─── leitura ────────────────────────────────────────────────────────────────

export type Leitura = { ok: true; dados: unknown } | { ok: false; status: number | null };

/** GET por dentro. Nunca lança: falha vira `{ ok:false }` com o status (ou `null` se a chamada caiu). */
export async function ler(handler: HandlerDeRota, caminho: string): Promise<Leitura> {
  const resposta = await chamarRotaPorDentro(handler, caminho, {});
  if (!("status" in resposta)) return { ok: false, status: null };
  if (resposta.status !== 200) return { ok: false, status: resposta.status };
  const corpo = eObjeto(resposta.corpo) ? (resposta.corpo as { data?: unknown }).data : undefined;
  return corpo === undefined ? { ok: false, status: null } : { ok: true, dados: corpo };
}

export function eObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

/** Lista de objetos de uma leitura, ou `null` se o formato não é o esperado. */
export function comoLista(dados: unknown): Record<string, unknown>[] | null {
  return Array.isArray(dados) ? (dados.filter(eObjeto) as Record<string, unknown>[]) : null;
}

/** Os ids (string) de uma lista de linhas. */
export function idsDe(linhas: Record<string, unknown>[]): Set<string> {
  return new Set(linhas.flatMap((l) => (typeof l.id === "string" ? [l.id] : [])));
}

/** Corta texto lido de terceiros para caber no "antes" (limite de 32 KB da proposta). */
export function cortar(valor: unknown, maximo: number): string | null {
  return typeof valor === "string"
    ? valor.length > maximo
      ? valor.slice(0, maximo)
      : valor
    : null;
}

// ─── resultado ──────────────────────────────────────────────────────────────
// (as conferências que mais de uma ferramenta usa ficam logo depois dos tipos)

export type ResultadoDaProposta =
  | {
      ok: true;
      mensagem: string;
      proposta: {
        id: string;
        tipo: TipoDeProposta;
        operacao: string;
        risco: string;
        resumo: string;
        expira_em: string | null;
      };
      avisos?: string[];
    }
  | { ok: false; motivo: "preciso_confirmar"; detalhe: string }
  | { ok: false; motivo: "parametro_invalido"; detalhe: string }
  | { ok: false; motivo: "indisponivel" };

export function precisoConfirmar(detalhe: string): ResultadoDaProposta {
  return { ok: false, motivo: "preciso_confirmar", detalhe: `PRECISO CONFIRMAR: ${detalhe}` };
}

export function parametroInvalido(detalhe: string): ResultadoDaProposta {
  return { ok: false, motivo: "parametro_invalido", detalhe };
}

export const INDISPONIVEL: ResultadoDaProposta = { ok: false, motivo: "indisponivel" };

/** Uma leitura que falhou: 404 não é "fora do ar" (o id não é desta organização), o resto é. */
export function falhaDeLeitura(
  leitura: Extract<Leitura, { ok: false }>,
  oQue: string,
): ResultadoDaProposta {
  if (leitura.status === 404)
    return precisoConfirmar(`${oQue} não foi encontrado(a) nesta organização.`);
  return INDISPONIVEL;
}

// ─── envio ──────────────────────────────────────────────────────────────────

export interface PedidoDeProposta {
  kind: TipoDeProposta;
  payload: unknown;
  resumo: string;
  motivo: string;
  /** O retrato do estado atual; `null` quando é criação. */
  antes: Record<string, unknown> | null;
  /** Avisos honestos para o modelo repassar (ex.: "ainda não há chave deste provedor"). */
  avisos?: string[];
}

/**
 * Parâmetros para propor uma ação (`kind: "acao"`) numa porta de escrita.
 * `antes` é `null` para POST (não há estado anterior a ler).
 */
export interface PedidoDePropostaAcao {
  porta: string;
  metodo: "POST" | "PATCH" | "PUT";
  corpo: unknown;
  resumo: string;
  motivo: string;
  /** Parâmetros de caminho (ex.: { id: "..." } para `contacts/:id`). */
  valores?: Record<string, string>;
  /** `antes` lido pela GET da porta; `null` para POST. */
  antes?: Record<string, unknown> | null;
}

function semAcento(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * PEDIDO EXPRESSO: a pessoa mandou fazer ("ajuste", "teste e publique"), então o cartão
 * só repetiria o que ela acabou de pedir. O modelo cita o trecho EXATO da mensagem dela
 * que manda fazer isto; o servidor confere que o trecho existe na mensagem que a pessoa
 * escreveu NESTE turno (texto de ferramenta, de guia ou de dado não vale) e só então
 * aprova e aplica pelas MESMAS rotas do cartão (mesma permissão de administrador,
 * mesma auditoria, mesmo registro). Sem trecho válido nada muda: fica o cartão.
 */
export function trechoVemDoPedido(trecho: string | undefined, pergunta: string | undefined): boolean {
  if (trecho === undefined || pergunta === undefined) return false;
  const t = semAcento(trecho);
  if (t.length < 6) return false;
  return semAcento(pergunta).includes(t);
}

export type DesfechoDoPedidoExpresso =
  | { aplicada: true; resumo: string }
  | { aplicada: false; motivo: "sem_pedido_expresso" }
  /** `por_que`: o que a rota respondeu (código do destino e status), para o modelo explicar sem adivinhar. */
  | { aplicada: false; motivo: "nao_aplicou"; por_que: string };

function porQueFalhou(corpo: unknown, status: number | null): string {
  const erro =
    typeof corpo === "object" && corpo !== null ? (corpo as { error?: { details?: unknown } }).error : undefined;
  const detalhes =
    erro && typeof erro.details === "object" && erro.details !== null
      ? (erro.details as { codigo_do_destino?: unknown })
      : {};
  const codigo = typeof detalhes.codigo_do_destino === "string" ? detalhes.codigo_do_destino : null;
  return `status ${status ?? "sem resposta"}${codigo === null ? "" : `, código ${codigo}`}`;
}

export async function aplicarPorPedidoExpresso(
  entrada: EntradaDasFerramentas,
  propostaId: string,
  trecho: string | undefined,
): Promise<DesfechoDoPedidoExpresso> {
  if (!trechoVemDoPedido(trecho, entrada.turno?.pergunta)) {
    return { aplicada: false, motivo: "sem_pedido_expresso" };
  }
  const handlerDe = async (qual: "aprovar" | "aplicar"): Promise<HandlerDeRota> => {
    if (sobrepostas?.[qual]) return sobrepostas[qual]!;
    const modulo =
      qual === "aprovar"
        ? await import("@/app/api/v1/ai/assistente/propostas/[id]/aprovar/route")
        : await import("@/app/api/v1/ai/assistente/propostas/[id]/aplicar/route");
    return (req) => modulo.POST(req, { params: Promise.resolve({ id: propostaId }) });
  };
  const base = `${CAMINHOS.propostas}/${propostaId}`;
  const aprovada = await chamarRotaPorDentro(await handlerDe("aprovar"), `${base}/aprovar`, {}, { metodo: "POST" });
  if (!("status" in aprovada) || aprovada.status !== 200) {
    return { aplicada: false, motivo: "nao_aplicou", por_que: "a aprovação foi recusada" };
  }
  const aplicada = await chamarRotaPorDentro(await handlerDe("aplicar"), `${base}/aplicar`, {}, { metodo: "POST" });
  if (!("status" in aplicada) || aplicada.status !== 200) {
    return {
      aplicada: false,
      motivo: "nao_aplicou",
      por_que: porQueFalhou("status" in aplicada ? aplicada.corpo : undefined, "status" in aplicada ? aplicada.status : null),
    };
  }
  const dados = eObjeto(aplicada.corpo) ? (aplicada.corpo as { data?: unknown }).data : undefined;
  const resumo = eObjeto(dados) && typeof dados.resumo === "string" ? dados.resumo : "";
  return { aplicada: true, resumo };
}

/**
 * Propoe uma ação (`kind: "acao"`) numa porta de escrita, via POST de
 * propostas. Usado por `propor_mudanca` e pelo pacote do nicho (T14b).
 * Devolve o `id` da proposta ou `{ ok: false, motivo }`.
 */
export async function proporAcao(
  entrada: EntradaDasFerramentas,
  pedido: PedidoDePropostaAcao,
): Promise<{ ok: true; propostaId: string } | { ok: false; motivo: string }> {
  if (!escritaPermitida(pedido.porta, pedido.metodo)) {
    return { ok: false, motivo: "porta_nao_liberada" };
  }
  if (!acaoPermitida(pedido.porta, pedido.metodo, pedido.corpo)) {
    return { ok: false, motivo: "acao_nao_liberada" };
  }

  const corpo = {
    kind: "acao" as const,
    resumo: pedido.resumo,
    motivo: pedido.motivo,
    antes: pedido.antes ?? null,
    payload: {
      porta: pedido.porta,
      metodo: pedido.metodo,
      ...(pedido.valores !== undefined ? { valores: pedido.valores } : {}),
      ...(pedido.corpo !== undefined ? { corpo: pedido.corpo } : {}),
    },
  };

  const resposta = await chamarRotaPorDentro(
    await FONTES.propostas(),
    CAMINHOS.propostas,
    {},
    { metodo: "POST", corpo },
  );

  if (!("status" in resposta) || (resposta.status !== 200 && resposta.status !== 201)) {
    return { ok: false, motivo: "indisponivel" };
  }

  const dados =
    typeof resposta.corpo === "object" && resposta.corpo !== null
      ? (resposta.corpo as { data?: { id?: string } })
      : undefined;
  const propostaId = dados?.data?.id;
  if (!propostaId) {
    return { ok: false, motivo: "indisponivel" };
  }

  anotarCartaoDeProposta(entrada.coletor, propostaId);
  avisarTelaDaPorta(entrada.coletor, pedido.porta);

  return { ok: true, propostaId };
}

/**
 * Valida com o MESMO esquema da rota, chama o POST de propostas por dentro e
 * devolve o texto honesto: "propôs", nunca "mudou".
 */
export async function enviarProposta(
  entrada: EntradaDasFerramentas,
  pedido: PedidoDeProposta,
): Promise<ResultadoDaProposta> {
  const corpo = {
    kind: pedido.kind,
    resumo: pedido.resumo,
    motivo: pedido.motivo,
    antes: pedido.antes,
    payload: pedido.payload,
    ...(entrada.turno ? { thread_id: entrada.turno.threadId, turn_id: entrada.turno.turnId } : {}),
  };
  const validacao = esquemaDoCorpoDaProposta.safeParse(corpo);
  if (!validacao.success) {
    const motivos = validacao.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "proposta"}: ${i.message}`)
      .join("; ");
    return parametroInvalido(motivos);
  }

  const resposta = await chamarRotaPorDentro(
    await FONTES.propostas(),
    CAMINHOS.propostas,
    {},
    { metodo: "POST", corpo: validacao.data },
  );
  if (!("status" in resposta)) return INDISPONIVEL;
  if (resposta.status === 403) {
    return precisoConfirmar(
      "só um administrador pode mudar a configuração. Diga isso à pessoa e não proponha nada.",
    );
  }
  if (resposta.status === 404 || resposta.status === 422 || resposta.status === 400) {
    return parametroInvalido("a rota de propostas recusou o pedido.");
  }
  if (resposta.status !== 200 && resposta.status !== 201) return INDISPONIVEL;

  const dados = eObjeto(resposta.corpo) ? (resposta.corpo as { data?: unknown }).data : undefined;
  if (!eObjeto(dados) || typeof dados.id !== "string" || typeof dados.resumo !== "string")
    return INDISPONIVEL;
  const operacao =
    typeof dados.operacao === "string"
      ? dados.operacao
      : validacao.data.kind === "acao"
        ? (validacao.data.payload as { metodo: string }).metodo
        : (validacao.data.payload as { operacao: string }).operacao;

  // Mesmo turno e mesmo tipo: a rota devolve a proposta que JÁ existia (idempotência).
  // Se não é a que acabamos de descrever, a nova NÃO foi criada — e dizer o contrário seria mentir.
  if (dados.resumo !== validacao.data.resumo) {
    return precisoConfirmar(
      `neste mesmo turno já existe uma proposta de ${pedido.kind} ("${dados.resumo}", id ${dados.id}); esta nova NÃO foi criada. ` +
        "Peça à pessoa para continuar na próxima mensagem.",
    );
  }

  // O cartão que a conversa mostra: o id vem da ROTA (nunca do modelo) e a
  // tela lê o conteúdo da fila oficial.
  anotarCartaoDeProposta(entrada.coletor, dados.id);

  return {
    ok: true,
    mensagem:
      "Proposta criada, aguardando a aprovação do administrador. NADA foi alterado ainda: " +
      "diga que você PROPÔS a mudança, nunca que ela foi feita.",
    proposta: {
      id: dados.id,
      tipo: pedido.kind,
      operacao,
      risco: riscoDaProposta(pedido.kind, validacao.data.payload),
      resumo: dados.resumo,
      expira_em: typeof dados.expires_at === "string" ? dados.expires_at : null,
    },
    ...(pedido.avisos && pedido.avisos.length > 0 ? { avisos: pedido.avisos } : {}),
  };
}

// ─── conferências compartilhadas ────────────────────────────────────────────

/**
 * Todo agente citado tem de estar na lista de agentes DESTA organização (a rota
 * lista só os não arquivados). Devolve a falha pronta, ou `null` se está tudo certo.
 */
export async function conferirAgentes(ids: readonly string[]): Promise<ResultadoDaProposta | null> {
  if (ids.length === 0) return null;
  const leitura = await ler(await FONTES.agentes(), CAMINHOS.agentes);
  if (!leitura.ok) return INDISPONIVEL;
  const agentes = comoLista(leitura.dados);
  if (agentes === null) return INDISPONIVEL;
  const existentes = idsDe(agentes);
  const faltando = ids.filter((id) => !existentes.has(id));
  if (faltando.length > 0) {
    return precisoConfirmar(
      "um dos agentes citados não aparece na lista de agentes desta organização. Use `listar_agentes` e confirme com a pessoa qual é.",
    );
  }
  return null;
}

/** Campos que a pessoa preencheu e que NÃO valem para a operação pedida (campo solto vira proposta enganosa). */
export function camposForaDaOperacao(
  entrada: Record<string, unknown>,
  permitidos: readonly string[],
  candidatos: readonly string[],
): string[] {
  return candidatos.filter((campo) => entrada[campo] !== undefined && !permitidos.includes(campo));
}
