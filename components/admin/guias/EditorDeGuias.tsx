"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { salvarGuiaDoAssistente } from "@/app/actions/admin/guiasDoAssistente";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/i18n/useT";

export interface GuiaDoAssistente {
  name: string;
  description: string;
  body: string;
}

function Guia({ guia }: { guia: GuiaDoAssistente }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState(guia.description);
  const [corpo, setCorpo] = useState(guia.body);
  const [salvo, setSalvo] = useState({ descricao: guia.description, corpo: guia.body });
  const [pendente, comecar] = useTransition();
  const mudou = descricao !== salvo.descricao || corpo !== salvo.corpo;

  function salvar() {
    comecar(async () => {
      const r = await salvarGuiaDoAssistente({ name: guia.name, description: descricao, body: corpo });
      if (r.ok) {
        setSalvo({ descricao, corpo });
        toast.success(t("Guia salvo. O assistente já usa a versão nova."));
      } else {
        toast.error(t("Não foi possível salvar o guia."));
      }
    });
  }

  return (
    <Card className="space-y-3 p-4" data-testid={`guia-${guia.name}`}>
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setAberto(!aberto)}>
        <span>
          <span className="block text-sm font-semibold">{guia.name}</span>
          <span className="block text-sm text-muted-foreground">{salvo.descricao}</span>
        </span>
        <span className="text-sm text-muted-foreground">{aberto ? t("Fechar") : t("Abrir")}</span>
      </button>
      {aberto ? (
        <div className="space-y-3">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} aria-label={t("Descrição")} maxLength={500} />
          <Textarea
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            aria-label={t("Texto do guia")}
            className="min-h-96 font-mono text-xs"
          />
          <Button type="button" disabled={pendente || !mudou || descricao.trim() === "" || corpo.trim() === ""} onClick={salvar}>
            {t("Salvar")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function EditorDeGuias({ guias }: { guias: GuiaDoAssistente[] }) {
  const t = useT();
  if (guias.length === 0) return <p className="text-sm text-muted-foreground">{t("Nenhum guia do assistente instalado.")}</p>;
  return (
    <div className="space-y-3">
      {guias.map((g) => (
        <Guia key={g.name} guia={g} />
      ))}
    </div>
  );
}
