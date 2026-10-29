// @vitest-environment node
import { tool, type Tool } from "ai";
import { z } from "zod";

import { CATALOGO_DE_PORTAS } from "@/lib/assistente/portas/catalogo.gerado";
import {
  portaDeLeituraPermitida,
  tipoDeMetodoPermitido,
} from "@/lib/assistente/portas/regras";
import { protegida } from "./protegida";
import type { EntradaDasFerramentas } from "./tipos";

const esquemaDeEntrada = z.strictObject({
  pergunta: z.string().trim().min(3).max(200),
});
type EntradaDeProcurarPorta = z.infer<typeof esquemaDeEntrada>;

/** Minúsculas e sem acento: "aniversário" e "aniversario" são a mesma palavra. */
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function palavrasDa(pergunta: string): string[] {
  return normalizar(pergunta)
    .split(/[\s,.;:!?/\-_()]+/)
    .filter((p) => p.length > 0);
}

/**
 * A pergunta vem em português e o catálogo fala a língua das rotas (`team`,
 * `contacts`, `leads`), com resumo vazio na maior parte das portas. Cada palavra
 * daqui vira os pedaços de caminho que ela quer dizer. Lista fechada no código:
 * o modelo não inventa sinônimo, e palavra fora dela continua casando pelo id,
 * pela área e pelo resumo, como antes.
 */
const SINONIMOS: Readonly<Record<string, readonly string[]>> = {
  equipe: ["team", "attendants"],
  time: ["team"],
  cargo: ["team"],
  cargos: ["team"],
  papel: ["team"],
  atendente: ["attendants", "team"],
  atendentes: ["attendants", "team"],
  usuario: ["team"],
  usuarios: ["team"],
  cliente: ["contacts"],
  clientes: ["contacts"],
  contato: ["contacts"],
  contatos: ["contacts"],
  aniversario: ["contacts"],
  aniversarios: ["contacts"],
  aniversariante: ["contacts"],
  aniversariantes: ["contacts"],
  compra: ["compras", "comandas"],
  compras: ["compras", "comandas"],
  venda: ["compras", "comandas", "financeiro"],
  vendas: ["compras", "comandas", "financeiro"],
  comanda: ["comandas"],
  comandas: ["comandas"],
  pedido: ["comandas", "compras"],
  pedidos: ["comandas", "compras"],
  negocio: ["leads"],
  negocios: ["leads"],
  oportunidade: ["leads"],
  oportunidades: ["leads"],
  card: ["leads"],
  cards: ["leads"],
  funil: ["pipelines"],
  funis: ["pipelines"],
  etapa: ["pipelines", "stages"],
  etapas: ["pipelines", "stages"],
  agente: ["agents"],
  agentes: ["agents"],
  roteador: ["routers"],
  roteadores: ["routers"],
  memoria: ["memory"],
  conhecimento: ["knowledge"],
  material: ["knowledge"],
  materiais: ["knowledge"],
  follow: ["followup"],
  followup: ["followup"],
  followups: ["followup"],
  acompanhamento: ["followup"],
  conversa: ["conversations"],
  conversas: ["conversations"],
  atendimento: ["conversations"],
  atendimentos: ["conversations"],
  fila: ["conversations"],
  agenda: ["agenda"],
  compromisso: ["agendamentos", "agenda"],
  compromissos: ["agendamentos", "agenda"],
  agendamento: ["agendamentos"],
  agendamentos: ["agendamentos"],
  consulta: ["agendamentos"],
  consultas: ["agendamentos"],
  etiqueta: ["tags"],
  etiquetas: ["tags"],
  campanha: ["campaigns"],
  campanhas: ["campaigns"],
  prospeccao: ["prospecting"],
  empresa: ["companies"],
  empresas: ["companies"],
  produto: ["products"],
  produtos: ["products"],
  catalogo: ["products"],
  imovel: ["external-db"],
  imoveis: ["external-db"],
  externo: ["external-db"],
  tarefa: ["tasks"],
  tarefas: ["tasks"],
  metrica: ["metrics"],
  metricas: ["metrics"],
  numeros: ["metrics"],
  relatorio: ["reports", "metrics"],
  relatorios: ["reports", "metrics"],
  proposta: ["proposals"],
  propostas: ["proposals"],
  canal: ["channels", "channel-sessions"],
  canais: ["channels", "channel-sessions"],
  whatsapp: ["channel-sessions", "channels"],
};

