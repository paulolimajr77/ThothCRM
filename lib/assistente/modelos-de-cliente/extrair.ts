/**
 * Tirar o modelo de uma organização: lê a estrutura dela e devolve o modelo
 * LIMPO, ainda como rascunho.
 *
 * Quem chama é o admin da plataforma (a única pessoa que enxerga mais de uma
 * empresa); por isso a leitura usa o cliente de serviço — e por isso TODA
 * consulta filtra `organization_id` pela organização escolhida, à mão.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { MODELOS_DE_FOLLOWUP } from "@/lib/followup/modelos";

import type { EstruturaDoModelo } from "./estrutura";
import { limparTexto, termosDaOrigem } from "./limpar";

interface Linha {
  [coluna: string]: unknown;
}

export interface LinhasDaOrigem {
  organizacao: { display_name?: unknown; legal_name?: unknown } | null;
  funis: Linha[];
  etapas: Linha[];
  agentes: Linha[];
  versoes: Linha[];
  followups: Linha[];
}

export interface ModeloExtraido {
  estrutura: EstruturaDoModelo;
  /** O que a limpeza trocou e o que ficou de fora — vai para a tela de revisão. */
  avisos: string[];
  /** Os termos do nome da origem: a revisão recusa texto que ainda tenha um deles. */
  termos: string[];
}

const texto = (v: unknown): string => (typeof v === "string" ? v : "");
const numero = (v: unknown): number => (typeof v === "number" ? v : 0);

/** A parte pura: das linhas lidas à estrutura limpa. */
export function montarEstrutura(linhas: LinhasDaOrigem): ModeloExtraido {
  const avisos: string[] = [];
  const nomesDaOrigem = [texto(linhas.organizacao?.display_name), texto(linhas.organizacao?.legal_name)];
  // `onde` usa nome JÁ limpo: o aviso fica guardado no modelo e não pode
  // carregar o nome da empresa de origem.
  const limpar = (onde: string, valor: string): string => {
    const r = limparTexto(valor, nomesDaOrigem);
    for (const aviso of r.avisos) avisos.push(`${onde}: ${aviso}`);
    return r.texto;
  };
  const semAviso = (valor: string): string => limparTexto(valor, nomesDaOrigem).texto;

  const funis = [...linhas.funis]
    .sort((a, b) => numero(a.position) - numero(b.position))
    .slice(0, 10)
    .flatMap((funil) => {
      const nome = limpar(`funil «${semAviso(texto(funil.name))}»`, texto(funil.name)).slice(0, 80);
      const etapas = linhas.etapas
        .filter((e) => e.pipeline_id === funil.id)
        .sort((a, b) => numero(a.position) - numero(b.position))
        .slice(0, 30)
        .map((e) => ({
          nome: limpar(`etapa do funil «${nome}»`, texto(e.name)).slice(0, 60),
          ganho: e.is_won === true,
          perdido: e.is_lost === true,
        }))
        .filter((e) => e.nome.trim() !== "");
      if (nome === "" || etapas.length < 2) {
        avisos.push(`funil «${nome}» ficou de fora: menos de duas etapas`);
        return [];
      }
      return [{ nome, etapas }];
    });

  const agentes = linhas.agentes.slice(0, 10).flatMap((agente) => {
    const versoes = linhas.versoes
      .filter((v) => v.agent_id === agente.id && (v.status === "published" || v.status === "draft"))
      .sort((a, b) => numero(b.version_number) - numero(a.version_number));
    // O texto publicado é o que atende hoje; sem publicado, o rascunho mais novo.
    const versao = versoes.find((v) => v.status === "published") ?? versoes[0];
    const nomeOriginal = texto(agente.name);
    const nomeLimpo = semAviso(nomeOriginal);
    if (!versao || texto(versao.system_prompt).trim() === "") {
      avisos.push(`agente «${nomeLimpo}» ficou de fora: sem texto`);
      return [];
    }
    const nome = limpar(`nome do agente «${nomeLimpo}»`, nomeOriginal).slice(0, 120);
    if (nome.trim() === "") return [];
    return [
      {
        nome,
        descricao: limpar(`descrição do agente «${nome}»`, texto(agente.description)).slice(0, 2000),
        prompt: limpar(`texto do agente «${nome}»`, texto(versao.system_prompt)).slice(0, 20000),
      },
    ];
  });

  // Follow-up só vai pelo id do modelo do catálogo (o ponteiro guarda o nome do modelo).
  // Fluxo desenhado à mão fica de fora: o desenho pode citar etapa, agente e texto da origem.
  const porNome = new Map(MODELOS_DE_FOLLOWUP.map((m) => [m.nome, m.id]));
  const followups: EstruturaDoModelo["followups"] = [];
  for (const ponteiro of linhas.followups) {
    const id = porNome.get(texto(ponteiro.name));
    if (id === undefined) {
      avisos.push("um follow-up feito à mão ficou de fora (só os do catálogo entram)");
      continue;
    }
    if (!followups.some((f) => f.modelo_id === id)) followups.push({ modelo_id: id });
  }

  return {
    estrutura: { funis, agentes, followups: followups.slice(0, 20) },
    avisos,
    termos: termosDaOrigem(nomesDaOrigem),
  };
}

/** Lê a organização `orgId` (só ela) e devolve o modelo limpo. `null` = a leitura falhou. */
export async function extrairModeloDaOrganizacao(
  banco: SupabaseClient,
  orgId: string,
): Promise<ModeloExtraido | null> {
  const [org, funis, etapas, agentes, versoes, followups] = await Promise.all([
    banco.from("organizations").select("display_name, legal_name").eq("id", orgId),
    banco
      .from("crm_pipelines")
      .select("id, name, position")
      .eq("organization_id", orgId)
      .eq("is_archived", false),
    banco
      .from("crm_stages")
      .select("pipeline_id, name, position, is_won, is_lost")
      .eq("organization_id", orgId)
      .eq("is_archived", false),
    banco.from("ai_agents").select("id, name, description").eq("organization_id", orgId),
    banco
      .from("ai_agent_versions")
      .select("agent_id, system_prompt, status, version_number")
      .eq("organization_id", orgId)
      .in("status", ["published", "draft"]),
    banco.from("followup_flow_pointers").select("name").eq("organization_id", orgId),
  ]);
  if (org.error || funis.error || etapas.error || agentes.error || versoes.error || followups.error) {
    return null;
  }
  const organizacao = ((org.data ?? []) as Linha[])[0] ?? null;
  if (organizacao === null) return null;
  return montarEstrutura({
    organizacao,
    funis: (funis.data ?? []) as Linha[],
    etapas: (etapas.data ?? []) as Linha[],
    agentes: (agentes.data ?? []) as Linha[],
    versoes: (versoes.data ?? []) as Linha[],
    followups: (followups.data ?? []) as Linha[],
  });
}
