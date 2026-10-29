/**
 * Onde os modelos de cliente moram: `config_client_templates` (migration 8008).
 *
 * A tabela é da INSTALAÇÃO e nenhuma sessão a enxerga (sem grant, RLS sem
 * policy). Toda função aqui recebe o cliente de SERVIÇO — e quem chama tem de
 * ter conferido antes que a pessoa é admin da plataforma (as server actions de
 * `/admin/modelos-de-cliente`) ou que a ferramenta do assistente só lê o
 * modelo revisado para propor na organização DA SESSÃO.
 */
import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { estruturaDoModeloSchema, type EstruturaDoModelo } from "./estrutura";
import { extrairModeloDaOrganizacao } from "./extrair";
import { revisarEstrutura, type ResultadoDaRevisao } from "./revisar";

const TABELA = "config_client_templates";

export interface ResumoDoModelo {
  id: string;
  nome: string;
  nicho: string | null;
  status: "rascunho" | "revisado";
  criado_em: string;
  revisado_em: string | null;
}

export interface ModeloCompleto extends ResumoDoModelo {
  estrutura: EstruturaDoModelo;
  avisos: string[];
  /** Termos do nome da origem — só para o servidor revisar; a tela não os recebe. */
  termos: string[];
}

/** O hash da origem: rastreia de onde veio sem guardar o id da organização. */
export function hashDaOrigem(orgId: string): string {
  return createHash("sha256").update(orgId).digest("hex");
}

const textos = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((a): a is string => typeof a === "string") : [];

function resumo(linha: Record<string, unknown>): ResumoDoModelo {
  return {
    id: String(linha.id),
    nome: String(linha.name),
    nicho: typeof linha.niche === "string" ? linha.niche : null,
    status: linha.status === "revisado" ? "revisado" : "rascunho",
    criado_em: String(linha.created_at),
    revisado_em: typeof linha.reviewed_at === "string" ? linha.reviewed_at : null,
  };
}

export async function listarModelos(
  banco: SupabaseClient,
  opcoes: { soRevisados?: boolean } = {},
): Promise<ResumoDoModelo[] | null> {
  let consulta = banco.from(TABELA).select("id, name, niche, status, created_at, reviewed_at");
  if (opcoes.soRevisados) consulta = consulta.eq("status", "revisado");
  const { data, error } = await consulta.order("created_at", { ascending: false }).limit(100);
  if (error) return null;
  return ((data ?? []) as Record<string, unknown>[]).map(resumo);
}

export async function lerModelo(banco: SupabaseClient, id: string): Promise<ModeloCompleto | null> {
  const { data, error } = await banco
    .from(TABELA)
    .select("id, name, niche, status, created_at, reviewed_at, structure, warnings, source_terms")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const linha = data as Record<string, unknown>;
  const estrutura = estruturaDoModeloSchema.safeParse(linha.structure);
  if (!estrutura.success) return null;
  return {
    ...resumo(linha),
    estrutura: estrutura.data,
    avisos: textos(linha.warnings),
    termos: textos(linha.source_terms),
  };
}

export type ResultadoDeTirarModelo =
  | { ok: true; id: string; avisos: string[] }
  | { ok: false; motivo: "origem_ilegivel" | "gravacao_falhou" };

/** Tira o modelo da organização `orgId` e grava como RASCUNHO (não aplicável). */
export async function tirarModelo(
  banco: SupabaseClient,
  pedido: { orgId: string; nome: string; nicho: string | null; userId: string },
): Promise<ResultadoDeTirarModelo> {
  const extraido = await extrairModeloDaOrganizacao(banco, pedido.orgId);
  if (extraido === null) return { ok: false, motivo: "origem_ilegivel" };
  const { data, error } = await banco
    .from(TABELA)
    .insert({
      name: pedido.nome,
      niche: pedido.nicho,
      status: "rascunho",
      structure: extraido.estrutura,
      warnings: extraido.avisos,
      source_terms: extraido.termos,
      source_hash: hashDaOrigem(pedido.orgId),
      created_by: pedido.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, motivo: "gravacao_falhou" };
  return { ok: true, id: String((data as { id: unknown }).id), avisos: extraido.avisos };
}

export type ResultadoDeSalvarRevisao = ResultadoDaRevisao | { ok: false; motivo: "gravacao_falhou" };

/** Grava o texto revisado e marca `revisado` — só se a revisão passar. */
export async function salvarRevisao(
  banco: SupabaseClient,
  pedido: { id: string; estrutura: unknown; userId: string },
): Promise<ResultadoDeSalvarRevisao> {
  // Os termos vêm do banco, nunca da tela: quem revisa não consegue escapar deles.
  const atual = await lerModelo(banco, pedido.id);
  if (atual === null) return { ok: false, motivo: "gravacao_falhou" };
  const revisao = revisarEstrutura(pedido.estrutura, atual.termos);
  if (!revisao.ok) return revisao;
  const agora = new Date().toISOString();
  const { data, error } = await banco
    .from(TABELA)
    .update({
      structure: revisao.estrutura,
      status: "revisado",
      reviewed_by: pedido.userId,
      reviewed_at: agora,
      updated_at: agora,
    })
    .eq("id", pedido.id)
    .select("id");
  if (error || !data || (data as unknown[]).length === 0) return { ok: false, motivo: "gravacao_falhou" };
  return revisao;
}

/** Apagar o modelo (não toca em nenhuma organização: o modelo é só uma cópia limpa). */
export async function apagarModelo(banco: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await banco.from(TABELA).delete().eq("id", id);
  return !error;
}
