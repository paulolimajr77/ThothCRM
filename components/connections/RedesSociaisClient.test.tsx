import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RedesSociaisClient } from "./RedesSociaisClient";
const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: h }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("./ChannelAiAccess", () => ({ ChannelAiAccess: () => <div>IA pausada</div> }));
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RedesSociaisClient />
    </QueryClientProvider>,
  );
}
it("shows connected networks and offers inbox only where implemented", async () => {
  h.get.mockResolvedValue({
    data: {
      configured: true,
      label: "Partner",
      networks: [
        { id: "instagram", label: "Instagram" },
        { id: "linkedin", label: "LinkedIn" },
      ],
      accounts: [
        {
          id: "a",
          platform: "instagram",
          username: "brand",
          active: true,
          inbox_supported: true,
          channel: null,
        },
        {
          id: "b",
          platform: "linkedin",
          username: "person",
          active: true,
          inbox_supported: false,
          channel: null,
        },
      ],
    },
  });
  h.post.mockResolvedValue({ data: { channel_id: "c" } });
  mount();
  await screen.findByText("brand");
  expect(screen.getAllByRole("button", { name: "Receber no atendimento" })).toHaveLength(1);
  expect(h.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Receber no atendimento" }));
  await screen.findByText("person");
  expect(h.post).toHaveBeenCalledWith("/api/v1/channels/social", {
    action: "inbox",
    account_id: "a",
  });
});
it("shows errors rather than a false empty or connected state", async () => {
  h.get.mockRejectedValue(new Error("Credencial recusada"));
  mount();
  expect((await screen.findByRole("alert")).textContent).toContain("Credencial recusada");
});
it("shows provider-missing channels as removable orphans with pause support", async () => {
  h.get.mockResolvedValue({
    data: {
      configured: true,
      label: "Partner",
      networks: [{ id: "instagram", label: "Instagram" }],
      accounts: [],
      orphaned_channels: [
        {
          id: "chan-orfa",
          account_id: "sumida",
          display_name: "instagram · sumida",
          status: "FAILED",
          metadata: {},
          updated_at: "2026-10-05T00:00:00Z",
        },
      ],
    },
  });
  mount();
  await screen.findByText("Conexões sem conta no provedor");
  await screen.findByText("instagram · sumida");
  expect(screen.getByRole("button", { name: "Excluir" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
  await screen.findByText("instagram · sumida");
  expect(h.patch).toHaveBeenCalledWith("/api/v1/channel-sessions/chan-orfa/disabled", {
    disabled: true,
  });
});
