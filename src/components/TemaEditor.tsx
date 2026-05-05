import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Palette, Save, RotateCcw, Loader2, Image as ImageIcon } from "lucide-react";
import { fetchTema, saveTema, TEMA_PADRAO, type Tema } from "@/lib/github";
import { applyTema } from "@/lib/tema";
import { toast } from "sonner";

// Converte HSL "H S% L%" → #rrggbb (para o input color)
function hslTripletToHex(triplet: string): string {
  const m = triplet.trim().match(/^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/);
  if (!m) return "#000000";
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const PRESETS_BG = [
  { label: "Creme (padrão)", value: "hsl(40 33% 98%)" },
  { label: "Branco", value: "#ffffff" },
  { label: "Cinza claro", value: "#f3f4f6" },
  { label: "Azul suave", value: "#eff6ff" },
  { label: "Gradiente azul", value: "linear-gradient(135deg, #dbeafe 0%, #f0f9ff 100%)" },
  { label: "Gradiente rosa", value: "linear-gradient(135deg, #fce7f3 0%, #fff1f2 100%)" },
  { label: "Gradiente menta", value: "linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)" },
];

interface Props {
  token: string;
  tokenOk: boolean;
}

export const TemaEditor = ({ token, tokenOk }: Props) => {
  const [tema, setTema] = useState<Tema>(TEMA_PADRAO);
  const [sha, setSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bgUrl, setBgUrl] = useState("");

  useEffect(() => {
    fetchTema()
      .then(({ tema, sha }) => { setTema(tema); setSha(sha); applyTema(tema); })
      .finally(() => setLoading(false));
  }, []);

  function update(patch: Partial<Tema>) {
    const next = { ...tema, ...patch };
    setTema(next);
    applyTema(next); // pré-visualização ao vivo
  }

  function setColorFromHex(field: "primary" | "accent", hex: string) {
    // converte hex para HSL triplet
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hh = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
        case g: hh = (b - r) / d + 2; break;
        case b: hh = (r - g) / d + 4; break;
      }
      hh /= 6;
    }
    update({ [field]: `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%` } as any);
  }

  async function handleSave() {
    if (!tokenOk) return toast.error("Verifique o token primeiro");
    setSaving(true);
    try {
      const newSha = await saveTema(token, tema, sha);
      setSha(newSha);
      toast.success("Tema salvo! Os alunos verão a mudança ao recarregar.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setTema(TEMA_PADRAO);
    applyTema(TEMA_PADRAO);
  }

  if (loading) {
    return (
      <Card className="p-6 flex items-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando tema...
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Aparência do site</h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cor principal (botões, header)</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={hslTripletToHex(tema.primary)}
              onChange={(e) => setColorFromHex("primary", e.target.value)}
              className="h-10 w-14 rounded border cursor-pointer"
            />
            <Input
              value={tema.primary}
              onChange={(e) => update({ primary: e.target.value })}
              className="font-mono text-xs"
              placeholder="220 60% 28%"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Cor de destaque (avisos, ícones)</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={hslTripletToHex(tema.accent)}
              onChange={(e) => setColorFromHex("accent", e.target.value)}
              className="h-10 w-14 rounded border cursor-pointer"
            />
            <Input
              value={tema.accent}
              onChange={(e) => update({ accent: e.target.value })}
              className="font-mono text-xs"
              placeholder="35 75% 55%"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Papel de parede
        </Label>

        <div className="flex flex-wrap gap-2">
          {PRESETS_BG.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => update({ background: p.value })}
              className="h-10 w-10 rounded-lg border-2 border-border hover:border-primary transition-[var(--transition-smooth)]"
              style={{ background: p.value }}
              title={p.label}
            />
          ))}
        </div>

        <div className="space-y-2 p-3 rounded-lg border bg-secondary/40">
          <Label className="text-xs font-semibold">📸 Usar imagem da web como fundo</Label>
          <div className="flex gap-2 flex-wrap">
            <Input
              value={bgUrl}
              onChange={(e) => setBgUrl(e.target.value)}
              placeholder="Cole o link da imagem (ex: https://i.ytimg.com/vi/.../hq720.jpg)"
              className="flex-1 min-w-[220px]"
            />
            <Button
              type="button"
              onClick={() => {
                const url = bgUrl.trim();
                if (!url) return toast.error("Cole o link da imagem primeiro");
                if (!/^https?:\/\//i.test(url)) return toast.error("Link deve começar com http(s)://");
                // Escapa parênteses e aspas para não quebrar a sintaxe CSS url(...)
                const safe = url.replace(/"/g, '\\"');
                update({ background: `url("${safe}") center/cover no-repeat fixed` });
                toast.success("Imagem aplicada — clique em Salvar para publicar");
              }}
            >
              Aplicar imagem
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Funciona com qualquer link direto de imagem (.jpg, .png, .webp). Para fotos do Google, abra a imagem em tamanho real, clique direito → "Copiar endereço da imagem".
          </p>
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">CSS avançado (opcional)</summary>
          <Textarea
            value={tema.background}
            onChange={(e) => update({ background: e.target.value })}
            rows={2}
            className="font-mono text-xs mt-2"
            placeholder='Ex: #fcfbf8  ou  linear-gradient(135deg, #dbeafe, #f0f9ff)'
          />
        </details>
      </div>

      <div className="space-y-2 pt-2 border-t">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Foto do perfil (Profa. Luana)
        </Label>
        <div className="flex gap-3 items-center">
          {tema.avatarUrl ? (
            <img
              src={tema.avatarUrl}
              alt="Pré-visualização"
              className="h-14 w-14 rounded-full object-cover border-2 border-primary/40"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground border">
              sem foto
            </div>
          )}
          <Input
            value={tema.avatarUrl ?? ""}
            onChange={(e) => update({ avatarUrl: e.target.value })}
            placeholder="Cole o link de uma foto (https://...)"
            className="flex-1"
          />
          {tema.avatarUrl && (
            <Button type="button" variant="outline" size="sm" onClick={() => update({ avatarUrl: "" })}>
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          A imagem aparece no topo do site no lugar do ícone. Use um link direto (.jpg, .png).
        </p>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button onClick={handleSave} disabled={!tokenOk || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar tema
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Restaurar padrão
        </Button>
      </div>
    </Card>
  );
};
