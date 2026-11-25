/**
 * Chat no site, F5 — a origem da página, provada PELA TELA (roteiro C10).
 * Quem visita manda a 1ª mensagem de uma página com UTM; o operador lê a origem na ficha
 * e acha a conversa no Inbox, com o selo "Chat no site".
 */
import { createClient } from "@supabase/supabase-js";

import { credenciaisSupabaseDeTeste } from "../../scripts/lib/env-de-teste";
import { expect, test } from "./helpers/test";
import { lerCreds, loginComoAdmin, type CredsE2E } from "./helpers/login-admin";

const credenciais = credenciaisSupabaseDeTeste();
const db = createClient(credenciais.url, credenciais.serviceRole, { auth: { persistSession: false } });

const CHAVE_MODULO = "MODULO_CANAL_WEBCHAT";
const CAMINHO = "/site-de-teste/natal";
const QUERY = "?utm_source=instagram&utm_campaign=natal";
const TEXTO = `Oi, vim pelo Instagram ${Date.now()}`;

test.describe.configure({ timeout: 240_000 });
test.use({ viewport: { width: 1400, height: 900 } });

let creds: CredsE2E;
let moduloAntes: string | null = null;

test.beforeAll(async () => {
  creds = lerCreds();
  const m = await db.from("platform_config").select("valor").eq("chave", CHAVE_MODULO).maybeSingle();
  moduloAntes = (m.data?.valor as string | null) ?? null;
  const ligar = await db
    .from("platform_config")
    .upsert({ chave: CHAVE_MODULO, valor: "ligado", eh_segredo: false, semeado_do_env: false }, { onConflict: "chave" });
  if (ligar.error) throw ligar.error;
});

test.afterAll(async () => {
  if (moduloAntes === null) await db.from("platform_config").delete().eq("chave", CHAVE_MODULO);
  else
    await db
      .from("platform_config")
      .upsert({ chave: CHAVE_MODULO, valor: moduloAntes, eh_segredo: false, semeado_do_env: false }, { onConflict: "chave" });
});

