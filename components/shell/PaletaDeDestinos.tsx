"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { MagnifyingGlass } from "@/lib/ui/icons";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * O MIOLO da paleta de navegação (⌘K), separado de QUEM a alimenta.
 *
 * Ele nasceu dentro de `components/shell/CommandPalette.tsx`, que calculava os
 * destinos com `useAuth()` + `searchable(...)`. Quando o painel do
 * administrador passou a precisar da mesma busca, copiar estas ~250 linhas
 * significaria dois filtros, dois teclados e dois lugares para consertar o
 * mesmo defeito de acessibilidade.
 *
 * O que muda entre os dois consumidores é só a FONTE:
 *   - tenant: `searchable(...)` em `lib/navigation/registry.ts`;
 *   - admin:  `destinosDoAdmin(...)` em `lib/admin/navegacao.ts`.
 *
 * Por isso este componente recebe `destinos` e `grupos` por PROP e não conhece
 * nem `useAuth` nem o registro do tenant — a paleta do admin roda numa árvore
 * que não tem `AuthProvider` (ver `app/admin/(protected)/layout.tsx`), e um
 * `useAuth()` aqui derrubaria a tela inteira no cliente.
 *
 * Não usa `cmdk`: o projeto já tem Dialog e Input, e uma lista filtrada com
 * setas e Enter são poucas linhas.
 *
 * v1 busca só NAVEGAÇÃO — destinos. Contato, conversa e lead têm outra fonte
 * de dados e são outra feature.
 */

/** O mínimo que um destino precisa ter para aparecer aqui. */
export interface DestinoDaPaleta {
  href: string;
  label: string;
  description: string;
  /** Id do grupo; a ordem e o rótulo vêm de `grupos`. */
  group: string;
  icon: PhosphorIcon;
}

export interface GrupoDaPaleta {
  id: string;
  /** Texto em português: é a CHAVE do dicionário. */
  label: string;
}

/** Sem acento e sem caixa: ninguém digita "orçamento" com cedilha às pressas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Uma entrada que NÃO é tela: abre algo (o painel do assistente), em vez de navegar. Fica fora de `destinos`,
 * do contador "Todas (N)" e das categorias, e ocupa o índice -1 do destaque, o que deixa as setas dos
 * destinos (0..N-1) exatamente como eram. Aparece em "Todas" e quando a busca a descreve.
 */
export interface EntradaExtraDaPaleta {
  /** Texto em português: é a CHAVE do dicionário. */
  rotulo: string;
  descricao: string;
  /** Palavras que fazem a busca achar a entrada além do texto que ela mostra. */
  palavras: string;
  icon: PhosphorIcon;
  /** Chamado depois de a paleta fechar. */
  aoEscolher: () => void;
}

const INDICE_DA_ENTRADA_EXTRA = -1;

export interface PaletaDeDestinosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinos: readonly DestinoDaPaleta[];
  grupos: readonly GrupoDaPaleta[];
  /**
   * Título acessível do diálogo (sr-only), JÁ TRADUZIDO pelo chamador.
   *
   * Os três textos abaixo chegam prontos de propósito: `t()` só aceita literal
   * ou membro de objeto — `t(parametro)` é "dado de runtime" e o gate
   * `i18n-espanhol-cobre-a-tela` reprova. Quem conhece o literal é o chamador.
   */
  titulo: string;
  /** `aria-label` da lista de resultados, já traduzido. */
  rotuloLista: string;
  /** Placeholder do campo, já traduzido. */
  placeholder: string;
  entradaExtra?: EntradaExtraDaPaleta;
  /** Quem abriu algo ao fechar pode levar o foco para lá, em vez de devolvê-lo ao botão da paleta. */
  aoFecharComFoco?: (e: Event) => void;
}

