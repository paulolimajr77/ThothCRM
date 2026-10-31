"use client";
import { useMemo, useRef } from "react";

import { useAssistentePainel } from "@/components/assistente/AssistentePainelProvider";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { Robot } from "@/lib/ui/icons";
import { NAV_GROUPS, searchable } from "@/lib/navigation/registry";
import { PaletaDeDestinos } from "@/components/shell/PaletaDeDestinos";

/**
 * Paleta de navegação (⌘K) do APP DO TENANT.
 *
 * A UI, o filtro e o teclado moram em `PaletaDeDestinos` desde que o painel do
 * administrador passou a precisar da mesma busca. O que sobra aqui é só a
 * FONTE deste lado: `searchable(...)`, que filtra o registro de
 * `lib/navigation/registry.ts` pelo que este usuário/empresa pode ver.
 *
 * v1 busca só NAVEGAÇÃO — os destinos do registro. Contato, conversa e lead têm
 * outra fonte de dados e são outra feature.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const painel = useAssistentePainel();
  // Escolher o assistente fecha a paleta e abre o painel: o foco vai para o campo de pergunta, não de volta ao botão.
  const abriuOPainel = useRef(false);

  const visiveis = useMemo(
    () =>
      searchable(
        user.is_platform_admin && !user.support,
        activeOrg?.role ?? null,
        activeOrg?.interface_settings,
        activeOrg?.modulos_ligados ?? [],
        activeOrg?.capacidades_ligadas ?? [],
      ),
    [
      user.is_platform_admin,
      user.support,
      activeOrg?.role,
      activeOrg?.interface_settings,
      activeOrg?.modulos_ligados,
      activeOrg?.capacidades_ligadas,
    ],
  );

  return (
    <PaletaDeDestinos
      open={open}
      onOpenChange={onOpenChange}
      destinos={visiveis}
      grupos={NAV_GROUPS}
      titulo={t("Buscar telas")}
      rotuloLista={t("Telas")}
      aoFecharComFoco={(e) => {
        if (!abriuOPainel.current) return;
        abriuOPainel.current = false;
        e.preventDefault();
        document.querySelector<HTMLElement>('[data-testid="assistente-pergunta"]')?.focus();
      }}
      // Sem painel montado (teste isolado) não há o que abrir: a entrada não é oferecida.
      entradaExtra={
        painel === null
          ? undefined
          : {
              rotulo: "Conversar com o assistente",
              descricao: "Pergunte sobre a operação, os números e as telas do CRM.",
              palavras: "assistente conversar perguntar ia",
              icon: Robot,
              aoEscolher: () => {
                abriuOPainel.current = true;
                painel.abrir();
              },
            }
      }
      placeholder={t(
        "Buscar por nome, objetivo ou função (ex: leads, agenda, prompt, whatsapp)...",
      )}
    />
  );
}
