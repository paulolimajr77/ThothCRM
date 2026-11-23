/**
 * `configuracaoDoChatSchema` aceita a pausa do chat (`pausado`), booleana (F2, Task 7),
 * e o teto de respostas da IA para visitante anônimo (`teto_anonimo`), inteiro de 1 a 200 (F4, Task 2).
 */
import { describe, expect, it, vi } from "vitest";

import { configuracaoDoChatSchema } from "@/lib/channels/webchat/config";

vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "https://crm.example.com" } }));
vi.mock("@/lib/webhooks/url-publica", () => ({ enderecoDaPropriaMaquina: () => false }));

describe("configuracaoDoChatSchema: pausado", () => {
  it("aceita pausado verdadeiro e falso", () => {
    expect(configuracaoDoChatSchema.safeParse({ pausado: true }).success).toBe(true);
    expect(configuracaoDoChatSchema.safeParse({ pausado: false }).success).toBe(true);
  });

  it("recusa pausado que não é booleano", () => {
    expect(configuracaoDoChatSchema.safeParse({ pausado: "sim" }).success).toBe(false);
    expect(configuracaoDoChatSchema.safeParse({ pausado: 1 }).success).toBe(false);
  });

  it("pausado é opcional: a configuração sem ele continua válida", () => {
    expect(configuracaoDoChatSchema.safeParse({ titulo: "Oi" }).success).toBe(true);
  });
});

describe("configuracaoDoChatSchema: teto_anonimo", () => {
  it("aceita 1 e 200", () => {
    expect(configuracaoDoChatSchema.safeParse({ teto_anonimo: 1 }).success).toBe(true);
    expect(configuracaoDoChatSchema.safeParse({ teto_anonimo: 200 }).success).toBe(true);
  });

  it("recusa 0, 201 e fracionário", () => {
    expect(configuracaoDoChatSchema.safeParse({ teto_anonimo: 0 }).success).toBe(false);
    expect(configuracaoDoChatSchema.safeParse({ teto_anonimo: 201 }).success).toBe(false);
    expect(configuracaoDoChatSchema.safeParse({ teto_anonimo: 1.5 }).success).toBe(false);
  });

  it("recusa texto no teto_anonimo", () => {
    expect(configuracaoDoChatSchema.safeParse({ teto_anonimo: "vinte" }).success).toBe(false);
  });

  it("teto_anonimo é opcional: ausente continua válido", () => {
    expect(configuracaoDoChatSchema.safeParse({ pausado: true }).success).toBe(true);
  });
});