test("C10: a 1ª mensagem de uma página com UTM grava a origem na ficha e a conversa está no Inbox", async ({ page, browser }) => {
  // 1) O operador ativa o chat pela tela.
  await loginComoAdmin(page, creds);
  // O "site" do cliente é servido no mesmo endereço do app (localhost): o Chrome barra página pública
  // que busca script em localhost, e o chat aceita http://localhost como domínio em instalação local.
  const base = new URL(page.url()).origin;
  await page.goto("/app/connections");
  await page.getByRole("tab", { name: /Chat no site/ }).click();
  await page.getByLabel("Domínios, um por linha").fill(base);
  await page.getByRole("button", { name: "Ativar chat no site" }).click();
  const codigo = page.locator("#canal-chat-codigo");
  await expect(codigo).toBeVisible({ timeout: 30_000 });
  const trecho = await codigo.inputValue();
  const chave = /wck_[A-Za-z0-9_-]+/.exec(trecho)?.[0];
  expect(chave, "o código para colar tem a chave wck_").toBeTruthy();

  // 2) O visitante abre a página do site (com UTM), que leva o código colado.
  const visitante = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await visitante.route(`${base}${CAMINHO}**`, (rota) =>
    rota.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body><h1>Natal</h1><script src="${base}/webchat.js?k=${chave}" async></script></body></html>`,
    }),
  );
  const site = await visitante.newPage();
  await site.goto(`${base}${CAMINHO}${QUERY}`);
  await site.getByRole("button", { name: "Abrir chat" }).click();
  const janela = site.frameLocator("iframe");
  // Passos antes da conversa: aviso com aceite e/ou coleta (todos opcionais aqui). Clica no que aparecer.
  const campo = janela.locator("#webchat-texto");
  await expect(async () => {
    for (const nome of ["Aceitar e continuar", "Continuar"]) {
      const botao = janela.getByRole("button", { name: nome, exact: true });
      if (await botao.isVisible().catch(() => false)) await botao.click();
    }
    await expect(campo).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 45_000 });
  await campo.fill(TEXTO);
  await janela.locator("#webchat-enviar").click();
  await expect(janela.getByText(TEXTO)).toBeVisible({ timeout: 30_000 });
  await visitante.close();

  // 3) A ficha: a origem aparece como o operador lê.
  const { data: conversa } = await db
    .from("messages")
    .select("contact_id")
    .ilike("body", `%${TEXTO}%`)
    .limit(1)
    .maybeSingle();
  const contatoId = (conversa as { contact_id: string } | null)?.contact_id;
  expect(contatoId, "a mensagem do visitante entrou no banco").toBeTruthy();
  await page.goto(`/app/contacts/${contatoId}`);
  const origem = page.locator("dt", { hasText: /^Origem$/ }).locator("..");
  await expect(origem).toContainText("instagram", { timeout: 30_000 });
  await expect(page.getByText("natal").first()).toBeVisible();
  await page.screenshot({ path: "evidence/chat-no-site-f5/ficha-origem.png", fullPage: true });

  // 4) O Inbox: a conversa aparece com o selo do canal.
  await page.goto("/app/inbox");
  await expect(page.getByText(TEXTO).first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: "evidence/chat-no-site-f5/inbox.png", fullPage: true });
  // Medidas (não param a prova): o selo na lista e na conversa aberta, e o filtro por número.
  const noLista = await page.getByText("Chat no site").count();
  await page.getByText(TEXTO).first().click();
  await page.waitForTimeout(1500);
  const comAberta = await page.getByText("Chat no site").count();
  const filtro = page.getByLabel("Filtrar por número de WhatsApp");
  const filtroVisivel = await filtro.isVisible().catch(() => false);
  let opcoes: string[] = [];
  if (filtroVisivel) {
    await filtro.click();
    opcoes = await page.getByRole("option").allInnerTexts();
  }
  // O filtro de verdade: escolher o chat mostra a conversa; escolher outro número a esconde.
  let filtrouNoChat = false;
  let escondeuNoOutro = false;
  if (filtroVisivel && opcoes.includes("Chat no site")) {
    // Inbox limpo (sem conversa aberta, que também mostra o texto), e espera de verdade.
    await page.goto("/app/inbox");
    const filtro2 = page.getByLabel("Filtrar por número de WhatsApp");
    await filtro2.click();
    await page.getByRole("option", { name: "Chat no site", exact: true }).click();
    filtrouNoChat = await expect(page.getByText(TEXTO).first())
      .toBeVisible({ timeout: 20_000 })
      .then(() => true, () => false);
    await filtro2.click();
    const outro = opcoes.find((o) => o !== "Chat no site" && o !== "Todos os números");
    if (outro) {
      await page.getByRole("option", { name: outro, exact: true }).click();
      escondeuNoOutro = await expect(page.getByText(TEXTO))
        .toHaveCount(0, { timeout: 20_000 })
        .then(() => true, () => false);
    }
  }
  console.log(`MEDIDA-FILTRO escolhendo_chat_mostra=${filtrouNoChat} escolhendo_outro_esconde=${escondeuNoOutro}`);
  expect.soft(filtrouNoChat, "filtrar pelo chat mostra a conversa").toBe(true);
  expect.soft(escondeuNoOutro, "filtrar por outro número esconde a conversa").toBe(true);
  console.log(`MEDIDA-INBOX selo_na_lista=${noLista} selo_com_conversa_aberta=${comAberta} filtro_visivel=${filtroVisivel} opcoes=${JSON.stringify(opcoes)}`);
  await page.screenshot({ path: "evidence/chat-no-site-f5/inbox-aberta.png", fullPage: true });
  expect.soft(comAberta, "o selo Chat no site aparece no Inbox").toBeGreaterThan(0);
});
