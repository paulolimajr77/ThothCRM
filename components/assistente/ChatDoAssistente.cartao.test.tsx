/**
 * O CARTÃO "CRIADO COMO RASCUNHO" NO PAINEL (T16).
 *
 * Arquivo próprio (não no `assistente-painel-lateral`): aqui o `useT` é
 * dublado com o DICIONÁRIO de verdade, para provar o espanhol — lá ele é
 * identidade e tudo "passaria" em qualquer idioma.
 *
 * Ordem A — depois de aplicar, o chat diz o que falta.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ChatDoAssistente } from "@/components/assistente/ChatDoAssistente";
import { CartaoDeProposta } from "@/components/assistente/CartaoDeProposta";
import { traduzir } from "@/lib/i18n/dicionario";
import { proximosPassosDaAcao } from "@/lib/assistente/propostas/proximos-passos";

const idioma = vi.hoisted(() => ({ atual: "pt-BR" }));
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/inbox",
  useRouter: () => ({ push }),
}));
vi.mock("@/hooks/i18n/useT", () => ({
  useT: () => (texto: string) => traduzir(texto, idioma.atual as "pt-BR" | "es"),
}));

const rede = vi.hoisted(() => ({
  chat: undefined as undefined | (() => Promise<unknown>),
}));

globalThis.fetch = (async (url: string) => {
  if (typeof url === "string" && url.startsWith("/api/v1/ai/assistente/threads?")) {
    return { ok: true, status: 200, json: async () => ({ data: { threads: [] } }) };
  }
  if (url === "/api/v1/ai/assistente/chat") {
    return (await rede.chat?.()) as Response;
  }
  throw new Error(`fetch inesperado: ${url}`);
}) as typeof fetch;

function respostaDoChat(acoes: unknown[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        thread_id: "thread-1",
        turn_id: "t",
        resposta: "Pronto!",
        fonte: "modelo",
        aviso: null,
        acoes,
        metricas: [],
        replay: false,
      },
    }),
  };
}

async function perguntar(texto: string) {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByTestId("assistente-pergunta"), texto);
  await usuario.click(screen.getByTestId("assistente-perguntar"));
  return usuario;
}

/**
 * O chat usa `useQuery` (a fila de propostas), então precisa do provider — é o
 * que o app real tem em `app/providers.tsx`.
 */
function montar(props: { aoAbrirTela: () => void }) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ChatDoAssistente aberto aoAbrirTela={props.aoAbrirTela} />
    </QueryClientProvider>,
  );
}

const CARTAO_AGENTE = {
  tipo: "artefato",
  artefato: "agente",
  nome: "Recepção Aurora",
  rotulo: "Abrir o agente",
  href: "/app/ai/agents/ag-novo",
};

const CARTAO_FOLLOWUP = {
  tipo: "artefato",
  artefato: "followup",
  nome: "Exame marcado",
  rotulo: "Abrir o follow-up",
  href: "/app/ai/followups/ptr-1",
};

describe("cartão de rascunho no painel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    idioma.atual = "pt-BR";
    rede.chat = undefined;
  });

  it("E. cartão aparece com título, tipo, nome, aviso e botão", async () => {
    rede.chat = async () => respostaDoChat([CARTAO_AGENTE, CARTAO_FOLLOWUP]);
    montar({ aoAbrirTela: () => {} });
    await perguntar("crie o atendimento");
    await screen.findByText("Pronto!");

    const cartoes = screen.getAllByTestId("assistente-cartao");
    expect(cartoes).toHaveLength(2);
    expect(screen.getAllByText("Criado como rascunho")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Recepção Aurora" })).toBeTruthy();
    expect(screen.getByText("Agente")).toBeTruthy();
    expect(screen.getByText("Follow-up")).toBeTruthy();
    expect(screen.getAllByText("Nada foi publicado.")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Abrir o agente" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir o follow-up" })).toBeTruthy();
  });

  it("E2. href externo ou artefato desconhecido não vira cartão (o válido continua)", async () => {
    rede.chat = async () =>
      respostaDoChat([
        { tipo: "artefato", artefato: "agente", nome: "X", rotulo: "Abrir", href: "https://evil.example/app/x" },
        { tipo: "artefato", artefato: "agente", nome: "X", rotulo: "Abrir", href: "//evil.example/app/x" },
        { tipo: "artefato", artefato: "agente", nome: "X", rotulo: "Abrir", href: "/app/../x" },
        { tipo: "artefato", artefato: "nave", nome: "X", rotulo: "Abrir", href: "/app/ai/agents/ag-novo" },
        { tipo: "artefato", artefato: "agente", nome: 123, rotulo: "Abrir", href: "/app/ai/agents/ag-novo" },
        CARTAO_AGENTE,
      ]);
    montar({ aoAbrirTela: () => {} });
    await perguntar("crie o atendimento");
    await screen.findByText("Pronto!");

    expect(screen.getAllByTestId("assistente-cartao")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Recepção Aurora" })).toBeTruthy();
  });

  it("E3. o clique no botão do cartão navega e chama aoAbrirTela", async () => {
    rede.chat = async () => respostaDoChat([CARTAO_AGENTE]);
    const aoAbrirTela = vi.fn();
    montar({ aoAbrirTela });
    const usuario = await perguntar("crie o atendimento");
    await screen.findByText("Pronto!");

    expect(push).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Abrir o agente" }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/app/ai/agents/ag-novo");
    expect(aoAbrirTela).toHaveBeenCalledTimes(1);
  });

  it("E4. em espanhol os rótulos do cartão saem em espanhol", async () => {
    idioma.atual = "es";
    rede.chat = async () =>
      respostaDoChat([
        { ...CARTAO_AGENTE, rotulo: "Abrir el agente" },
        { ...CARTAO_FOLLOWUP, rotulo: "Abrir el seguimiento" },
      ]);
    montar({ aoAbrirTela: () => {} });
    await perguntar("crie o atendimento");
    await screen.findByText("Pronto!");

    expect(screen.getAllByText("Creado como borrador")).toHaveLength(2);
    expect(screen.getByText("Agente")).toBeTruthy();
    expect(screen.getByText("Seguimiento")).toBeTruthy();
    expect(screen.getAllByText("No se publicó nada.")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Abrir el agente" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir el seguimiento" })).toBeTruthy();
    // O nome é dado, não se traduz.
    expect(screen.getByRole("region", { name: "Recepção Aurora" })).toBeTruthy();
  });
});

