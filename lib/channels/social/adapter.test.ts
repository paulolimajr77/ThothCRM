import { beforeEach, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({
  linha: vi.fn(),
  creds: vi.fn(),
  pedido: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ maybeSingle: h.linha }) }) }) }),
      }),
    }),
  }),
}));
vi.mock("@/lib/channels/zernio/credentials", () => ({
  zernioBaseUrl: () => "https://provedor.test/api",
  zernioCredsForAccountId: h.creds,
}));
vi.mock("@/lib/channels/social/client", async (original) => ({
  ...((await (original as () => Promise<object>)()) as object),
  socialRequest: h.pedido,
}));
import { SocialError } from "@/lib/channels/social/client";
import { socialAdapter } from "./adapter";
beforeEach(() => {
  vi.clearAllMocks();
  h.linha.mockResolvedValue({ data: { metadata: { social_webhook_id: "wh-1" } } });
  h.creds.mockResolvedValue({ accountId: "conta-1", apiKey: "chave" });
});
it("chave recusada pelo provedor vira FAILED com causa própria, nunca warn genérico", async () => {
  h.pedido.mockRejectedValue(new SocialError("Acesso recusado. Confira a chave e as permissões no provedor.", 502));
  const saude = await socialAdapter.checkHealth!({ organizationId: "org", sessionRef: "conta-1" });
  expect(saude).toEqual({ reachable: true, status: "FAILED", detail: "credencial_recusada" });
});
it("conta saudável segue WORKING e conta com problema segue FAILED", async () => {
  h.pedido.mockResolvedValueOnce({ status: "healthy" });
  expect(await socialAdapter.checkHealth!({ organizationId: "org", sessionRef: "conta-1" })).toEqual({
    reachable: true,
    status: "WORKING",
    detail: null,
  });
  h.pedido.mockResolvedValueOnce({ status: "error" });
  expect(await socialAdapter.checkHealth!({ organizationId: "org", sessionRef: "conta-1" })).toEqual({
    reachable: true,
    status: "FAILED",
    detail: "conta_requer_atencao",
  });
});
it("oscilação de rede continua sendo dúvida, não queda", async () => {
  h.pedido.mockRejectedValue(new Error("timeout"));
  expect(await socialAdapter.checkHealth!({ organizationId: "org", sessionRef: "conta-1" })).toEqual({
    reachable: false,
    status: null,
    detail: "provedor_indisponivel",
  });
});
