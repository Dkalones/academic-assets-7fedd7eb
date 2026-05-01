import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listMaterials, type MaterialItem } from "@/lib/github";
import { toast } from "sonner";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export const MaterialsList = () => {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMaterials()
      .then(setItems)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando materiais...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhum material disponível ainda.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <Card
          key={item.path}
          className="p-4 flex items-center gap-4 hover:shadow-[var(--shadow-card)] transition-[var(--transition-smooth)]"
        >
          <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(item.size)}</p>
          </div>
          <Button asChild size="sm" variant="default">
            <a href={item.download_url} download={item.name}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </Card>
      ))}
    </div>
  );
};