/**
 * Ordem A — depois de aplicar, o assistente diz o que falta.
 */
describe("ordem A — próximos passos depois de aplicar", () => {
  it("proximosPassosDaO ai/agents POST com id: publicar agente + ligar ao WhatsApp", () => {
    const passos = proximosPassosDaAcao(
      { porta: "ai/agents", metodo: "POST" },
      { id: "11111111-2222-4333-8444-555555555555" },
    );
    expect(passos).toEqual([
      { texto: "Publicar o agente quando o texto estiver pronto", href: "/app/ai/agents/11111111-2222-4333-8444-555555555555" },
      { texto: "Ligar o agente ao número do WhatsApp num roteador", href: "/app/ai/routers" },
    ]);
  });

  it("proximosPassosDaO ai/agents POST sem id: href da lista", () => {
    const passos = proximosPassosDaAcao({ porta: "ai/agents", metodo: "POST" }, null);
    expect(passos).toEqual([
      { texto: "Publicar o agente quando o texto estiver pronto", href: "/app/ai/agents" },
      { texto: "Ligar o agente ao número do WhatsApp num roteador", href: "/app/ai/routers" },
    ]);
  });

  it("proximosPassosDaO follow-up POST com id: revisar e publicar", () => {
    const passos = proximosPassosDaAcao(
      { porta: "ai/followup-flows", metodo: "POST" },
      { id: "22222222-3333-4444-8444-555555555555" },
    );
    expect(passos).toEqual([
      { texto: "Revisar e publicar o follow-up", href: "/app/ai/followups/22222222-3333-4444-8444-555555555555" },
    ]);
  });

  it("proximosPassosDaO pipelines POST: conferir etapas do funil", () => {
    const passos = proximosPassosDaAcao({ porta: "pipelines", metodo: "POST" }, null);
    expect(passos).toEqual([
      { texto: "Conferir as etapas do funil", href: "/app/kanban" },
    ]);
  });

  it("proximosPassosDaO publish POST: lista vazia", () => {
    expect(
      proximosPassosDaAcao(
        { porta: "ai/agents/11111111-2222-4333-8444-555555555555/publish", metodo: "POST" },
        null,
      ),
    ).toEqual([]);
    expect(
      proximosPassosDaAcao(
        { porta: "ai/followup-flows/22222222-3333-4444-8444-555555555555/publish", metodo: "POST" },
        null,
      ),
    ).toEqual([]);
  });

  it("proximosPassosDaO porta desconhecida: lista vazia", () => {
    expect(proximosPassosDaAcao({ porta: "contatos", metodo: "POST" }, null)).toEqual([]);
    expect(proximosPassosDaAcao({ porta: "ai/agents", metodo: "GET" }, null)).toEqual([]);
  });
});

/**
 * CartaoDeProposta: kind "acao" mostra "Mudança" (Detalhe 2).
 */
describe("CartaoDeProposta — tipo acao", () => {
  function montarCartao(p: { kind: string; operacao: string | null }) {
    return render(
      <CartaoDeProposta
        id="11111111-2222-4333-8444-555555555555"
        proposta={{
          id: "11111111-2222-4333-8444-555555555555",
          kind: p.kind,
          operacao: p.operacao,
          risk: "seguro",
          status: "pendente",
          resumo: "Mudar algo",
          motivo: "teste",
          antes: null,
          payload: null,
          requested_by: "user-1",
          decided_by: null,
          decided_at: null,
          decision_reason: null,
          applied_by: null,
          applied_at: null,
          apply_result: null,
          expires_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
          created_at: "2026-10-16T09:00:00Z",
          vencida: false,
        }}
        nomeDe={() => "Ana"}
        ocupado={false}
        erro={null}
        aoAplicar={() => {}}
        aoNao={() => {}}
      />,
    );
  }

  afterEach(() => {
    cleanup();
    idioma.atual = "pt-BR";
  });

  it("kind 'acao' mostra 'Mudança' e não 'acao'", () => {
    montarCartao({ kind: "acao", operacao: null });
    expect(screen.getByText("Mudança ·")).toBeTruthy();
    expect(screen.queryByText("acao")).toBeNull();
  });

  it("em espanhol, kind 'acao' mostra 'Cambio'", () => {
    idioma.atual = "es";
    montarCartao({ kind: "acao", operacao: null });
    expect(screen.getByText("Cambio ·")).toBeTruthy();
  });
});
