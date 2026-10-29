"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  apagarModeloDeCliente,
  salvarRevisaoDoModelo,
  tirarModeloDeCliente,
  type ResultadoDeModeloDeCliente,
} from "@/app/actions/admin/modelosDeCliente";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/i18n/useT";
import type { EstruturaDoModelo } from "@/lib/assistente/modelos-de-cliente/estrutura";
import type { ModeloCompleto, ResumoDoModelo } from "@/lib/assistente/modelos-de-cliente/repositorio";
import { MENSAGEM_DA_RECUSA_DE_ESCRITA, ehRecusaDeEscrita } from "@/lib/auth/recusa-de-escrita-de-admin";

interface Props {
  organizacoes: { id: string; nome: string }[];
  nichos: { id: string; nome: string }[];
  modelos: ResumoDoModelo[];
  aberto: ModeloCompleto | null;
}

const SELECT =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";

/** A mensagem de uma recusa, no idioma da tela. */
function useMensagemDeErro() {
  const t = useT();
  return (r: Exclude<ResultadoDeModeloDeCliente, { ok: true }>): string => {
    if (ehRecusaDeEscrita(r.error)) return t(MENSAGEM_DA_RECUSA_DE_ESCRITA[r.error]);
    if (r.error === "origem_ilegivel") return t("Não consegui ler a empresa escolhida. Tente de novo em instantes.");
    if (r.error === "formato_invalido" && "detalhe" in r) return `${t("O modelo está fora do formato:")} ${r.detalhe}`;
    if (r.error === "texto_sensivel") return t("Ainda há texto que identifica o cliente. Corrija os pontos abaixo.");
    if (r.error === "invalid_input") return t("Confira os campos e tente de novo.");
    return t("Não deu para salvar. Tente de novo em instantes.");
  };
}

export function TelaDeModelosDeCliente({ organizacoes, nichos, modelos, aberto }: Props) {
  return (
    <div className="space-y-6">
      <TirarModelo organizacoes={organizacoes} nichos={nichos} />
      <ListaDeModelos modelos={modelos} abertoId={aberto?.id ?? null} />
      {aberto ? <RevisarModelo key={aberto.id} modelo={aberto} /> : null}
    </div>
  );
}

