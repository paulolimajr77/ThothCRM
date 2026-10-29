/**
 * `criar_rascunho_de_agente` — montagem do corpo do rascunho, incluindo o
 * interruptor `propostasComerciais` por nicho.
 */
import { afterEach, describe, expect, it } from "vitest";

import type { HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";

import {
  montarCorpoDoAgenteRascunho,
  sobreporHandlersDeCriacao,
  type PedidoDeAgenteRascunho,
} from "./criar-rascunho-de-agente";

function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const PROVEDORES_OK = {
  padrao: { provider: "anthropic", defaultModel: "claude-sonnet-4-6" },
  credenciais: [
    {
      id: "cred-1",
      provider: "anthropic",
      label: "Chave da empresa",
      validated_at: "2026-10-01T00:00:00Z",
      is_active: true,
    },
  ],
};

const PEDIDO_BASE: PedidoDeAgenteRascunho = {
  nome: "Agente Teste",
  descricao: "faz coisas boas",
  prompt: "Você é um atendente simpático e ajuda o cliente.",
  pacotes: ["vender"],
};

function ligarProvedores(opcoes: { provedores?: unknown }): void {
  const hProvedores: HandlerDeRota = async () =>
    respostaJson(200, { data: opcoes.provedores ?? PROVEDORES_OK });
  const hFunis: HandlerDeRota = async () => respostaJson(200, { data: [] });
  const hMateriais: HandlerDeRota = async () => respostaJson(200, { data: [] });
  sobreporHandlersDeCriacao({
    provedores: hProvedores,
    funis: hFunis,
    materiais: hMateriais,
    agentesPost: async () =>
      respostaJson(201, {
        data: { agent: { id: "ag-1", name: "X" }, version: { id: "v1", status: "draft" } },
      }),
  });
}

describe("montarCorpoDoAgenteRascunho — propostasComerciais por nicho", () => {
  afterEach(() => {
    sobreporHandlersDeCriacao(null);
  });

  it("clinica (propostasComerciais false): corpo tem proposal_ai_draft_enabled === false", async () => {
    ligarProvedores({ provedores: PROVEDORES_OK });
    const r = await montarCorpoDoAgenteRascunho({
      ...PEDIDO_BASE,
      propostasComerciais: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("ok");
    expect(r.corpo.version.proposal_ai_draft_enabled).toBe(false);
  });

  it("imobiliaria (propostasComerciais true): corpo tem proposal_ai_draft_enabled === true", async () => {
    ligarProvedores({ provedores: PROVEDORES_OK });
    const r = await montarCorpoDoAgenteRascunho({
      ...PEDIDO_BASE,
      propostasComerciais: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("ok");
    expect(r.corpo.version.proposal_ai_draft_enabled).toBe(true);
  });

  it("sem o campo propostasComerciais: corpo NÃO tem a chave (usa o default do esquema)", async () => {
    ligarProvedores({ provedores: PROVEDORES_OK });
    const r = await montarCorpoDoAgenteRascunho({
      ...PEDIDO_BASE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("ok");
    expect("proposal_ai_draft_enabled" in r.corpo.version).toBe(false);
  });
});
