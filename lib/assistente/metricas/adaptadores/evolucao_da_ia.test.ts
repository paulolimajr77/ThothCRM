// @vitest-environment node
import { describe, expect, it } from "vitest";

import { metricaEvolucaoDaIa, sobreporHandlerDeEvolucaoDaIa } from "@/lib/assistente/metricas";
import { consultarMetrica } from "@/lib/assistente/metricas/registro";
import type { HandlerDeRota } from "@/lib/assistente/metricas/chamar-rota";
import type { ContextoDeConsulta } from "@/lib/assistente/metricas/tipos";

const CTX_MANAGER: ContextoDeConsulta = { orgId: "org-1", papel: "manager", idioma: "pt-BR", fuso: "America/Sao_Paulo", agoraIso: "2026-10-14T09:00:00-03:00", bancoDosModulos: {} as any };

function handlerDe(status: number, corpo: unknown) {
  return (async () => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } })) as any;
}

const payload = () => ({
  range: { from: "2026-10-07", to: "2026-10-14" },
  learned: { memory_entries: 1, proposals_applied: 0, skills_installed: 0, timeline: [{ title: "Cliente X", created_at: "2026-10-10" }] },
  activity: {
    series: { skill_activations: [{ day: "2026-10-08", value: 1 }], router_decisions: [], knowledge_searches: [], knowledge_searches_equipe: [] },
    by_skill: { "__proto__": 1, "busca": 1 },
    by_intent: {},
  },
  outcome: { stage_transitions: 1, won: 1, lost: 0, handoff_rate: 10, cost_cents: 5, messages_received: 0 },
  gaps: { unmapped_agent_steps: [{ pipeline_name: "Funil", steps: ["step1"] }], pipelines_evaluated: 1, knowledge_near_misses: 0, knowledge_empty: 0, router_no_match: 0, router_failed: 0 },
});

describe("evolucao_da_ia", () => {
  it("timeline com título de cliente não sai + handoff null quando messages 0 + aviso", async () => {
    const handler = async (req: any) => new Response(JSON.stringify({ data: payload() }), { status: 200, headers: { "content-type": "application/json" } });
    sobreporHandlerDeEvolucaoDaIa(handler);
    const r = await metricaEvolucaoDaIa.executar(CTX_MANAGER, {});
    expect(r.ok).toBe(true);
    if (r.ok) {
      const texto = JSON.stringify(r.dados);
      expect(texto).not.toContain("Cliente X");
      expect((r.dados as any).outcome.handoff_rate).toBeNull();
      expect(r.avisos.join()).toContain("Sem mensagens de clientes no período");
    }
  });

  it("amostra zero quando tudo zero", async () => {
    const p = payload(); p.learned.memory_entries = 0; p.activity.series.skill_activations = []; p.outcome.cost_cents = 0; p.outcome.stage_transitions = 0; p.outcome.won = 0; p.outcome.lost = 0; p.outcome.messages_received = 0;
    const handler = async () => new Response(JSON.stringify({ data: p }), { status: 200, headers: { "content-type": "application/json" } });
    sobreporHandlerDeEvolucaoDaIa(handler);
    const r = await metricaEvolucaoDaIa.executar(CTX_MANAGER, {});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados).toBeNull();
  });
});