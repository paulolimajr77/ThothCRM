/**
 * `atualizarDadosDoContato` — no `23505`, o valor colidido vira
 * `source_metadata.telefone_em_conflito` ou `source_metadata.email_em_conflito`,
 * por merge no jsonb (nunca apaga as outras chaves), e o outro campo segue.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import { atualizarDadosDoContato } from "./ingest";

const ORG = "11111111-1111-4111-8111-111111111111";
const CONTATO_ID = "55555555-5555-5555-8555-555555555555";

const inputBase = {
  organizationId: ORG,
  contactId: CONTATO_ID,
  contato: { nome: "Ana", telefone: "+5511999999999", email: "ana@exemplo.com.br" },
  coleta: { nome: "opcional", telefone: "opcional", email: "opcional" } as const,
};

/** Fake mínimo do Supabase para contacts. Rastreia patches de update e devolve metadados. */
function criarAdmin(opcoes: {
  metadadosIniciais?: Record<string, unknown>;
  erroUpdate?: (patch: Record<string, unknown>) => { error: { code: string } | null };
}): SupabaseClient & { patches: Record<string, unknown>[] } {
  let metadados = opcoes.metadadosIniciais ?? {};
  const patches: Record<string, unknown>[] = [];

  const builder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    maybeSingle: () =>
      Promise.resolve({ data: { source_metadata: metadados }, error: null }),
    update: (patch: Record<string, unknown>) => {
      patches.push(patch);
      const erro = opcoes.erroUpdate ? opcoes.erroUpdate(patch) : { error: null };
      if (!erro.error && patch.source_metadata) {
        metadados = { ...metadados, ...(patch.source_metadata as Record<string, unknown>) };
      }
      // Como o cliente real: `.eq(...).eq(...)` encadeia, e a resposta chega no `await`.
      const resposta = { error: erro.error };
      const encadeado = {
        eq: () => encadeado,
        then: (ok: (v: typeof resposta) => unknown, falha?: (e: unknown) => unknown) =>
          Promise.resolve(resposta).then(ok, falha),
      };
      return encadeado;
    },
  };

  const admin = {
    from: () => builder,
  } as unknown as SupabaseClient & { patches: Record<string, unknown>[] };
  admin.patches = patches;
  return admin;
}

function patchesDe(admin: SupabaseClient): Record<string, unknown>[] {
  return (admin as unknown as { patches: Record<string, unknown>[] }).patches;
}

describe("atualizarDadosDoContato — conflito de telefone/e-mail em 23505", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("telefone em conflito: grava telefone_em_conflito no source_metadata por merge, preserva outras chaves", async () => {
    const admin = criarAdmin({
      metadadosIniciais: { origem_anterior: "site" },
      erroUpdate: (patch) => {
        if ("phone_number" in patch) return { error: { code: "23505" } };
        return { error: null };
      },
    });

    await atualizarDadosDoContato(admin as never, inputBase as never);

    // O update de source_metadata deve mesclar telefone_em_conflito com origem_anterior.
    const patchesMeta = patchesDe(admin as never).filter((p) => p && "source_metadata" in p);
    expect(patchesMeta).toHaveLength(1);
    expect(patchesMeta[0]!.source_metadata).toEqual({
      origem_anterior: "site",
      telefone_em_conflito: "+5511999999999",
    });
  });

  it("e-mail em conflito: grava email_em_conflito no source_metadata, preserva outras chaves", async () => {
    const admin = criarAdmin({
      metadadosIniciais: { telefone_em_conflito: "+5511888888888" },
      erroUpdate: (patch) => {
        if ("email" in patch) return { error: { code: "23505" } };
        return { error: null };
      },
    });

    await atualizarDadosDoContato(admin as never, inputBase as never);

    const patchesMeta = patchesDe(admin as never).filter((p) => p && "source_metadata" in p);
    expect(patchesMeta).toHaveLength(1);
    expect(patchesMeta[0]!.source_metadata).toEqual({
      telefone_em_conflito: "+5511888888888",
      email_em_conflito: "ana@exemplo.com.br",
    });
  });

  it("telefone e e-mail em conflito: grava ambos no source_metadata por merge sequencial", async () => {
    const admin = criarAdmin({
      metadadosIniciais: {},
      erroUpdate: (patch) => {
        if ("phone_number" in patch || "email" in patch) return { error: { code: "23505" } };
        return { error: null };
      },
    });

    await atualizarDadosDoContato(admin as never, inputBase as never);

    const patchesMeta = patchesDe(admin as never).filter((p) => p && "source_metadata" in p);
    expect(patchesMeta).toHaveLength(2);
    expect(patchesMeta[0]!.source_metadata).toEqual({
      telefone_em_conflito: "+5511999999999",
    });
    expect(patchesMeta[1]!.source_metadata).toEqual({
      telefone_em_conflito: "+5511999999999",
      email_em_conflito: "ana@exemplo.com.br",
    });
  });

  it("sem conflito: grava telefone e e-mail normalmente, sem source_metadata de conflito", async () => {
    const admin = criarAdmin({
      metadadosIniciais: {},
      erroUpdate: () => ({ error: null }),
    });

    await atualizarDadosDoContato(admin as never, inputBase as never);

    const patchesMeta = patchesDe(admin as never).filter((p) => p && "source_metadata" in p);
    expect(patchesMeta).toHaveLength(0);
  });

  it("apenas telefone, sem conflito: não grava source_metadata de conflito", async () => {
    const admin = criarAdmin({
      metadadosIniciais: {},
      erroUpdate: () => ({ error: null }),
    });

    await atualizarDadosDoContato(admin as never, {
      ...inputBase,
      contato: { telefone: "+5511999999999" },
    });

    const patchesMeta = patchesDe(admin as never).filter((p) => p && "source_metadata" in p);
    expect(patchesMeta).toHaveLength(0);
  });
});
