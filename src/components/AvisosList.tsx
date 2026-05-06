import { useEffect, useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchAvisos, type Aviso } from "@/lib/github";

interface Props {
  disciplinaId?: string; // se informado, mostra apenas avisos desta disciplina (ou globais)
}

export const AvisosList = ({ disciplinaId }: Props) => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvisos()
      .then(({ avisos }) => setAvisos(avisos))
      .finally(() => setLoading(false));
  }, []);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const visiveis = avisos.filter((a) => {
    if (a.validade) {
      const v = new Date(a.validade + "T23:59:59");
      if (v < hoje) return false;
    }
    if (!disciplinaId) return true;
    const ids = a.disciplinaIds ?? [];
    return ids.length === 0 || ids.includes(disciplinaId);
  });

  if (loading) {
    return (
      <div className="flex items-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando avisos...
      </div>
    );
  }

  if (visiveis.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem avisos no momento.</p>;
  }

  return (
    <div className="space-y-3">
      {visiveis.map((a) => (
        <Card key={a.id} className="p-4 border-l-4 border-l-accent">
          <div className="flex gap-3">
            <Megaphone className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h3 className="font-semibold">{a.titulo}</h3>
                <span className="text-xs text-muted-foreground">{a.data}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.mensagem}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