/** As palavras da pergunta mais os pedaços de caminho que elas querem dizer. */
function termosDa(pergunta: string): string[] {
  const termos = new Set<string>();
  for (const palavra of palavrasDa(pergunta)) {
    termos.add(palavra);
    for (const s of SINONIMOS[palavra] ?? []) termos.add(s);
  }
  return [...termos];
}

/** Quantos termos a porta casa: pedaço do id, a área ou o resumo. Zero = não casa. */
function pontosDaPorta(portaId: string, area: string, resumo: string, termos: string[]): number {
  const pedacos = new Set([...palavrasDa(portaId), ...palavrasDa(area), area.toLowerCase()]);
  const r = normalizar(resumo);
  let pontos = 0;
  for (const termo of termos) {
    if (pedacos.has(termo)) pontos += 2;
    else if (termo.length >= 4 && r.includes(termo)) pontos += 1;
  }
  return pontos;
}

/** Métodos de escrita que o assistente pode usar nesta porta, em ordem. */
function metodosDeEscritaPermitida(portaId: string): ("POST" | "PATCH" | "PUT")[] {
  const resultado: ("POST" | "PATCH" | "PUT")[] = [];
  for (const metodo of ["POST", "PATCH", "PUT"] as const) {
    if (tipoDeMetodoPermitido(portaId, metodo)) resultado.push(metodo);
  }
  return resultado;
}

async function procurarPorta(
  entrada: EntradaDasFerramentas,
  e: EntradaDeProcurarPorta,
): Promise<{ portas: PortaEncontrada[]; areas?: string[] }> {
  const termos = termosDa(e.pergunta);
  const candidatas: { pontos: number; porta: PortaEncontrada }[] = [];

  for (const porta of CATALOGO_DE_PORTAS) {
    const pontos = pontosDaPorta(porta.id, porta.area, porta.resumo, termos);
    if (pontos === 0) continue;

    const leituraPermitida = porta.metodos.includes("GET") && portaDeLeituraPermitida(porta.id);
    const escrita = metodosDeEscritaPermitida(porta.id);

    const metodosPermitidos: string[] = [];
    if (leituraPermitida) metodosPermitidos.push("GET");
    metodosPermitidos.push(...escrita);

    candidatas.push({
      pontos,
      porta: {
        id: porta.id,
        caminho: porta.caminho,
        metodos: metodosPermitidos,
        parametros: porta.parametros,
        resumo: porta.resumo,
      },
    });
  }

  // Mais termos casados primeiro; no empate, o caminho mais curto (a lista antes do
  // detalhe). Sem a ordem, o corte de 12 caía em área grande como `contacts` (20
  // portas) e deixava de fora justo a que a pergunta pedia.
  candidatas.sort((x, y) => y.pontos - x.pontos || x.porta.id.length - y.porta.id.length);
  const portas = candidatas.slice(0, 12).map((c) => c.porta);
  if (portas.length > 0) return { portas };

  // Nada casou: as áreas dão ao modelo o vocabulário para tentar de novo, em vez de
  // concluir que não existe porta.
  const areas = [...new Set(CATALOGO_DE_PORTAS.map((p) => p.area))].sort();
  return { portas: [], areas };
}

export interface PortaEncontrada {
  id: string;
  caminho: string;
  metodos: string[];
  parametros: string[];
  resumo: string;
}

export function criarProcurarPorta(entrada: EntradaDasFerramentas): Tool {
  return tool({
    description:
      "Busca portas do catálogo da empresa por palavra-chave no id, na área ou no resumo. " +
      "Devolve até 12 portas com os métodos que o assistente PODE usar em cada uma " +
      "(leitura GET e/ou escrita POST/PATCH/PUT), os parâmetros de caminho e o resumo. " +
      "Aceita a pergunta em português (equipe, cliente, aniversário, compras, negócio, funil, " +
      "agenda, imóveis…). Ler a equipe e o cargo de cada um é permitido; convidar, mudar papel " +
      "e remover não. Nunca devolve portas proibidas (envio de mensagem, disparo de campanha, " +
      "chaves de API, cron, admin, auth, webhooks, LGPD, etc.). Sem nenhuma porta, devolve as " +
      "áreas do catálogo: tente de novo com uma delas. Use para encontrar a porta certa antes " +
      "de ler ou propor mudança.",
    inputSchema: esquemaDeEntrada,
    execute: protegida("procurar_porta", esquemaDeEntrada, (e) => procurarPorta(entrada, e)),
  });
}
