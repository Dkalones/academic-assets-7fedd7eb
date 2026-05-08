import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Lock, LogOut, Upload, Trash2, Plus, Loader2, FileText,
} from "lucide-react";
import { authStore } from "@/lib/auth";
import {
  listMaterials, uploadMaterial, deleteMaterial,
  fetchAvisos, saveAvisos, fetchDisciplinas,
  type MaterialItem, type Aviso, type Disciplina,
} from "@/lib/api";
import { TemaEditor } from "@/components/TemaEditor";
import { DisciplinasManager } from "@/components/DisciplinasManager";
import { toast } from "sonner";

const Admin = () => {
  const [logged, setLogged] = useState(authStore.isLoggedIn());
  const [password, setPassword] = useState("");
  // "token" agora é a própria senha admin enviada para /api/blob.
  const token = authStore.getToken() ?? "";
  const tokenOk = logged;

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [disciplinaUpload, setDisciplinaUpload] = useState<string>("");
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [avisosSha, setAvisosSha] = useState<string | null>(null);
  const [novoAviso, setNovoAviso] = useState<{ titulo: string; mensagem: string; disciplinaIds: string[]; validade: string }>({
    titulo: "", mensagem: "", disciplinaIds: [], validade: "",
  });
  const [uploading, setUploading] = useState(false);
  const [customName, setCustomName] = useState("");

  useEffect(() => {
    if (logged) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged]);

  // Recarrega materiais quando muda a disciplina selecionada
  useEffect(() => {
    if (!logged) return;
    listMaterials(disciplinaUpload || undefined).then(setMaterials).catch((e) => toast.error(e.message));
  }, [disciplinaUpload, logged]);

  function refreshAll() {
    fetchDisciplinas().then(({ disciplinas }) => {
      setDisciplinas(disciplinas);
      if (disciplinas.length && !disciplinaUpload) setDisciplinaUpload(disciplinas[0].id);
    });
    listMaterials(disciplinaUpload || undefined).then(setMaterials).catch((e) => toast.error(e.message));
    fetchAvisos().then(({ avisos, sha }) => { setAvisos(avisos); setAvisosSha(sha); });
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (authStore.login(password)) {
      setLogged(true);
      setPassword("");
      toast.success("Login realizado");
    } else {
      toast.error("Senha incorreta");
    }
  }

  function handleLogout() {
    authStore.logout();
    setLogged(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length) return;
    if (!disciplinaUpload) return toast.error("Selecione uma disciplina antes de enviar arquivos");
    setUploading(true);
    try {
      const arr = Array.from(files);
      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        // só aplica nome customizado quando há um único arquivo
        const nameOverride = arr.length === 1 ? customName : "";
        await uploadMaterial(token, file, disciplinaUpload, nameOverride);
        toast.success(`Enviado: ${nameOverride || file.name}`);
      }
      setMaterials(await listMaterials(disciplinaUpload));
      setCustomName("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(item: MaterialItem) {
    if (!tokenOk) return toast.error("Token necessário");
    if (!confirm(`Remover "${item.name}"?`)) return;
    try {
      await deleteMaterial(token, item);
      toast.success("Removido");
      setMaterials(await listMaterials(disciplinaUpload || undefined));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleAddAviso(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenOk) return toast.error("Token necessário");
    if (!novoAviso.titulo.trim() || !novoAviso.mensagem.trim()) return;
    const novo: Aviso = {
      id: crypto.randomUUID(),
      titulo: novoAviso.titulo.trim(),
      mensagem: novoAviso.mensagem.trim(),
      data: new Date().toLocaleDateString("pt-BR"),
      validade: novoAviso.validade || undefined,
      disciplinaIds: novoAviso.disciplinaIds.length ? novoAviso.disciplinaIds : undefined,
    };
    const next = [novo, ...avisos];
    try {
      const newSha = await saveAvisos(token, next, avisosSha);
      setAvisos(next);
      setAvisosSha(newSha);
      setNovoAviso({ titulo: "", mensagem: "", disciplinaIds: [], validade: "" });
      toast.success("Aviso publicado");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleRemoveAviso(id: string) {
    if (!tokenOk) return toast.error("Token necessário");
    const next = avisos.filter((a) => a.id !== id);
    try {
      const newSha = await saveAvisos(token, next, avisosSha);
      setAvisos(next);
      setAvisosSha(newSha);
      toast.success("Aviso removido");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function toggleDisciplinaAviso(id: string) {
    setNovoAviso((cur) => ({
      ...cur,
      disciplinaIds: cur.disciplinaIds.includes(id)
        ? cur.disciplinaIds.filter((x) => x !== id)
        : [...cur.disciplinaIds, id],
    }));
  }

  function nomeDisciplina(id?: string) {
    return disciplinas.find((d) => d.id === id)?.nome ?? id ?? "";
  }

  if (!logged) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="container py-16 max-w-md">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Acesso administrativo</h1>
                <p className="text-sm text-muted-foreground">Restrito à professora</p>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pwd">Senha</Label>
                <Input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">Entrar</Button>
            </form>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      <main className="container py-10 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Painel administrativo</h1>
            <p className="text-sm text-muted-foreground">
              Repositório: <code className="font-mono">{GITHUB_CONFIG.owner}/{GITHUB_CONFIG.repo}</code>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1.5" /> Sair
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Token do GitHub</h2>
            {tokenOk && (
              <span className="ml-auto inline-flex items-center text-xs text-success font-medium">
                <ShieldCheck className="h-4 w-4 mr-1" /> Verificado
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Cole um <strong>Personal Access Token (Fine-grained)</strong> com permissão{" "}
            <em>Contents: Read and write</em> no repositório.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Input
              type="password"
              placeholder="ghp_..."
              value={token}
              onChange={(e) => { setToken(e.target.value); setTokenOk(false); }}
              className="flex-1 min-w-[240px] font-mono text-sm"
            />
            <Button onClick={() => handleVerifyToken(token)} disabled={!token || verifying}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
            </Button>
          </div>
        </Card>

        <DisciplinasManager
          token={token}
          tokenOk={tokenOk}
          onChange={(lista) => {
            setDisciplinas(lista);
            if (lista.length && !lista.some((d) => d.id === disciplinaUpload)) {
              setDisciplinaUpload(lista[0].id);
            }
          }}
        />

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Enviar materiais</h2>
          </div>

          <div className="mb-4 space-y-1">
            <Label className="text-xs">Disciplina</Label>
            <Select
              value={disciplinaUpload}
              onValueChange={setDisciplinaUpload}
              disabled={disciplinas.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={disciplinas.length ? "Escolha uma disciplina" : "Crie uma disciplina primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {disciplinas.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4 space-y-1">
            <Label className="text-xs">Nome personalizado (opcional, apenas para 1 arquivo)</Label>
            <Input
              placeholder="Ex.: Lista de exercícios — capítulo 3"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              disabled={!disciplinaUpload}
            />
            <p className="text-xs text-muted-foreground">Se vazio, o nome original do arquivo será usado.</p>
          </div>

          <label className="block">
            <input
              type="file"
              multiple
              onChange={handleUpload}
              disabled={!tokenOk || uploading || !disciplinaUpload}
              className="hidden"
              id="file-upload"
            />
            <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-[var(--transition-smooth)] ${
              tokenOk && disciplinaUpload ? "border-primary/40 hover:border-primary hover:bg-secondary/50" : "border-border opacity-60 cursor-not-allowed"
            }`}>
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              ) : (
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              )}
              <p className="text-sm font-medium">
                {!tokenOk ? "Verifique o token primeiro"
                  : !disciplinaUpload ? "Selecione uma disciplina"
                  : "Clique para selecionar arquivos"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, imagens, etc.</p>
            </div>
            {tokenOk && disciplinaUpload && (
              <Button asChild variant="outline" size="sm" className="mt-3" disabled={uploading}>
                <label htmlFor="file-upload" className="cursor-pointer">Selecionar arquivos</label>
              </Button>
            )}
          </label>

          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Materiais publicados {disciplinaUpload && `em "${nomeDisciplina(disciplinaUpload)}"`} ({materials.length})
            </h3>
            {materials.map((m) => (
              <div key={m.path} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1 truncate text-sm">{m.name}</span>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(m)} disabled={!tokenOk}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {materials.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum arquivo enviado nesta disciplina.</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Avisos</h2>
          </div>
          <form onSubmit={handleAddAviso} className="space-y-3 mb-6">
            <Input
              placeholder="Título do aviso"
              value={novoAviso.titulo}
              onChange={(e) => setNovoAviso({ ...novoAviso, titulo: e.target.value })}
            />
            <Textarea
              placeholder="Mensagem"
              rows={3}
              value={novoAviso.mensagem}
              onChange={(e) => setNovoAviso({ ...novoAviso, mensagem: e.target.value })}
            />
            <div className="space-y-1">
              <Label className="text-xs">Data de validade (opcional)</Label>
              <Input
                type="date"
                value={novoAviso.validade}
                onChange={(e) => setNovoAviso({ ...novoAviso, validade: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Após esta data o aviso some automaticamente da página dos alunos.</p>
            </div>
            <div className="space-y-2 p-3 rounded-lg border bg-secondary/30">
              <Label className="text-xs">Mostrar este aviso em quais disciplinas?</Label>
              {disciplinas.length === 0 ? (
                <p className="text-xs text-muted-foreground">Crie pelo menos uma disciplina primeiro.</p>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {disciplinas.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={novoAviso.disciplinaIds.includes(d.id)}
                          onCheckedChange={() => toggleDisciplinaAviso(d.id)}
                        />
                        {d.nome}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se nenhuma for marcada, o aviso aparece em <strong>todas</strong> as disciplinas.
                  </p>
                </>
              )}
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-1.5" /> Publicar aviso
            </Button>
            {!tokenOk && (
              <p className="text-xs text-destructive">⚠️ Verifique o Token do GitHub no topo para publicar.</p>
            )}
          </form>
          <div className="space-y-2">
            {avisos.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <p className="font-medium text-sm">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.data}
                    {a.disciplinaIds && a.disciplinaIds.length > 0 && (
                      <> · {a.disciplinaIds.map(nomeDisciplina).join(", ")}</>
                    )}
                    {(!a.disciplinaIds || a.disciplinaIds.length === 0) && <> · todas as disciplinas</>}
                  </p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{a.mensagem}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveAviso(a.id)} disabled={!tokenOk}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {avisos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum aviso publicado.</p>
            )}
          </div>
        </Card>

        <TemaEditor token={token} tokenOk={tokenOk} />
      </main>
    </div>
  );
};

export default Admin;
