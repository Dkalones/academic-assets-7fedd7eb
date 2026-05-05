import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookMarked, Plus, Trash2, Loader2, Save } from "lucide-react";
import {
  fetchDisciplinas, saveDisciplinas, type Disciplina,
} from "@/lib/github";
import { toast } from "sonner";

interface Props {
  token: string;
  tokenOk: boolean;
  onChange?: (lista: Disciplina[]) => void;
}

export const DisciplinasManager = ({ token, tokenOk, onChange }: Props) => {
  const [lista, setLista] = useState<Disciplina[]>([]);
  const [sha, setSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nova, setNova] = useState({ nome: "", descricao: "" });

  useEffect(() => {
    fetchDisciplinas()
      .then(({ disciplinas, sha }) => { setLista(disciplinas); setSha(sha); onChange?.(disciplinas); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(next: Disciplina[]) {
    if (!tokenOk) return toast.error("Verifique o token primeiro");
    setSaving(true);
    try {
      const newSha = await saveDisciplinas(token, next, sha);
      setSha(newSha);
      setLista(next);
      onChange?.(next);
      toast.success("Disciplinas salvas");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function slug(nome: string) {
    return nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || crypto.randomUUID().slice(0, 8);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nova.nome.trim()) return;
    const id = slug(nova.nome);
    if (lista.some((d) => d.id === id)) return toast.error("Já existe uma disciplina com esse nome");
    const next = [...lista, { id, nome: nova.nome.trim(), descricao: nova.descricao.trim() }];
    await persist(next);
    setNova({ nome: "", descricao: "" });
  }

  async function handleEdit(id: string, patch: Partial<Disciplina>) {
    const next = lista.map((d) => (d.id === id ? { ...d, ...patch } : d));
    setLista(next);
  }

  async function handleSaveEdits() {
    await persist(lista);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remover essa disciplina? Os arquivos enviados continuam no repositório.")) return;
    await persist(lista.filter((d) => d.id !== id));
  }

  if (loading) {
    return (
      <Card className="p-6 flex items-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando disciplinas...
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <BookMarked className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Disciplinas</h2>
      </div>

      <form onSubmit={handleAdd} className="space-y-3 p-4 rounded-lg border bg-secondary/30">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome da disciplina</Label>
            <Input
              value={nova.nome}
              onChange={(e) => setNova({ ...nova, nome: e.target.value })}
              placeholder="Ex: Matemática 9º ano"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input
              value={nova.descricao}
              onChange={(e) => setNova({ ...nova, descricao: e.target.value })}
              placeholder="Ex: Turma A — manhã"
            />
          </div>
        </div>
        <Button type="submit" disabled={!tokenOk || saving}>
          <Plus className="h-4 w-4 mr-1.5" /> Criar disciplina
        </Button>
      </form>

      <div className="space-y-2">
        {lista.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma disciplina cadastrada ainda.</p>
        )}
        {lista.map((d) => (
          <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
            <div className="flex-1 space-y-2">
              <Input
                value={d.nome}
                onChange={(e) => handleEdit(d.id, { nome: e.target.value })}
                className="font-medium"
              />
              <Textarea
                value={d.descricao ?? ""}
                onChange={(e) => handleEdit(d.id, { descricao: e.target.value })}
                rows={1}
                placeholder="Descrição"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">id: <code>{d.id}</code></p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleRemove(d.id)} disabled={!tokenOk}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {lista.length > 0 && (
          <Button onClick={handleSaveEdits} disabled={!tokenOk || saving} variant="outline" size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar edições
          </Button>
        )}
      </div>
    </Card>
  );
};
