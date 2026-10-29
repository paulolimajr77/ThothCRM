/**
 * Ferramenta `montar_pacote_do_nicho` — PROPÕE (não grava) o agente do nicho
 * como rascunho e os follow-ups escolhidos, numa pedida, a partir do pacote
 * do nicho (T14a). Nada é criado antes do administrador aprovar o cartão.
 *
 * Passos, nesta ordem — parar no primeiro que falhar, e nada é proposto
 * antes de TODAS as checagens 1–4 passarem:
 *   1. nicho sem `esqueleto` → `nicho_sem_prompt` (defesa: hoje os 7 têm prompt);
 *   2. preencher o esqueleto pelos `campos` do nicho → `falta_dado`;
 *   3. nome do agente já existe (inclui arquivados) → `ja_existe`;
 *   4. follow-up pedido fora do nicho → `followup_de_outro_nicho`;
 *   5. monta o corpo do agente com `montarCorpoDoAgenteRascunho` (mesmas
 *      checagens de `criar_rascunho_de_agente`); falha devolve o MESMO
 *      motivo, sem tentar follow-up;
 *   6. cria UMA proposta `acao` para o agente (`POST ai/agents`) e, para cada
 *      follow-up pedido, UMA proposta `acao` (`POST ai/followup-flows/from-model`);
 *      pede etapa → vai para `falta` sem propor; modelo inválido → falha;
 *   7. sucesso devolve o que foi proposto e a lista do que falta — só com o que
 *      existe nos dados do nicho, mais frases curtas de ligação.
 *
 * Nenhum texto de atendimento novo: o prompt vem SÓ do `esqueleto`, e o
 * "falta" vem SÓ dos campos do nicho. Só `admin` pode propor.
 */
import { tool, type Tool } from "ai";
import { z } from "zod";

import { chamarRotaPorDentro, type HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";
import {
  IDS_DE_NICHO,
  NICHOS_DO_ASSISTENTE,
  nichoPorId,
  preencherEsqueleto,
  type IdDeNicho,
  type NichoDoAssistente,
  type OrigemDeCampoDoNicho,
} from "@/lib/assistente/nichos";

import { modeloPorId } from "@/lib/followup/modelos";
import { montarCorpoDoAgenteRascunho, type MotivoDeFalhaAoAlcancarAgente } from "./criar-rascunho-de-agente";
import { proporAcao } from "./proposta-comum";
import { protegida } from "./protegida";
import type { EntradaDasFerramentas } from "./tipos";

const NICHOS = IDS_DE_NICHO as unknown as [IdDeNicho, ...IdDeNicho[]];

/** Enum montado dos `followups.modelos` de TODOS os nichos (hoje só clínica). */
const TODOS_OS_MODELOS_DOS_NICHOS = NICHOS_DO_ASSISTENTE.flatMap((n) => n.followups.modelos) as unknown as [
  string,
  ...string[],
];

const esquemaDeEntrada = z.strictObject({
  nicho: z.enum(NICHOS),
  negocio: z.string().trim().min(1).max(120),
  descricao: z.string().trim().min(1).max(300),
  nome_do_agente: z.string().trim().min(1).max(60),
  followups: z.array(z.enum(TODOS_OS_MODELOS_DOS_NICHOS)).optional(),
});

let listaAgentesSobreposta: HandlerDeRota | null = null;
let listaFollowupsSobreposta: HandlerDeRota | null = null;

/** Só para testes: troca o handler real (que exigiria sessão) por um dublê. */
export function sobreporHandlerDeListaDeAgentes(handler: HandlerDeRota | null): void {
  listaAgentesSobreposta = handler;
}

/** Só para testes: troca o handler real (que exigiria sessão) por um dublê. */
export function sobreporHandlerDeListaDeFollowups(handler: HandlerDeRota | null): void {
  listaFollowupsSobreposta = handler;
}

async function handlerDeListaAgentes(): Promise<HandlerDeRota> {
  if (listaAgentesSobreposta) return listaAgentesSobreposta;
  const modulo = await import("@/app/api/v1/ai/agents/route");
  return modulo.GET;
}

async function handlerDeListaFollowups(): Promise<HandlerDeRota> {
  if (listaFollowupsSobreposta) return listaFollowupsSobreposta;
  const modulo = await import("@/app/api/v1/ai/followup-flows/route");
  return modulo.GET;
}

function eObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object";
}

