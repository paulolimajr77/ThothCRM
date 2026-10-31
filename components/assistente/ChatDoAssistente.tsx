"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CartaoDeCheckup,
  type ItemDoCheckupNaTela,
  type RetratoNaTela,
} from "@/components/assistente/CartaoDeCheckup";
import {
  CartaoDeProposta,
  type PropostaNaTela,
} from "@/components/assistente/CartaoDeProposta";
import { BotaoDeAudio } from "@/components/assistente/BotaoDeAudio";
import { MenuDeComandos } from "@/components/assistente/MenuDeComandos";
import { TextoDoAssistente } from "@/components/assistente/TextoDoAssistente";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import { linhasDaAjuda } from "@/lib/assistente/comandos";
import { randomId } from "@/lib/random-id";
import { proximosPassosDaAcao, type ProximoPasso } from "@/lib/assistente/propostas/proximos-passos";
import { idsParaAprovarTudo } from "@/lib/assistente/propostas/lote-seguro";

interface Thread {
  id: string;
  last_message_at: string | null;
  created_at: string;
}

/** Um botão "Abrir {tela}" que o assistente sugeriu; só navega no clique. */
interface AcaoDaTela {
  rotulo: string;
  href: string;
}

/** Um cartão "criado como rascunho"; o `href` foi montado no servidor. */
interface CartaoNaTela {
  artefato: "agente" | "followup";
  nome: string;
  rotulo: string;
  href: string;
}

/** O resultado de um teste interno de agente: o que foi perguntado, a resposta e se passou. */
interface TesteNaTela {
  versao: number;
  resultados: {
    mensagem: string;
    resposta: string;
    passou: boolean;
    simulado: boolean;
    ferramentas: string[];
  }[];
}

/** Uma linha do que o assistente está fazendo AGORA (lida da rota de andamento). */
interface AndamentoNaTela {
  chave: string;
  texto: string;
  resposta?: string;
  passou?: boolean;
}

/** O checkup de uma mensagem: o retrato de agora e o da rodada anterior. */
interface CheckupNaTela {
  rodou: boolean;
  snapshot: RetratoNaTela;
  anterior: { id: string; taken_at: string; pendencias: number } | null;
}

interface MensagemNaTela {
  id: string;
  author_kind: "human" | "ai";
  body: string;
  /** Quando a mensagem foi gravada (só nas lidas do servidor): serve para saber se um pedido ainda está em andamento. */
  criadoEm?: string;
  /** Só na resposta recém-chegada: por que a IA não respondeu (piso). */
  aviso?: string | null;
  /** Só na resposta recém-chegada. */
  botoes?: AcaoDaTela[];
  /** Só na resposta recém-chegada. */
  cartoes?: CartaoNaTela[];
  /** Ids das mudanças citadas por esta mensagem; o conteúdo vem da fila oficial. */
  propostas?: string[];
  /** O retrato da configuração, quando a mensagem é um `/checkup`. */
  checkup?: CheckupNaTela;
  /** Só na resposta recém-chegada: os testes de agente que rodaram neste turno. */
  testes?: TesteNaTela[];
  /** A mensagem é o desfecho de uma decisão (Aplicar/Não), não conversa. */
  desfecho?: "ok" | "erro";
  /** Depois de aplicar com sucesso: os próximos passos que faltam fazer na tela. */
  proximosPassos?: ProximoPasso[];
}

interface ItemDeAcao {
  tipo?: unknown;
  artefato?: unknown;
  nome?: unknown;
  rotulo?: unknown;
  href?: unknown;
  id?: unknown;
  rodou?: unknown;
  versao?: unknown;
  resultados?: unknown;
  snapshot?: unknown;
  anterior?: unknown;
}

interface RespostaDoChat {
  thread_id: string;
  resposta?: string;
  aviso?: string | null;
  acoes?: ItemDeAcao[];
}

/** Monta { porta, metodo } a partir da proposta aplicada, quando a porta é de criação. */
function portaEDoMetodoDaProposta(
  p: PropostaNaTela | null,
): { porta: string; metodo: string } | null {
  if (p === null) return null;
  if (p.kind === "acao") {
    const payload = p.payload as { porta?: unknown; metodo?: unknown } | null;
    if (
      payload !== null &&
      typeof payload.porta === "string" &&
      typeof payload.metodo === "string"
    ) {
      return { porta: payload.porta, metodo: payload.metodo };
    }
    return null;
  }
  if (p.kind === "funil" && p.operacao === "criar_funil") {
    return { porta: "pipelines", metodo: "POST" };
  }
  return null;
}

const FILA_DE_PROPOSTAS = ["assistente", "propostas"];

/** A conversa da aba: só conveniência. Sem `sessionStorage` a tela funciona do mesmo jeito. */
const CHAVE_DA_CONVERSA = "assistente:conversa-da-aba";

/**
 * Responder ao cartão com uma palavra também decide. Só o começo da frase conta,
 * e só estas três: "simples" e "aplicar" não valem.
 */
const APLICAR_POR_TEXTO = /^(pode|sim|aplica)\b/i;

function lerConversaGuardada(): string | null {
  try {
    return window.sessionStorage.getItem(CHAVE_DA_CONVERSA);
  } catch {
    return null;
  }
}

function guardarConversa(id: string | null): void {
  try {
    if (id === null) window.sessionStorage.removeItem(CHAVE_DA_CONVERSA);
    else window.sessionStorage.setItem(CHAVE_DA_CONVERSA, id);
  } catch {
    // Armazenamento bloqueado: a conversa continua na tela, só não sobrevive ao recarregar.
  }
}

/**
 * Só navega para dentro do produto. O `href` já sai do catálogo de navegação no
 * servidor; esta é a defesa de quem recebe: o que não começa por `/app/` não
 * vira botão (nem `//outro-site`, nem `https://…`, nem `javascript:`).
 */
function ehDestinoInterno(href: string): boolean {
  // Subir de pasta (`..`), barra invertida e caracteres de controle saem do prefixo `/app/` depois que o navegador normaliza o caminho.
  if (href.includes("..") || href.includes(String.fromCharCode(92)) || /[\x00-\x1f]/.test(href)) return false;
  return href.startsWith("/app/");
}