function TirarModelo({ organizacoes, nichos }: Pick<Props, "organizacoes" | "nichos">) {
  const t = useT();
  const router = useRouter();
  const mensagem = useMensagemDeErro();
  const [org, setOrg] = useState("");
  const [nome, setNome] = useState("");
  const [nicho, setNicho] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function tirar() {
    setErro(null);
    iniciar(async () => {
      const r = await tirarModeloDeCliente({ organization_id: org, nome, nicho: nicho === "" ? null : nicho });
      if (!r.ok) {
        setErro(mensagem(r));
        return;
      }
      router.push(`/admin/modelos-de-cliente?id=${r.id}`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Tirar modelo de um cliente")}</CardTitle>
        <CardDescription>
          {t(
            "O modelo nasce como rascunho: o nome da empresa vira {{negocio}} e telefone, e-mail, site e documento viram uma marca [REVISAR]. Só depois da sua revisão ele pode ser aplicado em outra empresa.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="modelo-origem">{t("Empresa de origem")}</Label>
          <select id="modelo-origem" data-testid="modelo-origem" className={SELECT} value={org} onChange={(e) => setOrg(e.target.value)}>
            <option value="">{t("Escolha a empresa")}</option>
            {organizacoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="modelo-nome">{t("Nome do modelo")}</Label>
          <Input id="modelo-nome" data-testid="modelo-nome" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="modelo-nicho">{t("Ramo")}</Label>
          <select id="modelo-nicho" className={SELECT} value={nicho} onChange={(e) => setNicho(e.target.value)}>
            <option value="">{t("Sem ramo")}</option>
            {nichos.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 sm:col-span-3">
          <Button onClick={tirar} disabled={pendente || org === "" || nome.trim() === ""} data-testid="modelo-tirar">
            {pendente ? t("Tirando…") : t("Tirar modelo")}
          </Button>
          {erro ? (
            <p className="text-sm text-destructive" role="alert">
              {erro}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ListaDeModelos({ modelos, abertoId }: { modelos: ResumoDoModelo[]; abertoId: string | null }) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Modelos")}</CardTitle>
      </CardHeader>
      <CardContent>
        {modelos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Nenhum modelo ainda.")}</p>
        ) : (
          <ul className="divide-y divide-border" data-testid="modelos-lista">
            {modelos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link
                  href={`/admin/modelos-de-cliente?id=${m.id}`}
                  className={abertoId === m.id ? "font-medium underline" : "hover:underline"}
                >
                  {m.nome}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {m.status === "revisado" ? t("Revisado — pode ser aplicado") : t("Rascunho — falta revisar")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RevisarModelo({ modelo }: { modelo: ModeloCompleto }) {
  const t = useT();
  const router = useRouter();
  const mensagem = useMensagemDeErro();
  const [estrutura, setEstrutura] = useState<EstruturaDoModelo>(modelo.estrutura);
  const [erro, setErro] = useState<string | null>(null);
  const [achados, setAchados] = useState<{ onde: string; tipos: string[] }[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [pendente, iniciar] = useTransition();

  const mudarFunil = (i: number, nome: string) =>
    setEstrutura((e) => ({ ...e, funis: e.funis.map((f, j) => (j === i ? { ...f, nome } : f)) }));
  const mudarEtapa = (i: number, k: number, nome: string) =>
    setEstrutura((e) => ({
      ...e,
      funis: e.funis.map((f, j) =>
        j === i ? { ...f, etapas: f.etapas.map((et, l) => (l === k ? { ...et, nome } : et)) } : f,
      ),
    }));
  const mudarAgente = (i: number, campo: "nome" | "descricao" | "prompt", valor: string) =>
    setEstrutura((e) => ({ ...e, agentes: e.agentes.map((a, j) => (j === i ? { ...a, [campo]: valor } : a)) }));
  const tirarFunil = (i: number) => setEstrutura((e) => ({ ...e, funis: e.funis.filter((_, j) => j !== i) }));
  const tirarAgente = (i: number) => setEstrutura((e) => ({ ...e, agentes: e.agentes.filter((_, j) => j !== i) }));
  const tirarFollowup = (i: number) =>
    setEstrutura((e) => ({ ...e, followups: e.followups.filter((_, j) => j !== i) }));

  function salvar() {
    setErro(null);
    setAchados([]);
    setSalvo(false);
    iniciar(async () => {
      const r = await salvarRevisaoDoModelo({ id: modelo.id, estrutura });
      if (r.ok) {
        setSalvo(true);
        router.refresh();
        return;
      }
      setErro(mensagem(r));
      if (r.error === "texto_sensivel" && "achados" in r) setAchados(r.achados);
    });
  }

  function apagar() {
    if (!confirmarApagar) {
      setConfirmarApagar(true);
      return;
    }
    iniciar(async () => {
      const r = await apagarModeloDeCliente({ id: modelo.id });
      if (!r.ok) {
        setErro(mensagem(r));
        return;
      }
      router.push("/admin/modelos-de-cliente");
    });
  }

  return (
    <Card data-testid="modelo-revisao">
      <CardHeader>
        <CardTitle>
          {t("Revisar")} «{modelo.nome}»
        </CardTitle>
        <CardDescription>
          {t(
            "Leia cada texto: tire o que identifica o cliente de origem (nome, endereço, preço, pessoa) e troque as marcas [REVISAR]. {{negocio}} vira o nome da empresa de destino. Ao salvar, o modelo passa a poder ser aplicado.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {modelo.avisos.length > 0 ? (
          <div className="rounded-md border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-950/20">
            <p className="font-medium">{t("O que a limpeza automática fez")}</p>
            <ul className="mt-1 list-disc pl-5" data-testid="modelo-avisos">
              {modelo.avisos.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{t("Funis")}</h2>
          {estrutura.funis.length === 0 ? <p className="text-sm text-muted-foreground">{t("Nenhum funil.")}</p> : null}
          {estrutura.funis.map((f, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex gap-2">
                <Input aria-label={t("Nome do funil")} maxLength={80} value={f.nome} onChange={(e) => mudarFunil(i, e.target.value)} />
                <Button variant="outline" onClick={() => tirarFunil(i)}>
                  {t("Tirar")}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {f.etapas.map((et, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <Input aria-label={t("Nome da etapa")} maxLength={60} value={et.nome} onChange={(e) => mudarEtapa(i, k, e.target.value)} />
                    {et.ganho ? <span className="text-xs text-muted-foreground">{t("ganho")}</span> : null}
                    {et.perdido ? <span className="text-xs text-muted-foreground">{t("perda")}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{t("Agentes")}</h2>
          {estrutura.agentes.length === 0 ? <p className="text-sm text-muted-foreground">{t("Nenhum agente.")}</p> : null}
          {estrutura.agentes.map((a, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex gap-2">
                <Input aria-label={t("Nome do agente")} maxLength={120} value={a.nome} onChange={(e) => mudarAgente(i, "nome", e.target.value)} />
                <Button variant="outline" onClick={() => tirarAgente(i)}>
                  {t("Tirar")}
                </Button>
              </div>
              <Input
                aria-label={t("Descrição do agente")}
                maxLength={2000}
                value={a.descricao}
                onChange={(e) => mudarAgente(i, "descricao", e.target.value)}
              />
              <Textarea
                aria-label={t("Texto do agente")}
                data-testid={`modelo-prompt-${i}`}
                rows={12}
                value={a.prompt}
                onChange={(e) => mudarAgente(i, "prompt", e.target.value)}
              />
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{t("Follow-ups do catálogo")}</h2>
          {estrutura.followups.length === 0 ? <p className="text-sm text-muted-foreground">{t("Nenhum follow-up.")}</p> : null}
          <ul className="space-y-1">
            {estrutura.followups.map((fu, i) => (
              <li key={fu.modelo_id} className="flex items-center justify-between gap-2 text-sm">
                <span>{fu.modelo_id}</span>
                <Button variant="outline" size="sm" onClick={() => tirarFollowup(i)}>
                  {t("Tirar")}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        {achados.length > 0 ? (
          <ul className="list-disc rounded-md border border-destructive/40 px-8 py-3 text-sm" data-testid="modelo-achados">
            {achados.map((a, i) => (
              <li key={i}>
                {a.onde}: {a.tipos.join(", ")}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={salvar} disabled={pendente} data-testid="modelo-salvar-revisao">
            {pendente ? t("Salvando…") : t("Salvar e liberar o modelo")}
          </Button>
          <Button variant="outline" onClick={apagar} disabled={pendente}>
            {confirmarApagar ? t("Confirmar: apagar o modelo") : t("Apagar o modelo")}
          </Button>
          {salvo && !erro ? (
            <span className="text-sm text-muted-foreground" role="status">
              {t("Modelo revisado: já pode ser aplicado pelo assistente.")}
            </span>
          ) : null}
          {erro ? (
            <p className="text-sm text-destructive" role="alert">
              {erro}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