/** O que a ferramenta passa para o miolo (o nicho já resolvido, dados puros). */
export interface PedidoDePacoteDoNicho {
  nicho: NichoDoAssistente;
  negocio: string;
  descricao: string;
  nomeDoAgente: string;
  followups: string[];
}

export type MotivoDeFalhaAoMontarPacote =
  | "nicho_sem_prompt"
  | "falta_dado"
  | "ja_existe"
  | "followup_de_outro_nicho"
  | MotivoDeFalhaAoAlcancarAgente;

export interface AgentePropostoDoPacote {
  proposta_id: string;
  nome: string;
}

export interface FollowupPropostoDoPacote {
  proposta_id: string;
  modelo: string;
}

export interface AgenteReaproveitado {
  nome: string;
}

export type ResultadoDePacoteDoNicho =
  | {
      ok: true;
      proposto: {
        agente: AgentePropostoDoPacote | null;
        followups: FollowupPropostoDoPacote[];
      };
      reaproveitado: {
        agente: AgenteReaproveitado | null;
        followups: string[];
      };
      falta: string[];
    }
  | { ok: false; motivo: MotivoDeFalhaAoMontarPacote; faltam?: string[]; detalhe?: string };

/** Os nomes de agentes da org (inclui arquivados), ou `null` se a rota falhou. */
export async function nomesDeAgentesDaOrganizacao(): Promise<Set<string> | null> {
  const resposta = await chamarRotaPorDentro(
    await handlerDeListaAgentes(),
    "/api/v1/ai/agents",
    { include_archived: "true" },
  );
  if (!("status" in resposta) || resposta.status !== 200) return null;
  const corpo = eObjeto(resposta.corpo) ? (resposta.corpo as { data?: unknown }).data : undefined;
  if (!Array.isArray(corpo)) return null;
  const nomes = new Set<string>();
  for (const linha of corpo as Record<string, unknown>[]) {
    if (typeof linha.name === "string") nomes.add(linha.name);
  }
  return nomes;
}

/** Os ponteiros de follow-up da org: `{ id, name }`, ou `null` se a rota falhou. */
export async function ponteirosDeFollowupsDaOrganizacao(): Promise<
  | { id: string; name: string }[]
  | null
> {
  const resposta = await chamarRotaPorDentro(await handlerDeListaFollowups(), "/api/v1/ai/followup-flows", {});
  if (!("status" in resposta) || resposta.status !== 200) return null;
  const corpo = eObjeto(resposta.corpo) ? (resposta.corpo as { data?: unknown }).data : undefined;
  if (!Array.isArray(corpo)) return null;
  const ponteiros: { id: string; name: string }[] = [];
  for (const linha of corpo as Record<string, unknown>[]) {
    if (typeof linha.id === "string" && typeof linha.name === "string") {
      ponteiros.push({ id: linha.id, name: linha.name });
    }
  }
  return ponteiros;
}

/** O "falta" — só com o que existe nos dados do nicho, mais ligação curta. */
function montarFalta(
  nicho: NichoDoAssistente,
  propostos: Set<string>,
  falhasDeFollowup: { id: string; motivo: string }[],
  comEtapa: string[],
  agenteReaproveitado: boolean,
  nomeDoAgente?: string,
): string[] {
  const falta: string[] = [];
  if (agenteReaproveitado && nomeDoAgente) {
    falta.push(
      `O agente "${nomeDoAgente}" já existe: revise o texto dele na tela de Agentes em vez de criar outro.`,
    );
  }
  falta.push(
    `Falta: criar o funil "${nicho.funil.nome}" em Funis com as etapas: ${nicho.funil.etapas.join(", ")}`,
  );
  for (const id of nicho.followups.modelos) {
    if (!propostos.has(id)) {
      falta.push(`Falta: instalar o follow-up de modelo "${id}"`);
    }
  }
  for (const id of comEtapa) {
    falta.push(
      `Falta: o follow-up "${id}" dispara por etapa do funil; diga qual etapa para instalar`,
    );
  }
  for (const { id, motivo } of falhasDeFollowup) {
    falta.push(`Falta: o follow-up "${id}" não foi proposto (${motivo})`);
  }
  for (const observacao of nicho.followups.observacoes) {
    falta.push(`Falta: ${observacao}`);
  }
  if (!agenteReaproveitado) {
    falta.push("Falta: publicar o agente (o administrador aprova a proposta no chat)");
  }
  falta.push("Falta: ligar cada follow-up publicado ao agente em Agente › Follow-up");
  falta.push("Falta: conectar canal e conferir a chave de IA: PRECISO CONFIRMAR");
  for (const pergunta of nicho.faq) {
    falta.push(`Falta: perguntar ao dono — ${pergunta}`);
  }
  for (const item of nicho.memoria) {
    falta.push(`Falta: anotar na memória — ${item}`);
  }
  for (const mensagem of nicho.teste) {
    falta.push(`Falta: testar no botão Testar — "${mensagem}"`);
  }
  return falta;
}

