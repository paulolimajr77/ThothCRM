"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ligarAssistenteDoTenant } from "@/app/actions/admin/assistenteDoTenant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/hooks/i18n/useT";

/** O interruptor do assistente interno de UMA empresa — decisão da plataforma, não da empresa. */
export function CardDoAssistente({ orgId, ligadoInicial }: { orgId: string; ligadoInicial: boolean }) {
  const t = useT();
  const [ligado, setLigado] = useState(ligadoInicial);
  const [pendente, comecar] = useTransition();

  function alternar() {
    const novo = !ligado;
    comecar(async () => {
      const r = await ligarAssistenteDoTenant({ organization_id: orgId, ligado: novo });
      if (r.ok) {
        setLigado(r.ligado);
        toast.success(r.ligado ? t("Assistente ligado para esta empresa.") : t("Assistente desligado para esta empresa."));
      } else {
        toast.error(t("Não foi possível mudar o assistente desta empresa."));
      }
    });
  }

  return (
    <Card className="space-y-3 p-6" aria-labelledby="assistente-do-tenant" data-testid="card-assistente-do-tenant">
      <h2 id="assistente-do-tenant" className="text-base font-semibold">
        {t("Assistente interno")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t("Liga o assistente de configuração por IA para esta empresa. Ele gasta crédito de IA da empresa.")}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-sm" data-testid="assistente-do-tenant-estado">
          {ligado ? t("Ligado") : t("Desligado")}
        </span>
        <Button
          type="button"
          variant={ligado ? "outline" : "default"}
          disabled={pendente}
          onClick={alternar}
          data-testid="assistente-do-tenant-alternar"
        >
          {ligado ? t("Desligar") : t("Ligar")}
        </Button>
      </div>
    </Card>
  );
}