export function PaletaDeDestinos({
  open,
  onOpenChange,
  destinos,
  grupos,
  titulo,
  rotuloLista,
  placeholder,
  entradaExtra,
  aoFecharComFoco,
}: PaletaDeDestinosProps) {
  const rotuloGrupo = useMemo(() => new Map(grupos.map((g) => [g.id, g.label])), [grupos]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        CENTRALIZADA, e não ancorada em `top-[10%]`.

        O ancoramento no alto é convenção de paleta de comando em editor, mas
        aqui ele brigava com a animação de entrada que este mesmo ramo
        acrescentou: `ds-modal` termina num deslocamento próprio e, com
        `fill-mode: both`, esse valor vence o `translate-y-0` daqui — a paleta
        era puxada meia altura para cima e saía cortada no topo.

        O keyframe passou a ler `--ds-modal-y` (ver `app/globals.css`), então
        ancorar diferente voltou a ser possível. Mas centralizar é melhor para
        ESTA tela: a paleta mostra resultados agrupados com descrição e, no
        notebook, passava do rodapé. Centralizada, a sobra se reparte nas duas
        pontas e o teto do `DialogContent` resolve o resto com rolagem.
      */}
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onCloseAutoFocus={aoFecharComFoco}
      >
        <DialogTitle className="sr-only">{titulo}</DialogTitle>
        {/* O miolo é um componente à parte porque o Radix o DESMONTA ao fechar:
            busca e destaque nascem zerados na próxima abertura por construção,
            sem um efeito de reset para manter em sincronia. */}
        <Resultados
          aoEscolher={() => onOpenChange(false)}
          destinos={destinos}
          grupos={grupos}
          rotuloGrupo={rotuloGrupo}
          rotuloLista={rotuloLista}
          placeholder={placeholder}
          entradaExtra={entradaExtra}
        />
      </DialogContent>
    </Dialog>
  );
}

