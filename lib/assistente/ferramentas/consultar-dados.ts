/**
 * Ferramentas `dicionario_de_dados` e `consultar_dados` — a análise LIVRE dos dados da organização.
 *
 * O agente escreve o SQL (só leitura) e recebe o resultado da conta, sem depender de uma métrica
 * pronta. A cerca está em `lib/assistente/consulta-livre/`: papel `authenticated` + RLS, visões
 * temporárias só da organização ATIVA e sem colunas de segredo, tempo máximo e 200 linhas devolvidas.
 *
 * Só para gerente e administrador. Organização e usuário vêm da sessão (a rota do chat): o esquema
 * desta ferramenta só aceita o texto do SQL e uma palavra de busca — nunca organização nem usuário.
 */
import { tool, type Tool } from "ai";
import { z } from "zod";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { dicionarioDeDados, executarConsultaLivre } from "@/lib/assistente/consulta-livre/executar";

import { protegida } from "./protegida";
import type { EntradaDasFerramentas } from "./tipos";

const MAXIMO_DE_TABELAS_NA_BUSCA = 25;

const esquemaDoDicionario = z.strictObject({ busca: z.string().trim().max(60).optional() });
const esquemaDaConsulta = z.strictObject({ sql: z.string().min(6).max(6000) });

export function criarDicionarioDeDados(entrada: EntradaDasFerramentas): Tool {
  return tool({
    description:
      "O DICIONÁRIO dos dados que `consultar_dados` enxerga: sem `busca`, a lista de tabelas; com `busca` " +
      "(parte do nome da tabela ou da coluna, ex.: 'lead', 'valor', 'campanha'), as colunas e tipos das " +
      "tabelas que casam. Use ANTES de escrever o SQL, para não chutar nome de tabela ou coluna.",
    inputSchema: esquemaDoDicionario,
    execute: protegida("dicionario_de_dados", esquemaDoDicionario, async ({ busca }) => {
      void entrada;
      const todas = await dicionarioDeDados(getRequestPool());
      if (busca === undefined || busca === "") {
        return { ok: true as const, tabelas: todas.map((t) => t.nome) };
      }
      const termo = busca.toLowerCase();
      const casam = todas.filter((t) => t.nome.includes(termo) || t.colunas.some((c) => c.nome.includes(termo)));
      return {
        ok: true as const,
        total: casam.length,
        tabelas: casam.slice(0, MAXIMO_DE_TABELAS_NA_BUSCA).map((t) => ({
          nome: t.nome,
          colunas: t.colunas.map((c) => `${c.nome}:${c.tipo}`),
        })),
        truncado: casam.length > MAXIMO_DE_TABELAS_NA_BUSCA,
      };
    }),
  });
}

export function criarConsultarDados(entrada: EntradaDasFerramentas): Tool {
  return tool({
    description:
      "Roda uma consulta SQL de LEITURA nos dados da organização e devolve o resultado da conta (até 200 " +
      "linhas; faça somas, contagens e médias NO SQL, não traga linhas para somar). Escreva só SELECT ou " +
      "WITH, uma consulta só, nomes simples de tabela e coluna (sem aspas, sem 'public.', sem comentários, " +
      "sem ponto e vírgula). Os dados já vêm só da organização desta pessoa; não filtre organização. " +
      "Valores em dinheiro ficam em CENTAVOS (`*_cents`); datas em UTC (converta para o fuso da empresa com " +
      "`at time zone`). Descubra tabelas e colunas com `dicionario_de_dados` antes. Dado pessoal de cliente " +
      "(nome, telefone, e-mail) só entra na resposta se a pessoa PEDIU a lista; no resto devolva totais.",
    inputSchema: esquemaDaConsulta,
    execute: protegida("consultar_dados", esquemaDaConsulta, async ({ sql }) => {
      const usuario = entrada.usuarioId;
      if (usuario === undefined) return { ok: false as const, motivo: "indisponivel" as const };
      return executarConsultaLivre(getRequestPool(), { userId: usuario, orgId: entrada.ctx.orgId }, sql);
    }),
  });
}