/**
 * O miolo de `montar_pacote_do_nicho`, com o nicho já resolvido — exportado
 * para os testes passarem dublê de dados (nicho com marcador fora do mapa).
 * Recebe a `entrada` real das ferramentas (coletor para `anotarCartaoDeProposta`).
 */
export async function montarPacoteDoNicho(
  entrada: EntradaDasFerramentas,
  pedido: PedidoDePacoteDoNicho,
): Promise<ResultadoDePacoteDoNicho> {
  const { nicho, negocio, descricao, nomeDoAgente, followups } = pedido;

  // 1. Sem esqueleto não há prompt para preencher — nada proposto.
  if (nicho.esqueleto === null) {
    return {
      ok: false,
      motivo: "nicho_sem_prompt",
      detalhe:
        "PRECISO CONFIRMAR: o prompt deste nicho ainda não foi escrito. " +
        "Use criar_rascunho_de_agente com o texto que combinarmos.",
    };
  }

  // 2. Preencher pelos `campos` do nicho; marcador sem entrada NÃO é chutado.
  const porOrigem: Record<OrigemDeCampoDoNicho, string> = {
    negocio,
    descricao,
    nome_do_agente: nomeDoAgente,
  };
  const valores: Record<string, string> = {};
  for (const campo of nicho.campos) {
    valores[campo.marcador] = porOrigem[campo.de];
  }
  const preenchido = preencherEsqueleto(nicho.esqueleto, valores);
  if (!preenchido.ok) {
    return {
      ok: false,
      motivo: "falta_dado",
      faltam: preenchido.faltam,
      detalhe:
        "PRECISO CONFIRMAR: falta dado para preencher o prompt do nicho " +
        `(${preenchido.faltam.join(", ")}). Diga os valores para continuar.`,
    };
  }

  // 3. Nome duplicado: reaproveita o agente existente em vez de falhar.
  const nomesAgentes = await nomesDeAgentesDaOrganizacao();
  if (nomesAgentes === null) return { ok: false, motivo: "indisponivel" };
  const agenteJaExiste = nomesAgentes.has(nomeDoAgente);

  // 4. Follow-up pedido fora do nicho — nada proposto.
  const doNicho = new Set(nicho.followups.modelos);
  if (!followups.every((id) => doNicho.has(id))) {
    return { ok: false, motivo: "followup_de_outro_nicho" };
  }

  // 5. Ler a lista de follow-ups da org para reaproveitar os já instalados.
  //    Lista ilegível → indisponível (mesma régua da lista de agentes).
  const ponteirosFollowups = await ponteirosDeFollowupsDaOrganizacao();
  if (ponteirosFollowups === null) return { ok: false, motivo: "indisponivel" };
  const nomesFollowupsExistentes = new Set(
    ponteirosFollowups.map((p) => p.name),
  );

  // 6. Montar o corpo do agente (só se não existir); falha devolve o MESMO motivo.
  let propostaAgente: { propostaId: string } | null = null;
  if (!agenteJaExiste) {
    const montagem = await montarCorpoDoAgenteRascunho({
      nome: nomeDoAgente,
      descricao,
      prompt: preenchido.texto,
      pacotes: [...nicho.pacotes],
      funis: [],
      materiais: [],
      propostasComerciais: nicho.propostasComerciais,
    });
    if (!montagem.ok) {
      return montagem.detalhe === undefined
        ? { ok: false, motivo: montagem.motivo }
        : { ok: false, motivo: montagem.motivo, detalhe: montagem.detalhe };
    }

    const resumoAgente = `Criar o agente "${nomeDoAgente}" em rascunho (${nicho.nome})`;
    const motivoAgente =
      "Pedido no chat do assistente; nada é publicado e ninguém é atendido até o administrador aprovar o cartão.";
    const proposta = await proporAcao(entrada, {
      porta: "ai/agents",
      metodo: "POST",
      corpo: montagem.corpo,
      resumo: resumoAgente,
      motivo: motivoAgente,
    });
    if (!proposta.ok) {
      return { ok: false, motivo: "indisponivel" };
    }
    propostaAgente = { propostaId: proposta.propostaId };
  }

  // 7. Para cada follow-up pedido: já instalado → reaproveitar (não propor);
  //    pede etapa → falta sem propor; modelo inválido → falha;
  //    senão UMA proposta `acao` (`POST ai/followup-flows/from-model`).
  const propostos: FollowupPropostoDoPacote[] = [];
  const propostosIds = new Set<string>();
  const reaproveitados: string[] = [];
  const falhasDeFollowup: { id: string; motivo: string }[] = [];
  const comEtapa: string[] = [];
  for (const id of followups) {
    const modelo = modeloPorId(id);
    if (!modelo) {
      falhasDeFollowup.push({ id, motivo: "pedido_invalido" });
      continue;
    }
    if (modelo.pedeEtapa) {
      comEtapa.push(id);
      continue;
    }
    const jaInstalado = nomesFollowupsExistentes.has(modelo.nome);
    if (jaInstalado) {
      reaproveitados.push(id);
      continue;
    }
    const proposta = await proporAcao(entrada, {
      porta: "ai/followup-flows/from-model",
      metodo: "POST",
      corpo: { model_id: id },
      resumo: `Instalar o follow-up "${id}" como rascunho`,
      motivo: "Pedido no chat do assistente; nada é publicado até o administrador aprovar o cartão.",
    });
    if (proposta.ok) {
      propostos.push({ proposta_id: proposta.propostaId, modelo: id });
      propostosIds.add(id);
    } else {
      falhasDeFollowup.push({ id, motivo: "indisponivel" });
    }
  }

  // 8. O que foi proposto, o que foi reaproveitado e o que falta.
  return {
    ok: true,
    proposto: {
      agente: propostaAgente
        ? { proposta_id: propostaAgente.propostaId, nome: nomeDoAgente }
        : null,
      followups: propostos,
    },
    reaproveitado: {
      agente: agenteJaExiste ? { nome: nomeDoAgente } : null,
      followups: reaproveitados,
    },
    falta: montarFalta(
      nicho,
      propostosIds,
      falhasDeFollowup,
      comEtapa,
      agenteJaExiste,
      nomeDoAgente,
    ),
  };
}