/** Um item `artefato` só vira cartão com os 4 campos válidos; o resto cai fora em silêncio. */
function cartaoValido(acao: ItemDeAcao): CartaoNaTela | null {
  if (acao.tipo !== "artefato") return null;
  if (acao.artefato !== "agente" && acao.artefato !== "followup") return null;
  if (typeof acao.nome !== "string" || acao.nome.trim() === "") return null;
  if (typeof acao.rotulo !== "string" || acao.rotulo.trim() === "") return null;
  if (typeof acao.href !== "string" || !ehDestinoInterno(acao.href)) return null;
  return { artefato: acao.artefato, nome: acao.nome, rotulo: acao.rotulo, href: acao.href };
}

/** Um item `teste` só vira cartão com os campos de cada resultado no formato certo. */
function testeValido(acao: ItemDeAcao): TesteNaTela | null {
  if (acao.tipo !== "teste" || !Array.isArray(acao.resultados)) return null;
  const resultados: TesteNaTela["resultados"] = [];
  for (const bruto of acao.resultados) {
    if (bruto === null || typeof bruto !== "object") continue;
    const r = bruto as Record<string, unknown>;
    if (typeof r.mensagem !== "string" || typeof r.resposta !== "string") continue;
    resultados.push({
      mensagem: r.mensagem,
      resposta: r.resposta,
      passou: r.passou === true,
      simulado: r.simulado === true,
      ferramentas: Array.isArray(r.ferramentas)
        ? r.ferramentas.filter((f): f is string => typeof f === "string")
        : [],
    });
  }
  if (resultados.length === 0) return null;
  return { versao: typeof acao.versao === "number" ? acao.versao : 0, resultados };
}

/** Um item `proposta` só vira cartão com o `id` — o resto do conteúdo vem da fila. */
function propostaValida(acao: ItemDeAcao): string | null {
  if (acao.tipo !== "proposta") return null;
  return typeof acao.id === "string" && acao.id !== "" ? acao.id : null;
}

/** O item `checkup` validado: sem retrato com `id`/`taken_at`, não há cartão. */
function checkupValido(acao: ItemDeAcao): CheckupNaTela | null {
  if (acao.tipo !== "checkup") return null;
  const bruto = acao.snapshot;
  if (bruto === null || typeof bruto !== "object" || Array.isArray(bruto)) return null;
  const s = bruto as Record<string, unknown>;
  if (typeof s.id !== "string" || s.id === "") return null;
  if (typeof s.taken_at !== "string") return null;

  const itens: ItemDoCheckupNaTela[] = [];
  if (Array.isArray(s.itens)) {
    for (const item of s.itens) {
      if (item === null || typeof item !== "object") continue;
      const i = item as Record<string, unknown>;
      if (typeof i.id !== "string" || typeof i.titulo !== "string") continue;
      itens.push({
        id: i.id,
        estado: typeof i.estado === "string" ? i.estado : "",
        titulo: i.titulo,
        por_que: typeof i.por_que === "string" ? i.por_que : "",
        ferramenta: typeof i.ferramenta === "string" && i.ferramenta !== "" ? i.ferramenta : null,
        depende_de: Array.isArray(i.depende_de) ? i.depende_de.filter((d): d is string => typeof d === "string") : [],
        onde_resolver: typeof i.onde_resolver === "string" ? i.onde_resolver : "",
      });
    }
  }

  let anterior: CheckupNaTela["anterior"] = null;
  const antes = acao.anterior;
  if (antes !== null && typeof antes === "object" && !Array.isArray(antes)) {
    const a = antes as Record<string, unknown>;
    if (typeof a.id === "string" && typeof a.taken_at === "string") {
      anterior = {
        id: a.id,
        taken_at: a.taken_at,
        pendencias: typeof a.pendencias === "number" ? a.pendencias : 0,
      };
    }
  }

  return {
    rodou: acao.rodou === true,
    snapshot: {
      id: s.id,
      taken_at: s.taken_at,
      pendencias: typeof s.pendencias === "number" ? s.pendencias : 0,
      itens,
    },
    anterior,
  };
}

function acoesValidas(acoes: RespostaDoChat["acoes"]): {
  botoes: AcaoDaTela[];
  cartoes: CartaoNaTela[];
  propostas: string[];
  checkup: CheckupNaTela | null;
  testes: TesteNaTela[];
} {
  if (!Array.isArray(acoes)) return { botoes: [], cartoes: [], propostas: [], checkup: null, testes: [] };
  const testes: TesteNaTela[] = [];
  const botoes: AcaoDaTela[] = [];
  const cartoes: CartaoNaTela[] = [];
  const propostas: string[] = [];
  let checkup: CheckupNaTela | null = null;
  for (const acao of acoes) {
    const cartao = cartaoValido(acao);
    if (cartao !== null) {
      cartoes.push(cartao);
      continue;
    }
    const teste = testeValido(acao);
    if (teste !== null) {
      testes.push(teste);
      continue;
    }
    const id = propostaValida(acao);
    if (id !== null) {
      if (!propostas.includes(id)) propostas.push(id);
      continue;
    }
    const retrato = checkupValido(acao);
    if (retrato !== null) {
      checkup = retrato;
      continue;
    }
    if (typeof acao.rotulo !== "string" || typeof acao.href !== "string") continue;
    if (!ehDestinoInterno(acao.href)) continue;
    botoes.push({ rotulo: acao.rotulo, href: acao.href });
  }
  return { botoes, cartoes, propostas, checkup, testes };
}

/** A frase do envelope `{ error: { message } }`, quando a rota mandou uma. */
async function mensagemDoErro(r: Response): Promise<string | null> {
  try {
    const corpo = (await r.json()) as { error?: { message?: unknown } };
    const mensagem = corpo.error?.message;
    return typeof mensagem === "string" && mensagem.trim() !== "" ? mensagem : null;
  } catch {
    return null;
  }
}

/** O texto da resposta sem o aviso que a rota já gravou na frente dele no piso. */
function corpoSemAviso(resposta: string, aviso: string | null | undefined): string {
  if (typeof aviso === "string" && aviso !== "" && resposta.startsWith(aviso)) {
    return resposta.slice(aviso.length).trim();
  }
  return resposta;
}

/** O menu abre com "/" e continua aberto enquanto o comando está sendo digitado. */
function ehComandoEmDigitacao(pergunta: string): boolean {
  return /^\/[a-z_]*$/i.test(pergunta);
}

