/**
 * `listar_modelos_de_cliente` e `aplicar_modelo_de_cliente` — o modelo tirado
 * de um cliente real, aplicado na organização DA SESSÃO.
 *
 * Só existem para quem é admin da organização E admin pleno da plataforma
 * (`index.ts` não as entrega a mais ninguém). Só o modelo `revisado` se
 * aplica, e a revisão roda de novo aqui antes de propor (defesa em
 * profundidade: um modelo editado direto no banco não passa).
 *
 * Aplicar = PROPOR, como o pacote do nicho: um cartão por funil, por agente
 * (rascunho) e por follow-up, que o administrador aprova. Nada apaga e nada
 * duplica: funil, agente ou follow-up de mesmo nome já existente é
 * reaproveitado. `{{negocio}}` vira o nome do negócio de destino.
 *
 * O isolamento: a estrutura não tem campo para dado de cliente (ver
 * `estrutura.ts`), a organização de destino vem do contexto (nunca do modelo)
 * e as propostas passam pela mesma rota de sempre, gravadas na organização
 * da sessão.
 */
import { tool, type Tool } from "ai";
import { z } from "zod";

import { chamarRotaPorDentro, type HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";
import { MARCADOR_DO_NEGOCIO } from "@/lib/assistente/modelos-de-cliente/limpar";
import { lerModelo, listarModelos } from "@/lib/assistente/modelos-de-cliente/repositorio";
import { revisarEstrutura } from "@/lib/assistente/modelos-de-cliente/revisar";
import { modeloPorId } from "@/lib/followup/modelos";
import { chaveDeNome } from "@/lib/leads/stage-editing";

import { montarCorpoDoAgenteRascunho, type CorpoDoAgenteRascunho } from "./criar-rascunho-de-agente";
import { nomesDeAgentesDaOrganizacao, ponteirosDeFollowupsDaOrganizacao } from "./montar-pacote-do-nicho";
import { proporAcao } from "./proposta-comum";
import { protegida } from "./protegida";
import type { EntradaDasFerramentas } from "./tipos";

let listaFunisSobreposta: HandlerDeRota | null = null;

/** Só para testes: troca o handler real (que exigiria sessão) por um dublê. */
export function sobreporHandlerDeListaDeFunis(handler: HandlerDeRota | null): void {
  listaFunisSobreposta = handler;
}

async function handlerDeListaFunis(): Promise<HandlerDeRota> {
  if (listaFunisSobreposta) return listaFunisSobreposta;
  const modulo = await import("@/app/api/v1/pipelines/route");
  return modulo.GET;
}

/** As chaves dos nomes dos funis ativos da organização, ou `null` se a rota falhou. */
async function chavesDosFunisDaOrganizacao(): Promise<Set<string> | null> {
  const resposta = await chamarRotaPorDentro(await handlerDeListaFunis(), "/api/v1/pipelines", {});
  if (!("status" in resposta) || resposta.status !== 200) return null;
  const corpo =
    resposta.corpo !== null && typeof resposta.corpo === "object"
      ? (resposta.corpo as { data?: unknown }).data
      : undefined;
  if (!Array.isArray(corpo)) return null;
  const chaves = new Set<string>();
  for (const linha of corpo as Record<string, unknown>[]) {
    if (typeof linha.name === "string") chaves.add(chaveDeNome(linha.name));
  }
  return chaves;
}

const MARCADOR_SOLTO = /\{\{[a-z_]+\}\}/g;

export type ResultadoDeAplicarModelo =
  | {
      ok: true;
      proposto: { funis: string[]; agentes: string[]; followups: string[] };
      reaproveitado: { funis: string[]; agentes: string[]; followups: string[] };
      falta: string[];
    }
  | { ok: false; motivo: "nao_encontrado" | "nao_revisado" | "indisponivel"; detalhe?: string }
  | { ok: false; motivo: string; detalhe?: string };

export async function aplicarModeloDeCliente(
  entrada: EntradaDasFerramentas,
  pedido: { modeloId: string; negocio: string },
): Promise<ResultadoDeAplicarModelo> {
  const banco = entrada.ctx.bancoDaInstalacao;
  if (!banco) return { ok: false, motivo: "indisponivel" };
  const modelo = await lerModelo(banco, pedido.modeloId);
  if (modelo === null) return { ok: false, motivo: "nao_encontrado" };
  if (modelo.status !== "revisado") {
    return { ok: false, motivo: "nao_revisado", detalhe: "O modelo ainda não foi revisado na tela de Modelos de cliente." };
  }
  const revisao = revisarEstrutura(modelo.estrutura, modelo.termos);
  if (!revisao.ok) return { ok: false, motivo: "nao_revisado", detalhe: "O texto do modelo não passa na revisão." };
  const { funis, agentes, followups } = revisao.estrutura;

  const [chavesDosFunis, nomesDosAgentes, ponteiros] = await Promise.all([
    chavesDosFunisDaOrganizacao(),
    nomesDeAgentesDaOrganizacao(),
    ponteirosDeFollowupsDaOrganizacao(),
  ]);
  if (chavesDosFunis === null || nomesDosAgentes === null || ponteiros === null) {
    return { ok: false, motivo: "indisponivel" };
  }
  const nomesDosFollowups = new Set(ponteiros.map((p) => p.name));
  const preencher = (texto: string) => texto.split(MARCADOR_DO_NEGOCIO).join(pedido.negocio);

  const proposto = { funis: [] as string[], agentes: [] as string[], followups: [] as string[] };
  const reaproveitado = { funis: [] as string[], agentes: [] as string[], followups: [] as string[] };
  const falta: string[] = [];

  // Os corpos dos agentes ANTES de qualquer proposta: sem credencial ou sem
  // modelo padrão, nada é proposto (não fica meio modelo na fila).
  const corposDosAgentes: { nome: string; corpo: CorpoDoAgenteRascunho }[] = [];
  for (const agente of agentes) {
    const nome = preencher(agente.nome).slice(0, 120);
    if (nomesDosAgentes.has(nome)) {
      reaproveitado.agentes.push(nome);
      continue;
    }
    const prompt = preencher(agente.prompt);
    const montagem = await montarCorpoDoAgenteRascunho({
      nome,
      descricao: preencher(agente.descricao) || undefined,
      prompt,
      funis: [],
      materiais: [],
    });
    if (!montagem.ok) {
      return montagem.detalhe === undefined
        ? { ok: false, motivo: montagem.motivo }
        : { ok: false, motivo: montagem.motivo, detalhe: montagem.detalhe };
    }
    corposDosAgentes.push({ nome, corpo: montagem.corpo });
    const soltos = [...new Set(prompt.match(MARCADOR_SOLTO) ?? [])];
    if (soltos.length > 0) {
      falta.push(`Falta: o texto do agente «${nome}» tem ${soltos.join(", ")} sem valor — edite antes de publicar.`);
    }
  }

  const motivo = `Modelo de cliente «${modelo.nome}», pedido no chat do assistente; nada é publicado até o administrador aprovar o cartão.`;

  for (const funil of funis) {
    const nome = preencher(funil.nome).slice(0, 80);
    if (chavesDosFunis.has(chaveDeNome(nome))) {
      reaproveitado.funis.push(nome);
      continue;
    }
    const proposta = await proporAcao(entrada, {
      porta: "pipelines",
      metodo: "POST",
      corpo: {
        name: nome,
        stages: funil.etapas.map((e) => ({
          name: preencher(e.nome).slice(0, 60),
          ...(e.ganho ? { is_won: true } : {}),
          ...(e.perdido ? { is_lost: true } : {}),
        })),
      },
      resumo: `Criar o funil "${nome}" com ${funil.etapas.length} etapas`,
      motivo,
    });
    if (!proposta.ok) return { ok: false, motivo: "indisponivel" };
    proposto.funis.push(nome);
  }

  for (const { nome, corpo } of corposDosAgentes) {
    const proposta = await proporAcao(entrada, {
      porta: "ai/agents",
      metodo: "POST",
      corpo,
      resumo: `Criar o agente "${nome}" em rascunho`,
      motivo,
    });
    if (!proposta.ok) return { ok: false, motivo: "indisponivel" };
    proposto.agentes.push(nome);
  }

  for (const { modelo_id: id } of followups) {
    const doCatalogo = modeloPorId(id);
    if (!doCatalogo) continue;
    if (nomesDosFollowups.has(doCatalogo.nome)) {
      reaproveitado.followups.push(id);
      continue;
    }
    if (doCatalogo.pedeEtapa) {
      falta.push(`Falta: o follow-up "${id}" dispara por etapa do funil; diga qual etapa para instalar`);
      continue;
    }
    const proposta = await proporAcao(entrada, {
      porta: "ai/followup-flows/from-model",
      metodo: "POST",
      corpo: { model_id: id },
      resumo: `Instalar o follow-up "${id}" como rascunho`,
      motivo,
    });
    if (!proposta.ok) return { ok: false, motivo: "indisponivel" };
    proposto.followups.push(id);
  }

  if (proposto.agentes.length > 0) falta.push("Falta: publicar os agentes depois de revisar o texto na tela de Agentes");
  falta.push("Falta: conectar o canal, cadastrar os materiais e a memória desta empresa — o modelo não leva dado de cliente");
  return { ok: true, proposto, reaproveitado, falta };
}

const esquemaDeAplicar = z.strictObject({
  modelo_id: z.string().uuid(),
  negocio: z.string().trim().min(1).max(120),
});

const esquemaDeListar = z.strictObject({});

export function criarListarModelosDeCliente(entrada: EntradaDasFerramentas): Tool {
  return tool({
    description:
      "Lista os modelos de cliente REVISADOS (estrutura tirada de um cliente real: funis, agentes e follow-ups, sem dado de cliente). Devolve id, nome e nicho de cada um.",
    inputSchema: esquemaDeListar,
    execute: protegida("listar_modelos_de_cliente", esquemaDeListar, async () => {
      const banco = entrada.ctx.bancoDaInstalacao;
      if (!banco) return { ok: false as const, motivo: "indisponivel" as const };
      const modelos = await listarModelos(banco, { soRevisados: true });
      if (modelos === null) return { ok: false as const, motivo: "indisponivel" as const };
      return { ok: true as const, modelos: modelos.map(({ id, nome, nicho }) => ({ id, nome, nicho })) };
    }),
  });
}

export function criarAplicarModeloDeCliente(entrada: EntradaDasFerramentas): Tool {
  return tool({
    description:
      "PROPÕE nesta empresa a estrutura de um modelo de cliente revisado: um cartão por funil (com as etapas), por agente (rascunho) e por follow-up; nada é criado até o administrador aprovar. Reaproveita o que já existe com o mesmo nome e nunca apaga. `modelo_id` vem de listar_modelos_de_cliente; `negocio` é o nome desta empresa (entra no lugar de {{negocio}} no texto).",
    inputSchema: esquemaDeAplicar,
    execute: protegida("aplicar_modelo_de_cliente", esquemaDeAplicar, ({ modelo_id, negocio }) =>
      aplicarModeloDeCliente(entrada, { modeloId: modelo_id, negocio }),
    ),
  });
}