export function criarMontarPacoteDoNicho(entrada: EntradaDasFerramentas): Tool {
  return tool({
    description:
      "ISTO NÃO MONTA O NEGÓCIO INTEIRO: cobre só o agente e os follow-ups de catálogo. Funil, campos, motivos, memória, texto do agente e o resto você propõe, por partes e com o dono de acordo a cada parte, com propor_mudanca, seguindo o guia assistente-montar-negocio (que exige antes a fonte de conhecimento da empresa); 'sem modelo pronto' nunca é motivo para pular um item. PROPÕE o agente do nicho como rascunho e os follow-ups escolhidos; nada é criado até o administrador aprovar o cartão no chat. Nada publica, nada liga follow-up a agente, nada cria funil, nada apaga. Se o agente de mesmo nome já existe, não propõe o agente de novo e segue com os follow-ups. Se um follow-up do mesmo modelo já está instalado, não propõe de novo. `nicho` (os 7 têm prompt: clínica, imobiliária, serviços, infoproduto, loja, advocacia e genérico), `negocio` (nome do " +
      "negócio), `descricao` (o que faz, em uma frase), `nome_do_agente` e `followups` (ids de " +
      "modelo DESTE nicho, opcionais).",
    inputSchema: esquemaDeEntrada,
    execute: protegida("montar_pacote_do_nicho", esquemaDeEntrada, async ({ nicho, negocio, descricao, nome_do_agente, followups }) => {
      const dados = nichoPorId(nicho);
      if (!dados) return { ok: false as const, motivo: "pedido_invalido" as const };
      return montarPacoteDoNicho(entrada, {
        nicho: dados,
        negocio,
        descricao,
        nomeDoAgente: nome_do_agente,
        followups: followups ?? [],
      });
    }),
  });
}
