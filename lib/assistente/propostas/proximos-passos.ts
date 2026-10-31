/**
 * PRÓXIMOS PASSOS depois de aplicar uma proposta do assistente.
 *
 * Lista FECHADA no código: cada porta de criação mapeia para os passos que
 * faltam fazer na tela. A função é PURA — não lê banco, não chama rede, não
 * depende de sessão. Os textos são chaves do dicionário (a tela traduz com
 * `t()`); o espanhol é obrigatório nas entradas vizinhas.
 *
 * `criado.id` é o id do artefato nascido da aplicação (quando a rota de aplicar
 * o devolve). Quando não há id, o href aponta para a lista sem id.
 */
export type ProximoPasso = { texto: string; href: string };

/** Portas que já são um passo de publicação: não há o que fazer depois. */
const PORTA_DE_PUBLICACAO = /^(ai\/agents\/[0-9a-f-]+\/publish|ai\/followup-flows\/[0-9a-f-]+\/publish)$/i;

/** Porta de criação de agente (com ou without id no caminho). */
const PORTA_AGENTES_CRIAR = /^ai\/agents$/;

/** Porta de criação de follow-up (com ou without id no caminho). */
const PORTA_FOLLOWUP_CRIAR = /^ai\/followup-flows(\/from-model)?$/;

/** Porta de criação de funil. */
const PORTA_PIPELINES = /^pipelines$/;

export function proximosPassosDaAcao(
  payload: { porta: string; metodo: string },
  criado: { id?: string } | null,
): ProximoPasso[] {
  const { porta, metodo } = payload;

  // Somente escritas por POST criam algo que precise de passo seguinte.
  if (metodo !== "POST") return [];

  // Publish já é o passo final: nada falta depois.
  if (PORTA_DE_PUBLICACAO.test(porta)) return [];

  // ai/agents POST — criar agente
  if (PORTA_AGENTES_CRIAR.test(porta)) {
    const hrefAgente = criado?.id ? `/app/ai/agents/${criado.id}` : "/app/ai/agents";
    return [
      { texto: "Publicar o agente quando o texto estiver pronto", href: hrefAgente },
      { texto: "Ligar o agente ao número do WhatsApp num roteador", href: "/app/ai/routers" },
    ];
  }

  // ai/followup-flows POST ou ai/followup-flows/from-model POST — criar follow-up
  if (PORTA_FOLLOWUP_CRIAR.test(porta)) {
    const hrefFollowup = criado?.id ? `/app/ai/followups/${criado.id}` : "/app/ai/followups";
    return [{ texto: "Revisar e publicar o follow-up", href: hrefFollowup }];
  }

  // pipelines POST — criar funil
  if (PORTA_PIPELINES.test(porta)) {
    return [{ texto: "Conferir as etapas do funil", href: "/app/kanban" }];
  }

  // Qualquer outra porta: nada a fazer.
  return [];
}