/**
 * A CONVERSA DO ASSISTENTE — a ÚNICA superfície dele (decisão do dono, 18/10/2026).
 *
 * ─── O que mudou, e por quê ────────────────────────────────────────────────
 *
 * Havia três abas no painel — "Conversa", "Propostas" e "Auditoria" — e o defeito
 * era de desenho: a pergunta acontecia numa aba, a proposta esperava em outra e a
 * leitura da configuração numa terceira. Aqui as três coisas são MENSAGEM:
 *
 *  - **proposta** é cartão na conversa, com o antes/depois e Aplicar/Não;
 *  - **checkup** é cartão na conversa, com a contagem, a comparação com a rodada
 *    anterior e o "Resolver" de cada item;
 *  - **pendências** são anunciadas quando o administrador abre o painel
 *    ("Tem N mudanças esperando você."), e de novo a cada `/pendentes`.
 *
 * ─── Quem decide o quê ─────────────────────────────────────────────────────
 *
 * O papel vem da sessão (`ehAdmin`, passado pelo painel), e a tela só ESCONDE o
 * que a pessoa não pode: o menu não oferece `/pendentes` a quem não administra.
 * A trava de verdade continua no servidor — o comando recusa e a rota de
 * propostas barra o papel errado.
 *
 * ─── Os comandos ───────────────────────────────────────────────────────────
 *
 * `/` abre o menu (setas + Enter, ou digitar o nome inteiro); `/resumo`,
 * `/checkup`, `/pendentes`, `/ajuda` e `/nova` são reconhecidos e respondidos
 * PELO SERVIDOR, sem passar pelo modelo — o mesmo texto devolve o mesmo formato,
 * sem custo e sem depender de chave de IA. `/nova` é a única exceção: limpar a
 * conversa é gesto local, e por isso ele é resolvido aqui também.
 *
 * ─── A fila de propostas ───────────────────────────────────────────────────
 *
 * O conteúdo do cartão não viaja na resposta do chat: o servidor manda o `id` e
 * a tela lê a fila oficial (`GET /api/v1/ai/assistente/propostas`, só para
 * administrador), que já traz o `antes`, o `previsto` e o prazo. Assim os três
 * caminhos (modelo, abertura do painel, `/pendentes`) desenham o mesmo cartão, e
 * a fonte é uma só.
 */