function Resultados({
  aoEscolher,
  destinos,
  grupos,
  rotuloGrupo,
  rotuloLista,
  placeholder,
  entradaExtra,
}: {
  entradaExtra?: EntradaExtraDaPaleta;
  aoEscolher: () => void;
  destinos: readonly DestinoDaPaleta[];
  grupos: readonly GrupoDaPaleta[];
  rotuloGrupo: Map<string, string>;
  rotuloLista: string;
  placeholder: string;
}) {
  const t = useT();
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [destacado, setDestacado] = useState(entradaExtra !== undefined ? INDICE_DA_ENTRADA_EXTRA : 0);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("todos");

  const ordemGrupo = useMemo(() => new Map(grupos.map((g, i) => [g.id, i])), [grupos]);

  // Lista dos grupos disponíveis nos destinos visíveis
  const categoriasDisponiveis = useMemo(() => {
    const gruposNoCatalogo = new Set(destinos.map((v) => v.group));
    return grupos.filter((g) => gruposNoCatalogo.has(g.id));
  }, [destinos, grupos]);

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtrados = destinos.filter((d) => {
      const casaCategoria = categoriaAtiva === "todos" || d.group === categoriaAtiva;
      if (!casaCategoria) return false;
      if (!termo) return true;
      return normalizar(`${d.label} ${d.description} ${rotuloGrupo.get(d.group) ?? ""}`).includes(
        termo,
      );
    });
    if (termo) return filtrados;
    // O catálogo não é contíguo por grupo (a Prospecção, de CRM, vem antes do
    // Inbox). Sem reordenar, a 1ª seção seria a do 1º item e as setas, que
    // andam por este array, pulariam de uma seção para outra. Ordenado pelos
    // grupos, a ordem do array é a ordem da tela. O sort é estável.
    return [...filtrados].sort(
      (a, b) => (ordemGrupo.get(a.group) ?? 0) - (ordemGrupo.get(b.group) ?? 0),
    );
  }, [busca, destinos, categoriaAtiva, rotuloGrupo, ordemGrupo]);

  // Agrupamento para exibição visual estruturada quando não há busca específica digitada
  const resultadosAgrupados = useMemo(() => {
    const map = new Map<string, DestinoDaPaleta[]>();
    for (const item of resultados) {
      const lista = map.get(item.group) ?? [];
      lista.push(item);
      map.set(item.group, lista);
    }
    return map;
  }, [resultados]);

  function abrirEntradaExtra() {
    aoEscolher();
    entradaExtra?.aoEscolher();
  }

  function navegar(destino: DestinoDaPaleta) {
    aoEscolher();
    router.push(destino.href);
  }

  /**
   * O destaque volta ao topo junto com a busca, no mesmo evento: mantê-lo
   * apontaria para outro item depois que a lista muda, e o Enter navegaria
   * para o lugar errado.
   */
  function aoDigitar(valor: string) {
    setBusca(valor);
    setDestacado(primeiroDestaque(valor, categoriaAtiva));
  }

  function mudarCategoria(id: string) {
    setCategoriaAtiva(id);
    setDestacado(primeiroDestaque(busca, id));
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestacado((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestacado((i) => Math.max(i - 1, entradaExtraVisivel ? INDICE_DA_ENTRADA_EXTRA : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (entradaExtraVisivel && destacado === INDICE_DA_ENTRADA_EXTRA) {
        abrirEntradaExtra();
        return;
      }
      const alvo = resultados[destacado];
      if (alvo) navegar(alvo);
    }
  }

  const emModoCatalogo = !busca.trim() && categoriaAtiva === "todos";

  function entradaExtraCasa(termoBruto: string, categoria: string): boolean {
    if (entradaExtra === undefined || categoria !== "todos") return false;
    const termo = normalizar(termoBruto.trim());
    if (!termo) return true;
    return normalizar(`${t(entradaExtra.rotulo)} ${t(entradaExtra.descricao)} ${entradaExtra.palavras}`).includes(termo);
  }
  const entradaExtraVisivel = entradaExtraCasa(busca, categoriaAtiva);
  const primeiroDestaque = (termoBruto: string, categoria: string) =>
    entradaExtraCasa(termoBruto, categoria) ? INDICE_DA_ENTRADA_EXTRA : 0;
  const opcaoExtra = (como: "div" | "li") =>
    entradaExtraVisivel && entradaExtra !== undefined ? (
      <OpcaoExtra
        como={como}
        entrada={entradaExtra}
        ativo={destacado === INDICE_DA_ENTRADA_EXTRA}
        aoPassar={() => setDestacado(INDICE_DA_ENTRADA_EXTRA)}
        aoEscolher={abrirEntradaExtra}
      />
    ) : null;

  return (
    <>
      {/* `pr-14`: o X do diálogo (`components/ui/dialog.tsx`) mora no canto de
          cima à direita, e o "Limpar" ficava embaixo dele — no celular, onde o
          X tem 44 px de alvo, o toque em "Limpar" FECHAVA a busca. */}
      <div className="flex items-center gap-3 border-b px-4 pr-14">
        <MagnifyingGlass size={18} aria-hidden className="shrink-0 text-muted-foreground" />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls="palette-resultados"
          aria-activedescendant={
            entradaExtraVisivel && destacado === INDICE_DA_ENTRADA_EXTRA
              ? "palette-assistente"
              : resultados[destacado]
                ? `palette-${destacado}`
                : undefined
          }
          value={busca}
          onChange={(e) => aoDigitar(e.target.value)}
          onKeyDown={aoTeclar}
          placeholder={placeholder}
          className="h-13 w-full bg-transparent text-sm text-foreground outline-hidden placeholder:text-muted-foreground"
        />
        {busca && (
          <button
            type="button"
            onClick={() => aoDigitar("")}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            {t("Limpar")}
          </button>
        )}
      </div>

      {/* Categorias rápidas para navegação instantânea */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b bg-muted/30 px-3 py-2 text-xs">
        <button
          type="button"
          onClick={() => mudarCategoria("todos")}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium whitespace-nowrap transition-colors pointer-coarse:min-h-11",
            categoriaAtiva === "todos"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {t("Todas")} ({destinos.length})
        </button>
        {categoriasDisponiveis.map((cat) => {
          const qtd = destinos.filter((v) => v.group === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => mudarCategoria(cat.id)}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium whitespace-nowrap transition-colors pointer-coarse:min-h-11",
                categoriaAtiva === cat.id
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t(cat.label)} ({qtd})
            </button>
          );
        })}
      </div>

      {resultados.length === 0 && !entradaExtraVisivel ? (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {t("Nada encontrado para")} “{busca}”.
          </p>
          <p className="mt-1 text-xs">
            {t("Tente buscar por outro termo ou selecione 'Todas' nas categorias.")}
          </p>
        </div>
      ) : emModoCatalogo ? (
        /* Modo Catálogo Visível: agrupado por departamentos/módulos para ver tudo de relance */
        <div
          id="palette-resultados"
          role="listbox"
          aria-label={rotuloLista}
          className="max-h-[60vh] space-y-5 overflow-y-auto p-4"
        >
          {opcaoExtra("div")}
          {Array.from(resultadosAgrupados.entries()).map(([grupoId, itens]) => {
            const label = rotuloGrupo.get(grupoId) ?? grupoId;
            return (
              <div key={grupoId} role="group" aria-label={t(label)} className="space-y-2">
                <div className="flex items-center justify-between border-b pb-1">
                  <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {t(label)}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    {itens.length} {itens.length === 1 ? t("ferramenta") : t("ferramentas")}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {itens.map((d) => {
                    const Icon = d.icon;
                    const idxGlobal = resultados.findIndex((r) => r.href === d.href);
                    const ativo = idxGlobal === destacado;
                    // Mesmo par do modo lista: cinza sobre o destaque dava 1,2:1.
                    const secundario = ativo ? "text-accent-foreground" : "text-muted-foreground";
                    return (
                      <div
                        key={d.href}
                        id={`palette-${idxGlobal}`}
                        role="option"
                        aria-selected={ativo}
                        data-href={d.href}
                        onMouseEnter={() => setDestacado(idxGlobal)}
                        onClick={() => navegar(d)}
                        className={cn(
                          "group flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 p-2.5 transition-all",
                          ativo
                            ? "border-primary/40 bg-accent text-accent-foreground shadow-xs ring-1 ring-primary/20"
                            : "hover:border-border hover:bg-muted/50",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background/80 transition-colors",
                            ativo && "bg-primary text-primary-foreground",
                          )}
                        >
                          <Icon size={16} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs leading-tight font-semibold">
                            {t(d.label)}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 line-clamp-2 text-[11px] leading-snug",
                              secundario,
                            )}
                          >
                            {t(d.description)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Modo Lista Filtrada / Busca direta */
        <ul
          id="palette-resultados"
          role="listbox"
          aria-label={rotuloLista}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {opcaoExtra("li")}
          {resultados.map((d, i) => {
            const Icon = d.icon;
            const ativo = i === destacado;
            // No item destacado o fundo é a cor de destaque: o cinza de apoio
            // ficava 1,2:1 sobre o verde (medido), ilegível. A cor de frente do
            // destaque SEM opacidade herda o piso de 4,5:1 que
            // lib/branding/contraste.ts garante para qualquer marca própria; a
            // 90%, uma marca de luminância média cai para 4,1:1.
            const secundario = ativo ? "text-accent-foreground" : "text-muted-foreground";
            return (
              <li
                key={d.href}
                id={`palette-${i}`}
                role="option"
                aria-selected={ativo}
                data-href={d.href}
                onMouseEnter={() => setDestacado(i)}
                onClick={() => navegar(d)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition-colors",
                  ativo && "bg-accent text-accent-foreground",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background/60",
                    ativo && "bg-primary text-primary-foreground",
                  )}
                >
                  <Icon size={16} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{t(d.label)}</span>
                    <span
                      className={cn(
                        "truncate text-[10px] font-medium tracking-wider uppercase",
                        secundario,
                      )}
                    >
                      {t(rotuloGrupo.get(d.group) ?? "")}
                    </span>
                  </div>
                  {/* Duas linhas, não uma cortada: a palavra que a pessoa buscou
                      pode estar no fim da descrição. */}
                  <p className={cn("line-clamp-2 text-xs", secundario)}>{t(d.description)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground pointer-coarse:hidden">
        <span>{t("Use as setas ↑↓ e Enter para navegar")}</span>
        <span>{t("ESC para fechar")}</span>
      </div>
    </>
  );
}

/** A linha da entrada extra (o assistente). Mesmo par de cores do item de tela destacado. */
function OpcaoExtra({
  como,
  entrada,
  ativo,
  aoPassar,
  aoEscolher,
}: {
  como: "div" | "li";
  entrada: EntradaExtraDaPaleta;
  ativo: boolean;
  aoPassar: () => void;
  aoEscolher: () => void;
}) {
  const t = useT();
  const Raiz = como;
  const Icon = entrada.icon;
  const secundario = ativo ? "text-accent-foreground" : "text-muted-foreground";
  return (
    <Raiz
      id="palette-assistente"
      role="option"
      aria-selected={ativo}
      data-acao="abrir-assistente"
      onMouseEnter={aoPassar}
      onClick={aoEscolher}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition-colors",
        como === "div" && "border border-border/50",
        ativo && "bg-accent text-accent-foreground",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background/60",
          ativo && "bg-primary text-primary-foreground",
        )}
      >
        <Icon size={16} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{t(entrada.rotulo)}</span>
        <p className={cn("line-clamp-2 text-xs", secundario)}>{t(entrada.descricao)}</p>
      </div>
    </Raiz>
  );
}
