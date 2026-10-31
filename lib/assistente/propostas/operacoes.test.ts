/**
 * O mapa (tipo, operação) → destino (T19): escrito no código, em paridade
 * exata com o que `payload.ts` aceita, e com o risco decidido por tipo.
 */
// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  DESTINO_DAS_OPERACOES,
  destinoDaOperacao,
  RISCO_POR_TIPO,
  riscoDaProposta,
  riscoDoTipo,
} from "./operacoes";
import { ESCRITA_PERMITIDA } from "@/lib/assistente/portas/listas";
import { OPERACOES_ACEITAS } from "./payload";
import { RISCOS_DA_PROPOSTA, TIPOS_DE_PROPOSTA } from "./tipos";

describe("DESTINO_DAS_OPERACOES", () => {
  it("todo (tipo, operação) aceito pelo payload tem destino — e todo destino tem operação aceita", () => {
    // Sabotagem: apagar uma entrada do mapa (ex.: `alterar_etapa`) → o primeiro laço fica
    // vermelho; acrescentar uma entrada sem operação correspondente no payload → o segundo.
    for (const tipo of TIPOS_DE_PROPOSTA) {
      for (const operacao of OPERACOES_ACEITAS[tipo]) {
        expect(destinoDaOperacao(tipo, operacao), `${tipo}/${operacao} sem destino`).not.toBeNull();
      }
      expect(Object.keys(DESTINO_DAS_OPERACOES[tipo]).sort(), tipo).toEqual([...OPERACOES_ACEITAS[tipo]].sort());
    }
    expect(Object.keys(DESTINO_DAS_OPERACOES).sort()).toEqual([...TIPOS_DE_PROPOSTA].sort());
  });

  it("combinação que não existe não tem destino (nem por herança de protótipo)", () => {
    expect(destinoDaOperacao("roteador", "apagar")).toBeNull();
    expect(destinoDaOperacao("memoria", "criar_funil")).toBeNull();
    expect(destinoDaOperacao("memoria", "constructor")).toBeNull();
    expect(destinoDaOperacao("memoria", "__proto__")).toBeNull();
  });

  it("nenhum destino apaga: nem DELETE, nem operação de exclusão", () => {
    for (const tipo of TIPOS_DE_PROPOSTA) {
      for (const [operacao, destino] of Object.entries(DESTINO_DAS_OPERACOES[tipo])) {
        expect(["POST", "PATCH", "PUT"], `${tipo}/${operacao}`).toContain(destino.metodo);
        expect(operacao).not.toMatch(/apagar|excluir|delete|remover/);
      }
    }
  });

  it("toda rota é uma rota de /api/v1 e os marcadores são só os ids do payload", () => {
    const marcadoresPermitidos = new Set(["router_id", "entry_id", "pipeline_id", "stage_id"]);
    for (const tipo of TIPOS_DE_PROPOSTA) {
      for (const [operacao, destino] of Object.entries(DESTINO_DAS_OPERACOES[tipo])) {
        expect(destino.rota, `${tipo}/${operacao}`).toMatch(/^\/api\/v1\//);
        for (const [, marcador] of destino.rota.matchAll(/\{([a-z_]+)\}/g)) {
          expect(marcadoresPermitidos.has(marcador!), `${tipo}/${operacao}: {${marcador}}`).toBe(true);
        }
        expect(destino.descricao.length).toBeGreaterThan(10);
      }
    }
  });

  it("nenhum destino exige mais do que o administrador (todas as propostas são aplicadas por admin)", () => {
    for (const tipo of TIPOS_DE_PROPOSTA) {
      for (const destino of Object.values(DESTINO_DAS_OPERACOES[tipo])) {
        expect(["manager", "admin"]).toContain(destino.papelMinimoDaRota);
      }
    }
  });

  it("os destinos medidos nas rotas existentes", () => {
    expect(destinoDaOperacao("roteador", "criar")).toMatchObject({ metodo: "POST", rota: "/api/v1/ai/routers" });
    expect(destinoDaOperacao("roteador", "alterar")).toMatchObject({ metodo: "PATCH", rota: "/api/v1/ai/routers/{router_id}" });
    expect(destinoDaOperacao("roteador", "membros")).toMatchObject({ metodo: "PUT", rota: "/api/v1/ai/routers/{router_id}/members" });
    expect(destinoDaOperacao("conhecimento", "criar")).toMatchObject({ metodo: "POST", rota: "/api/v1/ai/knowledge/sources" });
    expect(destinoDaOperacao("memoria", "criar")).toMatchObject({ metodo: "POST", rota: "/api/v1/ai/memory/entries" });
    expect(destinoDaOperacao("memoria", "arquivar")).toMatchObject({ metodo: "PATCH", rota: "/api/v1/ai/memory/entries/{entry_id}" });
    expect(destinoDaOperacao("modelo_auxiliares", "definir_ponto")).toMatchObject({ metodo: "PUT", rota: "/api/v1/ai/providers" });
    expect(destinoDaOperacao("modelo_auxiliares", "definir_padrao")).toMatchObject({ metodo: "PATCH", rota: "/api/v1/ai/providers" });
    expect(destinoDaOperacao("funil", "criar_funil")).toMatchObject({ metodo: "POST", rota: "/api/v1/pipelines" });
    expect(destinoDaOperacao("funil", "criar_etapa")).toMatchObject({ metodo: "POST", rota: "/api/v1/pipelines/{pipeline_id}/stages" });
    expect(destinoDaOperacao("funil", "alterar_etapa")).toMatchObject({
      metodo: "PATCH",
      rota: "/api/v1/pipelines/{pipeline_id}/stages/{stage_id}",
    });
  });
});

describe("risco por tipo", () => {
  it("é o da tabela da T19 e só usa valores de tipos.ts", () => {
    // Sabotagem: trocar `roteador: "atencao"` por "seguro" em operacoes.ts → este expect fica vermelho.
    expect(RISCO_POR_TIPO).toEqual({
      roteador: "atencao",
      conhecimento: "seguro",
      memoria: "seguro",
      modelo_auxiliares: "atencao",
      funil: "atencao",
      acao: "atencao",
    });
    expect(Object.keys(RISCO_POR_TIPO).sort()).toEqual([...TIPOS_DE_PROPOSTA].sort());
    for (const tipo of TIPOS_DE_PROPOSTA) {
      expect(RISCOS_DA_PROPOSTA).toContain(riscoDoTipo(tipo));
    }
  });

  it("`critico` não existe como risco: não há ferramenta de proposta para ele", () => {
    expect(RISCOS_DA_PROPOSTA as readonly string[]).not.toContain("critico");
    expect(Object.values(RISCO_POR_TIPO)).not.toContain("critico");
  });
});

// Medido no espelho (29/10/2026): "guarde na memória" virou `acao` e todo `acao` era
// de atenção — o lote "Aplicar as mudanças seguras" nunca aparecia.
describe("riscoDaProposta — o risco da ação sai da porta, numa lista fechada", () => {
  it("memória, material de conhecimento e tarefa (POST) são seguros", () => {
    expect(riscoDaProposta("acao", { porta: "ai/memory", metodo: "POST" })).toBe("seguro");
    expect(riscoDaProposta("acao", { porta: "ai/knowledge/sources", metodo: "POST" })).toBe("seguro");
    expect(riscoDaProposta("acao", { porta: "tasks", metodo: "POST" })).toBe("seguro");
  });

  it("o resto da lista, porta fora dela e payload torto são de atenção", () => {
    expect(riscoDaProposta("acao", { porta: "ai/routers", metodo: "POST" })).toBe("atencao");
    expect(riscoDaProposta("acao", { porta: "ai/agents/:id/publish", metodo: "POST" })).toBe("atencao");
    expect(riscoDaProposta("acao", { porta: "ai/memory", metodo: "PATCH" })).toBe("atencao");
    expect(riscoDaProposta("acao", { porta: "inventada", metodo: "POST" })).toBe("atencao");
    expect(riscoDaProposta("acao", null)).toBe("atencao");
  });

  it("os outros tipos seguem a tabela por tipo", () => {
    expect(riscoDaProposta("memoria", { porta: "ai/routers", metodo: "POST" })).toBe(RISCO_POR_TIPO.memoria);
    expect(riscoDaProposta("roteador", { porta: "ai/memory", metodo: "POST" })).toBe(RISCO_POR_TIPO.roteador);
  });

  it("só 3 portas são seguras — aumentar a lista é decisão, não acidente", () => {
    expect(ESCRITA_PERMITIDA.filter((e) => e.risco === "seguro").map((e) => `${e.metodo} ${e.porta}`).sort()).toEqual([
      "POST ai/knowledge/sources",
      "POST ai/memory",
      "POST tasks",
    ]);
  });

  it("externo: true nunca combina com risco: seguro", () => {
    for (const e of ESCRITA_PERMITIDA) {
      if (e.externo === true) {
        expect(e.risco).not.toBe("seguro");
      }
    }
  });

  it("riscoDaProposta devolve atenção para toda porta externo", () => {
    const externos = ESCRITA_PERMITIDA.filter((e) => e.externo === true);
    for (const e of externos) {
      expect(riscoDaProposta("acao", { porta: e.porta, metodo: e.metodo })).toBe("atencao");
    }
  });
});
