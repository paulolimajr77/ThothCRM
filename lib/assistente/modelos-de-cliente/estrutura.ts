/**
 * O que um modelo de cliente carrega: SÓ estrutura.
 *
 * Funis com as etapas, agentes (nome, descrição e o texto já limpo) e os
 * follow-ups do catálogo pelo id do modelo. Fica de fora, por construção (não
 * há campo para isso): contato, negócio, conversa, conexão de WhatsApp,
 * credencial, chave, material de conhecimento, memória e qualquer id da
 * organização de origem. Os ids de funil e agente são lidos para montar a
 * estrutura e não entram nela.
 */
import { z } from "zod";

const etapaSchema = z
  .object({
    nome: z.string().trim().min(1).max(60),
    ganho: z.boolean().default(false),
    perdido: z.boolean().default(false),
  })
  .strict();

const funilSchema = z
  .object({
    nome: z.string().trim().min(1).max(80),
    etapas: z.array(etapaSchema).min(2).max(30),
  })
  .strict();

const agenteSchema = z
  .object({
    nome: z.string().trim().min(1).max(120),
    descricao: z.string().trim().max(2000).default(""),
    prompt: z.string().trim().min(1).max(20000),
  })
  .strict();

const followupSchema = z
  .object({
    modelo_id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  })
  .strict();

export const estruturaDoModeloSchema = z
  .object({
    funis: z.array(funilSchema).max(10),
    agentes: z.array(agenteSchema).max(10),
    followups: z.array(followupSchema).max(20),
  })
  .strict();

export type EstruturaDoModelo = z.infer<typeof estruturaDoModeloSchema>;
export type FunilDoModelo = EstruturaDoModelo["funis"][number];
export type AgenteDoModelo = EstruturaDoModelo["agentes"][number];

/** Todo texto livre da estrutura, com onde ele está — para a revisão apontar o lugar. */
export function textosDaEstrutura(estrutura: EstruturaDoModelo): { onde: string; texto: string }[] {
  const textos: { onde: string; texto: string }[] = [];
  for (const funil of estrutura.funis) {
    textos.push({ onde: `funil «${funil.nome}»`, texto: funil.nome });
    for (const etapa of funil.etapas) {
      textos.push({ onde: `etapa «${etapa.nome}» do funil «${funil.nome}»`, texto: etapa.nome });
    }
  }
  for (const agente of estrutura.agentes) {
    textos.push({ onde: `nome do agente «${agente.nome}»`, texto: agente.nome });
    textos.push({ onde: `descrição do agente «${agente.nome}»`, texto: agente.descricao });
    textos.push({ onde: `texto do agente «${agente.nome}»`, texto: agente.prompt });
  }
  return textos;
}
