/**
 * Consultas de `propostas_aceitas_por_produto` — [deInstante, ateInstanteExclusivo).
 */
import { describe, expect, it } from "vitest";

import { criarBancoFalso } from "./banco-falso";
import { lerPropostasAceitasPorProduto } from "./propostas-por-produto";
import { resolverPeriodo } from "@/lib/assistente/metricas/periodo";

const ORG = "00000000-0000-0000-0000-000000000099";
const JANELA = resolverPeriodo({ tipo: "semana_passada" }, "2026-10-14T09:00:00-03:00", "America/Sao_Paulo", "pt-BR");

describe("lerPropostasAceitasPorProduto", () => {
  it("grupo por (produto, moeda) e valor com desconto travado em zero", async () => {
    const banco = criarBancoFalso({
      crm_proposals: [
        {
          id: "proposta-1",
          organization_id: ORG,
          status: "aceita",
          moeda: "BRL",
          decided_at: "2026-10-06",
          crm_proposal_items: [
            { product_id: "prod-1", quantidade: 2, preco_unitario_cents: 5000, desconto_cents: 1000 },
            { product_id: "prod-1", quantidade: 1, preco_unitario_cents: 5000, desconto_cents: 12000 },
          ],
        },
      ],
      catalog_products: [
        { id: "prod-1", nome: "Consultoria", organization_id: ORG },
      ],
    });
    const r = await lerPropostasAceitasPorProduto(banco.client, ORG, JANELA);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("ok");
    const linha = r.dados.por_produto.find((p) => p.produto === "Consultoria");
    expect(linha).toBeDefined();
    expect(linha?.quantidade).toBe(3);
    expect(linha?.valor_proposto_cents).toBe(2 * (2 * 5000 - 1000) + Math.max(0, 1 * 5000 - 12000));
  });
  it("zero aceitas → ok com valores zero (sem erro)", async () => {
    const banco = criarBancoFalso({ crm_proposals: [], catalog_products: [] });
    const r = await lerPropostasAceitasPorProduto(banco.client, ORG, JANELA);
    expect(r.ok).toBe(true);
  });
});