export function ChatDoAssistente({
  aberto,
  ehAdmin = false,
  aoAbrirTela,
}: {
  /** O painel está visível? A primeira abertura carrega o histórico; toda abertura leva o foco ao campo. */
  aberto: boolean;
  /** A pessoa administra a organização? Conveniência de tela; o servidor decide de novo. */
  ehAdmin?: boolean;
  /** Depois de um clique em "Abrir {tela}" (no celular o painel cobre a tela e precisa sair da frente). */
  aoAbrirTela: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemNaTela[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Pedido já gravado no servidor, ainda sem resposta (a tela recarregou ou mudou no meio): a tela segue de olho.
  const [retomando, setRetomando] = useState(false);
  const [andamento, setAndamento] = useState<AndamentoNaTela[]>([]);
  // O turno em andamento, para a leitura do que o assistente já fez (rota `progresso`).
  const turnoAtual = useRef<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [menuDispensado, setMenuDispensado] = useState(false);
  const [indiceDoMenu, setIndiceDoMenu] = useState(0);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [loteOcupado, setLoteOcupado] = useState<boolean>(false);
  const [errosDeAcao, setErrosDeAcao] = useState<Record<string, string>>({});
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());
  const jaIniciou = useRef(false);
  const nomesCarregados = useRef(false);
  const anuncioFeito = useRef<string>("");
  /** Cada ação da pessoa (enviar, nova conversa, abrir outra) invalida leituras que ainda voam. */
  const versao = useRef(0);
  const lista = useRef<HTMLDivElement | null>(null);
  const campo = useRef<HTMLInputElement | null>(null);
  /** Propostas que já tiveram cartão renderizado na conversa visível; o anúncio não as repete. */
  const propostasJaExibidasComoCartao = useRef<Set<string>>(new Set());

  // A fila oficial das mudanças: é dela que o cartão tira o conteúdo, e é ela que
  // diz o que ainda espera decisão. Só administrador lê (a rota barra os outros).
  const fila = useQuery({
    queryKey: FILA_DE_PROPOSTAS,
    enabled: aberto && ehAdmin,
    queryFn: async () => {
      // Duas leituras: as 50 mais recentes E as pendentes. Só as recentes deixavam de fora uma
      // pendente antiga quando havia muitas já decididas depois dela, e o cartão ficava em
      // "Carregando a mudança…" para sempre (medido no espelho: 8 pendentes, 0 nas 50 recentes).
      const [recentes, pendentes] = await Promise.all([
        apiClient.get<{ data: PropostaNaTela[] }>("/api/v1/ai/assistente/propostas?limit=50"),
        apiClient.get<{ data: PropostaNaTela[] }>(
          "/api/v1/ai/assistente/propostas?status=pendente&limit=50",
        ),
      ]);
      const lista = Array.isArray(recentes.data) ? recentes.data : [];
      const vistos = new Set(lista.map((p) => p.id));
      const extras = (Array.isArray(pendentes.data) ? pendentes.data : []).filter(
        (p) => !vistos.has(p.id),
      );
      return [...lista, ...extras];
    },
  });

  const nomeDe = useCallback(
    (userId: string): string => nomes.get(userId) ?? t("um administrador"),
    [nomes, t],
  );

  const carregarThreads = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/ai/assistente/threads?limite=20");
      if (!r.ok) return;
      const corpo = (await r.json()) as { data: { threads: Thread[] } };
      setThreads(corpo.data.threads);
    } catch {
      // Sem histórico: o chat funciona do mesmo jeito.
    }
  }, []);

  const abrirThread = useCallback(async (id: string) => {
    versao.current += 1;
    const minha = versao.current;
    try {
      const r = await fetch(`/api/v1/ai/assistente/threads/${id}/messages`);
      if (minha !== versao.current) return;
      if (r.status === 404) {
        // A conversa guardada não é desta organização (ou foi apagada): esquece.
        guardarConversa(null);
        setThreadId(null);
        setMensagens([]);
        setErro(null);
        return;
      }
      if (!r.ok) return;
      const corpo = (await r.json()) as {
        data: { mensagens: Array<{ id: string; author_kind: "human" | "ai"; body: string | null; created_at?: string }> };
      };
      if (minha !== versao.current) return;
      setThreadId(id);
      guardarConversa(id);
      const lidas = corpo.data.mensagens.flatMap((m) =>
        m.body === null
          ? []
          : [{ id: m.id, author_kind: m.author_kind, body: m.body, ...(m.created_at === undefined ? {} : { criadoEm: m.created_at }) }],
      );
      setMensagens(lidas);
      // A última mensagem é da pessoa e recente: o servidor ainda trabalha nela.
      const ultima = lidas[lidas.length - 1];
      const idade = ultima?.criadoEm === undefined ? Number.POSITIVE_INFINITY : Date.now() - new Date(ultima.criadoEm).getTime();
      setRetomando(ultima?.author_kind === "human" && idade < 15 * 60 * 1000);
    } catch {
      // Sem rede: fica o que já estava na tela.
    }
  }, []);

  // Primeira vez que o painel abre: histórico e, se a aba guardou, a conversa em curso.
  useEffect(() => {
    if (!aberto || jaIniciou.current) return;
    jaIniciou.current = true;
    void carregarThreads();
    const guardada = lerConversaGuardada();
    if (guardada !== null) void abrirThread(guardada);
  }, [aberto, carregarThreads, abrirThread]);

  // Pedido em andamento no servidor e sem resposta na tela: pergunta de novo a cada 4 s até a resposta chegar
  // (ou passar 15 min). A pessoa nunca fica sem saber se o pedido continua.
  useEffect(() => {
    if (!retomando || enviando || threadId === null) return;
    const id = window.setInterval(() => void abrirThread(threadId), 4000);
    return () => window.clearInterval(id);
  }, [retomando, enviando, threadId, abrirThread]);

  // Foco no campo de pergunta a cada abertura. Aberto pela paleta ⌘K, quem leva o foco
  // para cá no fim é o `onCloseAutoFocus` da paleta (evento do Radix, sem relógio).
  useEffect(() => {
    if (!aberto) return;
    campo.current?.focus();
  }, [aberto]);

  // Mensagem nova (ou "pensando…"), ou painel reaberto: rola até o fim. Escondido
  // (`display: none`) a lista não tem altura e o navegador pode zerar a rolagem.
  useEffect(() => {
    if (!aberto) return;
    const el = lista.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [mensagens, enviando, aberto]);

  // "Quem pediu" sai de UMA leitura da equipe, na primeira carga da fila.
  useEffect(() => {
    if (fila.data === undefined || nomesCarregados.current) return;
    nomesCarregados.current = true;
    void (async () => {
      try {
        const r = await apiClient.get<unknown[]>("/api/v1/team");
        const mapa = new Map<string, string>();
        for (const m of r) {
          const linha = m as { user_id?: unknown; full_name?: unknown; email?: unknown };
          if (typeof linha.user_id !== "string") continue;
          mapa.set(
            linha.user_id,
            typeof linha.full_name === "string" && linha.full_name.trim() !== ""
              ? linha.full_name
              : typeof linha.email === "string"
                ? linha.email
                : "",
          );
        }
        setNomes(mapa);
      } catch {
        // Sem a lista de equipe: os cartões mostram o rótulo genérico.
      }
    })();
  }, [fila.data]);

  const idsPendentes = useMemo(
    () => (fila.data ?? []).filter((p) => p.status === "pendente").map((p) => p.id),
    [fila.data],
  );
  // Detalhe 1: o anúncio não repete propostas que já tiveram cartão na conversa.
  const idsPendentesParaAnuncio = useMemo(
    () => idsPendentes.filter((id) => !propostasJaExibidasComoCartao.current.has(id)),
    [idsPendentes],
  );
  const assinaturaDasPendencias = idsPendentesParaAnuncio.join(",");

  // Mudanças seguras (risco baixo, pendentes, não vencidas) que podem ser
  // aplicadas em lote com um só clique.
  const idsSeguros = useMemo(
    () => idsParaAprovarTudo(fila.data ?? []),
    [fila.data],
  );
  const temLoteSeguro = idsSeguros.length >= 2;

  // Ao abrir, o administrador vê o que espera por ele. O anúncio é da COLEÇÃO:
  // reabrir o painel com as mesmas pendências não repete a mensagem, e uma
  // proposta nova gera um anúncio novo.
  useEffect(() => {
    if (!aberto || !ehAdmin) return;
    if (idsPendentesParaAnuncio.length === 0) return;
    if (anuncioFeito.current === assinaturaDasPendencias) return;
    anuncioFeito.current = assinaturaDasPendencias;
    setMensagens((atuais) => [
      ...atuais,
      {
        id: `pendencias-${assinaturaDasPendencias}`,
        author_kind: "ai",
        body:
          idsPendentesParaAnuncio.length === 1
            ? t("Tem 1 mudança esperando você.")
            : t("Tem {n} mudanças esperando você.").replace(
                "{n}",
                String(idsPendentesParaAnuncio.length),
              ),
        propostas: idsPendentesParaAnuncio,
      },
    ]);
  }, [
    aberto,
    ehAdmin,
    assinaturaDasPendencias,
    idsPendentesParaAnuncio,
    t,
  ]);

  const propostasPorId = useMemo(() => {
    const mapa = new Map<string, PropostaNaTela>();
    for (const p of fila.data ?? []) mapa.set(p.id, p);
    return mapa;
  }, [fila.data]);

  /** Os ids citados pela ÚLTIMA mensagem que citou algum (a decisão por texto é dela). */
  const idsCitados = useMemo(() => {
    for (let i = mensagens.length - 1; i >= 0; i--) {
      const ids = mensagens[i]?.propostas;
      if (ids !== undefined && ids.length > 0) return ids;
    }
    return [];
  }, [mensagens]);

  /** A última mudança AINDA pendente entre as citadas — a que "pode" aplica. */
  function ultimaPendente(): string | null {
    if (idsCitados.length === 0) return null;
    if (fila.data === undefined) return idsCitados[idsCitados.length - 1] ?? null;
    const pendentes = new Set(idsPendentes);
    for (let i = idsCitados.length - 1; i >= 0; i--) {
      const id = idsCitados[i];
      if (id !== undefined && pendentes.has(id)) return id;
    }
    return null;
  }

  /** Acrescenta a mensagem do desfecho (o "Pronto: …" ou o porquê do erro). */
  function registrarDesfecho(
    texto: string,
    tipo: "ok" | "erro",
    proximosPassos?: ProximoPasso[],
  ) {
    setMensagens((atuais) => [
      ...atuais,
      {
        id: `desfecho-${randomId()}`,
        author_kind: "ai",
        body: texto,
        desfecho: tipo,
        ...(proximosPassos === null || proximosPassos === undefined
          ? {}
          : { proximosPassos }),
      },
    ]);
  }

  /** A resposta da ação já traz a proposta nova: o cartão muda na hora. */
  const poNaFila = (r: { data?: PropostaNaTela } | undefined) => {
    const nova = r?.data;
    if (nova === undefined || typeof nova.id !== "string") return;
    qc.setQueryData<PropostaNaTela[]>(FILA_DE_PROPOSTAS, (atual) =>
      (atual ?? []).map((x) => (x.id === nova.id ? nova : x)),
    );
  };

  /**
   * A decisão do cartão. "Aplicar" é aprovar e aplicar EM SEQUÊNCIA — um clique
   * só, como o dono pediu — e "Não" é rejeitar. Quem responde é a rota de sempre
   * (admin + `requireSupportWrite`); o desfecho vira mensagem na conversa.
   */
  async function agir(id: string, acao: "aplicar" | "nao") {
    if (ocupado !== null) return;
    setOcupado(id);
    setErrosDeAcao((atuais) => {
      const { [id]: _fora, ...resto } = atuais;
      return resto;
    });
    try {
      if (acao === "nao") {
        poNaFila(
          await apiClient.post<{ data?: PropostaNaTela }>(
            `/api/v1/ai/assistente/propostas/${id}/rejeitar`,
            {},
          ),
        );
        registrarDesfecho(t("Não apliquei: nada mudou."), "ok");
      } else {
        const aprovada = await apiClient.post<{ data?: PropostaNaTela }>(
          `/api/v1/ai/assistente/propostas/${id}/aprovar`,
          undefined,
        );
        poNaFila(aprovada);
        const aplicada = await apiClient.post<{ data?: PropostaNaTela }>(
          `/api/v1/ai/assistente/propostas/${id}/aplicar`,
          undefined,
        );
        poNaFila(aplicada);
        const mudou = aplicada.data?.resumo ?? aprovada.data?.resumo ?? "";
        const portaMetodo = portaEDoMetodoDaProposta(aplicada.data ?? aprovada.data ?? null);
        // `apply_result` vem como `unknown` da projeção: só o id do artefato interessa aqui.
        const resultadoAplicado = aplicada.data?.apply_result as
          | { artefato?: { id?: unknown } | null }
          | null
          | undefined;
        const artefatoId = resultadoAplicado?.artefato?.id;
        const criado = typeof artefatoId === "string" ? { id: artefatoId } : null;
        const proximos =
          portaMetodo !== null ? proximosPassosDaAcao(portaMetodo, criado) : [];
        registrarDesfecho(
          mudou === "" ? t("Pronto: a mudança foi aplicada.") : `${t("Pronto:")} ${mudou}`,
          "ok",
          proximos.length > 0 ? proximos : undefined,
        );
      }
      void qc.invalidateQueries({ queryKey: FILA_DE_PROPOSTAS });
    } catch (erroDaAcao) {
      const codigo =
        erroDaAcao instanceof Error && "code" in erroDaAcao
          ? (erroDaAcao as { code?: unknown }).code
          : undefined;
      const mensagem =
        erroDaAcao instanceof Error && "message" in erroDaAcao
          ? (erroDaAcao as { message?: string }).message
          : undefined;
      const details =
        erroDaAcao instanceof Error && "details" in erroDaAcao
          ? (erroDaAcao as { details?: unknown }).details
          : undefined;
      let frase: string;
      if (codigo === "proposta_em_aplicacao") {
        frase = t("Esta proposta já está sendo aplicada agora. Aguarde um instante.");
      } else if (codigo === "proposta_falhou_ao_aplicar") {
        const http =
          details && typeof details === "object" && "http_status" in details
            ? String((details as { http_status?: unknown }).http_status)
            : null;
        const codigoDoDestino =
          details && typeof details === "object" && "codigo_do_destino" in details
            ? (details as { codigo_do_destino?: unknown }).codigo_do_destino
            : null;
        // Dono de negócio não lê "422": recusa de conteúdo (4xx) pede para refazer; o resto, tentar de novo.
        const recusouOConteudo = http !== null && /^4\d\d$/.test(http);
        frase = recusouOConteudo
          ? t("O sistema recusou o conteúdo desta mudança. Peça ao assistente para refazer.")
          : t("Não deu certo agora. Tente de novo em instantes.");
      } else if (codigo === "proposta_expirada") {
        frase = t("Expirou sem decisão.");
      } else {
        frase = mensagem ?? t("Não foi possível concluir a ação.");
      }
      setErrosDeAcao((atuais) => ({ ...atuais, [id]: frase }));
      registrarDesfecho(frase, "erro");
      if (codigo === "proposta_expirada") void fila.refetch();
    } finally {
      setOcupado(null);
    }
  }

  /**
   * Aplica as mudanças seguras pendentes UMA POR VEZ, em sequência, parando
   * na primeira que falhar. Usa as mesmas rotas de `/aprovar` + `/aplicar`
   * que o botão de cada cartão — nada de rota nova, nada de banco direto.
   */
  async function aplicarLoteSeguro(ids: string[]): Promise<void> {
    if (loteOcupado) return;
    setLoteOcupado(true);
    let aplicadas = 0;
    let parouEm: { resumo: string; erro: string } | null = null;
    for (const id of ids) {
      try {
        const aprovada = await apiClient.post<{ data?: PropostaNaTela }>(
          `/api/v1/ai/assistente/propostas/${id}/aprovar`,
          undefined,
        );
        poNaFila(aprovada);
        const aplicada = await apiClient.post<{ data?: PropostaNaTela }>(
          `/api/v1/ai/assistente/propostas/${id}/aplicar`,
          undefined,
        );
        poNaFila(aplicada);
        aplicadas += 1;
        void qc.invalidateQueries({ queryKey: FILA_DE_PROPOSTAS });
      } catch (erroDaLote) {
        const proposta = propostasPorId.get(id);
        const resumo = proposta?.resumo ?? id;
        let erro = t("Não foi possível concluir a ação.");
        if (
          erroDaLote instanceof Error &&
          "message" in erroDaLote &&
          typeof (erroDaLote as { message?: unknown }).message === "string"
        ) {
          erro = (erroDaLote as { message: string }).message;
        }
        parouEm = { resumo, erro };
        break;
      }
    }
    setLoteOcupado(false);
    const fraseAplicou = t("Apliquei {a} de {n} mudanças.")
      .replace("{a}", String(aplicadas))
      .replace("{n}", String(ids.length));
    if (parouEm) {
      const fraseParou = t("Parei na mudança «{resumo}»: {erro}")
        .replace("{resumo}", parouEm.resumo)
        .replace("{erro}", parouEm.erro);
      registrarDesfecho(`${fraseAplicou} ${fraseParou}`, "erro");
    } else {
      registrarDesfecho(fraseAplicou, "ok");
    }
  }

  // Enquanto o assistente trabalha, mostra o que ele já fez. A tela da pessoa NÃO muda sozinha: trocar de
  // página no meio do pedido fechava o painel e a pessoa perdia o lugar (31/10). Ela abre a tela no clique.
  // Cortesia: se a rota falhar ou não houver nada, fica o "Pensando…" de sempre.
  useEffect(() => {
    if (!enviando) return;
    let desde = 0;
    let ativo = true;
    const ler = async () => {
      const turno = turnoAtual.current;
      if (turno === null) return;
      try {
        const r = await fetch(
          `/api/v1/ai/assistente/progresso?turn_id=${encodeURIComponent(turno)}&desde=${desde}`,
        );
        if (!r.ok || !ativo) return;
        const { data } = (await r.json()) as {
          data?: { eventos?: Record<string, unknown>[]; proximo?: number };
        };
        const eventos = Array.isArray(data?.eventos) ? data.eventos : [];
        if (typeof data?.proximo === "number") desde = data.proximo;
        if (eventos.length === 0) return;
        const novos: AndamentoNaTela[] = [];
        for (const e of eventos) {
          const chave = `${turno}-${desde}-${novos.length}`;
          if (e.tipo === "tela" && typeof e.href === "string" && ehDestinoInterno(e.href)) {
            // Só avisa em que tela o assistente está mexendo; quem navega é a pessoa, no clique.
            const rotulo = typeof e.rotulo === "string" ? e.rotulo : "";
            novos.push({ chave, texto: `${t("Mexendo em")} ${rotulo}`.trim() });
          } else if (e.tipo === "teste_comecou" && typeof e.mensagem === "string") {
            novos.push({ chave, texto: `${t("Testando o agente com")}: "${e.mensagem}"` });
          } else if (e.tipo === "teste_resultado" && typeof e.resposta === "string") {
            novos.push({
              chave,
              texto:
                e.passou === true
                  ? t("O agente respondeu e passou no teste")
                  : t("O agente respondeu, mas não passou no teste"),
              resposta: e.resposta,
              passou: e.passou === true,
            });
          }
        }
        if (ativo && novos.length > 0) setAndamento((atuais) => [...atuais, ...novos]);
      } catch {
        /* sem andamento ao vivo, a resposta final chega do mesmo jeito */
      }
    };
    const intervalo = window.setInterval(() => void ler(), 1500);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [enviando, t]);

  async function perguntar(texto: string) {
    const p = texto.trim();
    if (p.length < 3 || enviando) return;

    // "/nova" é gesto local: limpar a conversa não precisa de ida ao servidor.
    // O servidor também entende o comando (e responde), para quem digitar antes
    // da tela existir — aqui a gente só adianta o que é da tela.
    if (/^\/nova\b/i.test(p)) {
      abrirNovaConversa();
      return;
    }

    const turnId = randomId();
    const idLocal = `local-${turnId}`;
    versao.current += 1;
    // Se a pessoa abrir outra conversa ou clicar em "Nova conversa" enquanto isto voa,
    // `versao` muda e a resposta de agora NÃO pode escrever na tela nova.
    const minha = versao.current;
    turnoAtual.current = turnId;
    setAndamento([]);
    setEnviando(true);
    setErro(null);
    setMensagens((atuais) => [...atuais, { id: idLocal, author_kind: "human", body: p }]);
    setPergunta("");
    const falhou = async (r: Response | null) => {
      if (minha !== versao.current) return;
      setMensagens((atuais) => atuais.filter((m) => m.id !== idLocal));
      setPergunta((atual) => (atual === "" ? p : atual));
      setErro((r === null ? null : await mensagemDoErro(r)) ?? t("Não foi possível perguntar agora."));
    };
    try {
      const r = await fetch("/api/v1/ai/assistente/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(threadId === null ? {} : { thread_id: threadId }),
          turn_id: turnId,
          pergunta: p,
          // Só o caminho: quem extrai o objeto aberto e confere a organização é o servidor.
          ...(pathname === null ? {} : { contexto: { caminho: pathname.slice(0, 200) } }),
        }),
      });
      if (!r.ok) {
        await falhou(r);
        return;
      }
      const { data } = (await r.json()) as { data: RespostaDoChat };
      if (minha !== versao.current) {
        // A pergunta foi gravada no servidor; só a tela atual é de outra conversa.
        void carregarThreads();
        return;
      }
      setThreadId(data.thread_id);
      guardarConversa(data.thread_id);
      if (typeof data.resposta === "string") {
        const resposta = data.resposta;
        const { botoes, cartoes, propostas, checkup, testes } = acoesValidas(data.acoes);
        setMensagens((atuais) => [
          ...atuais,
          {
            id: `${turnId}-ai`,
            author_kind: "ai",
            body: corpoSemAviso(resposta, data.aviso),
            aviso: data.aviso ?? null,
            botoes,
            cartoes,
            propostas,
            ...(checkup === null ? {} : { checkup }),
            ...(testes.length === 0 ? {} : { testes }),
          },
        ]);
        // Cartão novo pede fila nova: o conteúdo dele vem de lá.
        if (propostas.length > 0) void qc.invalidateQueries({ queryKey: FILA_DE_PROPOSTAS });
        // Detalhe 1: propostas que já tiveram cartão não voltam no anúncio de pendentes.
        for (const id of propostas) propostasJaExibidasComoCartao.current.add(id);
      } else {
        // Replay: a rota devolveu o turno gravado, sem o texto avulso.
        await abrirThread(data.thread_id);
      }
      void carregarThreads();
    } catch {
      await falhou(null);
    } finally {
      turnoAtual.current = null;
      setEnviando(false);
      setAndamento([]);
    }
  }

  function abrirTela(href: string) {
    // A navegação só acontece aqui, no clique, e só para dentro do produto.
    if (!ehDestinoInterno(href)) return;
    router.push(href);
    aoAbrirTela();
  }

  function abrirNovaConversa() {
    versao.current += 1;
    guardarConversa(null);
    setThreadId(null);
    setMensagens([]);
    setErro(null);
    setPergunta("");
  }

  // O menu de comandos: quem não administra não vê o `/pendentes` (conveniência
  // de tela — o servidor recusa o comando digitado à mão).
  const linhasDoMenu = useMemo(
    () => linhasDaAjuda(t).filter((l) => ehAdmin || !l.soAdmin),
    [t, ehAdmin],
  );
  const linhasFiltradas = useMemo(
    () => linhasDoMenu.filter((l) => `/${l.comando}`.startsWith(pergunta.trim().toLowerCase())),
    [linhasDoMenu, pergunta],
  );
  const menuAberto =
    !menuDispensado && ehComandoEmDigitacao(pergunta) && linhasFiltradas.length > 0;
  const indiceEfetivo = Math.max(0, Math.min(indiceDoMenu, linhasFiltradas.length - 1));

  function escolherComando(comando: string) {
    setPergunta(`/${comando}`);
    setMenuDispensado(true);
    campo.current?.focus();
  }

  /**
   * O áudio virou texto: vai para o CAMPO, ao fim do que já estava escrito, para a
   * pessoa conferir. NUNCA envia — quem envia é a pessoa.
   */
  function textoTranscrito(texto: string) {
    setErro(null);
    setPergunta((atual) => `${atual.trim() === "" ? "" : `${atual.trim()} `}${texto}`.slice(0, 1000));
    setMenuDispensado(true);
    campo.current?.focus();
  }

  /** Deixa no campo a frase que o cartão de checkup pediu (a pessoa confere e envia). */
  function pedirAoAssistente(frase: string) {
    setPergunta(frase);
    setMenuDispensado(true);
    campo.current?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={abrirNovaConversa}
          data-testid="assistente-nova-conversa"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          {t("Nova conversa")}
        </button>
        {threads.length > 0 ? (
          <select
            aria-label={t("Conversas")}
            value={threadId ?? ""}
            onChange={(e) => {
              if (e.target.value !== "") void abrirThread(e.target.value);
            }}
            className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">{t("Conversas anteriores")}</option>
            {threads.map((th) => (
              <option key={th.id} value={th.id}>
                {new Date(th.last_message_at ?? th.created_at).toLocaleString()}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div
        ref={lista}
        role="log"
        aria-live="polite"
        data-testid="assistente-mensagens"
        className="flex min-h-48 flex-1 flex-col gap-2 overflow-y-auto rounded-md border p-3"
      >
        {mensagens.map((m) => (
          <div
            key={m.id}
            className={m.author_kind === "human" ? "flex flex-col items-end gap-1" : "flex flex-col items-start gap-1"}
          >
            {m.aviso !== undefined && m.aviso !== null && m.aviso !== "" ? (
              <p role="note" className="max-w-full rounded-md border border-dashed px-3 py-2 text-xs text-text-muted">
                {m.aviso}
              </p>
            ) : null}
            {m.body !== "" ? (
              m.author_kind === "human" ? (
                <p className="max-w-[85%] rounded-md bg-primary/10 border border-primary/30 px-3 py-2 text-sm whitespace-pre-wrap">
                  {m.body}
                </p>
              ) : (
                <div
                  role={m.desfecho === "erro" ? "alert" : undefined}
                  data-testid={m.desfecho === undefined ? undefined : "assistente-desfecho"}
                  className={
                    m.desfecho === "erro"
                      ? "max-w-[85%] rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm whitespace-pre-wrap space-y-2"
                      : m.desfecho === "ok"
                        ? "max-w-[85%] rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm whitespace-pre-wrap space-y-2"
                        : "max-w-[85%] rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap space-y-2"
                  }
                >
                  <TextoDoAssistente texto={m.body} />
                {m.proximosPassos !== undefined && m.proximosPassos.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    <p className="text-xs font-medium text-text-muted mr-1">{t("Falta:")}</p>
                    {m.proximosPassos.map((passo) => (
                      <button
                        key={passo.href}
                        type="button"
                        onClick={() => abrirTela(passo.href)}
                        data-testid="assistente-proximo-passo"
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                      >
                        {t(passo.texto)}
                      </button>
                    ))}
                  </div>
                ) : null}
                </div>
              )
            ) : null}
            {m.botoes !== undefined && m.botoes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {m.botoes.map((acao) => (
                  <button
                    key={acao.href}
                    type="button"
                    onClick={() => abrirTela(acao.href)}
                    data-testid="assistente-acao"
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    {acao.rotulo}
                  </button>
                ))}
              </div>
            ) : null}
            {m.cartoes !== undefined && m.cartoes.length > 0 ? (
              <div className="flex flex-col gap-2">
                {m.cartoes.map((cartao) => (
                  <div
                    key={cartao.href}
                    role="region"
                    aria-label={cartao.nome}
                    data-testid="assistente-cartao"
                    className="max-w-full rounded-md border px-3 py-2"
                  >
                    <p className="text-xs font-medium">{t("Criado como rascunho")}</p>
                    <p className="text-sm">{cartao.artefato === "agente" ? t("Agente") : t("Follow-up")}</p>
                    <p className="text-sm font-medium">{cartao.nome}</p>
                    <p className="text-xs text-text-muted">{t("Nada foi publicado.")}</p>
                    <button
                      type="button"
                      onClick={() => abrirTela(cartao.href)}
                      data-testid="assistente-cartao-abrir"
                      className="mt-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                      {cartao.rotulo}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {m.testes !== undefined && m.testes.length > 0 ? (
              <div className="flex w-full flex-col gap-2">
                {m.testes.map((teste, i) => (
                  <div
                    key={`${m.id}-teste-${i}`}
                    role="region"
                    aria-label={t("Resultado do teste do agente")}
                    data-testid="assistente-teste"
                    className="max-w-full rounded-md border px-3 py-2"
                  >
                    <p className="text-xs font-medium">
                      {t("Teste do agente")}
                      {teste.versao > 0 ? ` · ${t("versão")} ${teste.versao}` : ""}
                    </p>
                    {teste.resultados.map((r, j) => (
                      <div key={j} className="mt-1 text-sm">
                        <p className="text-xs text-text-muted">
                          {t("Perguntei")}: "{r.mensagem}"
                        </p>
                        <p className="whitespace-pre-wrap">{r.resposta}</p>
                        <p className="text-xs font-medium">
                          {r.simulado
                            ? t("Teste simulado: não chamou o modelo de verdade.")
                            : r.passou
                              ? t("Passou no teste")
                              : t("Não passou no teste")}
                          {r.ferramentas.length > 0 ? ` · ${t("usou")}: ${r.ferramentas.join(", ")}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
            {m.propostas !== undefined && m.propostas.length > 0 ? (
              <div className="flex w-full flex-col gap-2">
                {m.propostas.map((id) => (
                  <CartaoDeProposta
                    key={id}
                    id={id}
                    proposta={propostasPorId.get(id) ?? null}
                    nomeDe={nomeDe}
                    ocupado={ocupado !== null}
                    erro={errosDeAcao[id] ?? null}
                    aoAplicar={(alvo) => void agir(alvo, "aplicar")}
                    aoNao={(alvo) => void agir(alvo, "nao")}
                  />
                ))}
              </div>
            ) : null}
            {m.checkup !== undefined ? (
              <CartaoDeCheckup
                rodou={m.checkup.rodou}
                snapshot={m.checkup.snapshot}
                anterior={m.checkup.anterior}
                aoPedir={pedirAoAssistente}
              />
            ) : null}
          </div>
        ))}
        {/* O lote vive aqui, e não preso a uma mensagem: proposta criada na própria
            conversa, /pendentes e o aviso ao abrir o painel mostram o mesmo botão,
            enquanto houver 2+ mudanças seguras pendentes. */}
        {temLoteSeguro && !enviando ? (
          <div className="flex flex-wrap gap-2 mt-1">
            <button
              type="button"
              disabled={loteOcupado}
              onClick={() => void aplicarLoteSeguro(idsSeguros)}
              data-testid="assistente-lote-seguro"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {t("Aprovar tudo ({n})").replace("{n}", String(idsSeguros.length))}
            </button>
          </div>
        ) : null}
        {enviando || retomando ? (
          <p role="status" data-testid="assistente-pensando" className="self-start text-sm text-text-muted">
            {enviando ? t("Pensando…") : t("Seu pedido continua em andamento. Deixe esta janela aberta: a resposta aparece aqui.")}
          </p>
        ) : null}
        {!enviando && !retomando && mensagens.length > 0 && mensagens[mensagens.length - 1]!.author_kind === "ai" && /(^|\n)\s*\**Falta:/.test(mensagens[mensagens.length - 1]!.body) ? (
          <div className="flex self-start">
            <button
              type="button"
              onClick={() => void perguntar(t("Continue de onde parou: termine tudo o que ainda falta do meu pedido, sem me perguntar mais nada."))}
              data-testid="assistente-continuar"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              {t("Continuar de onde parou")}
            </button>
          </div>
        ) : null}
        {enviando && andamento.length > 0 ? (
          <ul data-testid="assistente-andamento" className="flex flex-col gap-1 self-start text-sm">
            {andamento.map((a) => (
              <li key={a.chave} className="rounded-md border px-3 py-1.5">
                <p className="text-xs font-medium">{a.texto}</p>
                {a.resposta !== undefined ? <p className="whitespace-pre-wrap">{a.resposta}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {mensagens.length === 0 && !enviando ? (
          <p className="text-sm text-text-muted">{t("Pergunte sobre a operação ou os guias.")}</p>
        ) : null}
      </div>
      {erro !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Responder "pode" ao cartão é decidir: aplica a última mudança pendente
          // desta conversa (só administrador; a rota confere de novo).
          const decidirPorTexto = ehAdmin && APLICAR_POR_TEXTO.test(pergunta.trim());
          const alvo = decidirPorTexto ? ultimaPendente() : null;
          if (alvo !== null) {
            setMensagens((atuais) => [
              ...atuais,
              { id: `local-${randomId()}`, author_kind: "human", body: pergunta.trim() },
            ]);
            setPergunta("");
            void agir(alvo, "aplicar");
            return;
          }
          void perguntar(pergunta);
        }}
        className="flex flex-col gap-2"
      >
        {menuAberto ? (
          <MenuDeComandos
            linhas={linhasFiltradas}
            indice={indiceEfetivo}
            aoEscolher={escolherComando}
          />
        ) : null}
        <div className="flex gap-2">
          <input
            ref={campo}
            value={pergunta}
            onChange={(e) => {
              setPergunta(e.target.value);
              setMenuDispensado(false);
              setIndiceDoMenu(0);
            }}
            onKeyDown={(e) => {
              if (!menuAberto) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndiceDoMenu((i) => (i + 1) % linhasFiltradas.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndiceDoMenu((i) => (i - 1 + linhasFiltradas.length) % linhasFiltradas.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                const linha = linhasFiltradas[indiceEfetivo];
                if (linha === undefined) return;
                e.preventDefault();
                escolherComando(linha.comando);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setMenuDispensado(true);
              }
            }}
            maxLength={1000}
            placeholder={t("Escreva sua pergunta...")}
            aria-label={t("Pergunta")}
            data-testid="assistente-pergunta"
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <BotaoDeAudio
            desabilitado={enviando}
            aoTranscrever={textoTranscrito}
            aoErro={(mensagem) => setErro(mensagem)}
          />
          <button
            type="submit"
            disabled={enviando || pergunta.trim().length < 3}
            data-testid="assistente-perguntar"
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {t("Enviar")}
          </button>
        </div>
      </form>
    </div>
  );
}
