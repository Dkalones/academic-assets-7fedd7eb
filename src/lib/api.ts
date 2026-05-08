// Cliente para as funções serverless da Vercel (substitui a integração GitHub).
// Toda a UI continua tendo a mesma forma de antes.

const BASE = "/api/blob";

// ============= Tipos públicos =============
export interface MaterialItem {
  name: string;
  path: string;
  size: number;
  download_url: string;
  sha: string; // aqui é a URL do blob (usada para delete)
}

export interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
  validade?: string;
  disciplinaIds?: string[];
}

export interface Disciplina {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
}

export interface Tema {
  primary: string;
  accent: string;
  background: string;
  avatarUrl?: string;
}

export const TEMA_PADRAO: Tema = {
  primary: "220 60% 28%",
  accent: "35 75% 55%",
  background: "hsl(40 33% 98%)",
  avatarUrl: "",
};

// Compat: alguns componentes antigos importam GITHUB_CONFIG só para mostrar info
export const GITHUB_CONFIG = {
  owner: "vercel-blob",
  repo: "(armazenamento na Vercel)",
  branch: "main",
  materialsPath: "materials",
  avisosPath: "data/avisos.json",
  temaPath: "data/tema.json",
  disciplinasPath: "data/disciplinas.json",
};

// ============= Helpers =============
function authHeaders(password: string) {
  return { "x-admin-password": password };
}

async function getJson<T>(key: "disciplinas" | "avisos" | "tema"): Promise<T | null> {
  const res = await fetch(`${BASE}?action=json&key=${key}&t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const body = await res.json();
  return (body?.value ?? null) as T | null;
}

async function putJson(password: string, key: "disciplinas" | "avisos" | "tema", value: unknown) {
  const res = await fetch(`${BASE}?action=json`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(password) },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Falha ao salvar ${key} (${res.status})`);
  }
}

// ============= Verificação da senha =============
export async function verifyToken(password: string): Promise<boolean> {
  const res = await fetch(`${BASE}?action=verify`, {
    method: "POST",
    headers: authHeaders(password),
  });
  if (!res.ok) return false;
  const body = await res.json().catch(() => ({}));
  return !!body.ok;
}

// ============= Disciplinas =============
export async function fetchDisciplinas(): Promise<{ disciplinas: Disciplina[]; sha: string | null }> {
  const data = await getJson<Disciplina[]>("disciplinas");
  return { disciplinas: Array.isArray(data) ? data : [], sha: null };
}
export async function saveDisciplinas(password: string, disciplinas: Disciplina[], _sha: string | null): Promise<string> {
  await putJson(password, "disciplinas", disciplinas);
  return "ok";
}

// ============= Avisos =============
export async function fetchAvisos(): Promise<{ avisos: Aviso[]; sha: string | null }> {
  const data = await getJson<Aviso[]>("avisos");
  return { avisos: Array.isArray(data) ? data : [], sha: null };
}
export async function saveAvisos(password: string, avisos: Aviso[], _sha: string | null): Promise<string> {
  await putJson(password, "avisos", avisos);
  return "ok";
}

// ============= Tema =============
export async function fetchTema(): Promise<{ tema: Tema; sha: string | null }> {
  const data = await getJson<Partial<Tema>>("tema");
  return { tema: data ? { ...TEMA_PADRAO, ...data } : TEMA_PADRAO, sha: null };
}
export async function saveTema(password: string, tema: Tema, _sha: string | null): Promise<string> {
  await putJson(password, "tema", tema);
  return "ok";
}

// ============= Materiais =============
export async function listMaterials(disciplinaId?: string): Promise<MaterialItem[]> {
  if (!disciplinaId) return [];
  const res = await fetch(`${BASE}?action=list&disciplinaId=${encodeURIComponent(disciplinaId)}&t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Erro ao listar materiais (${res.status})`);
  const body = await res.json();
  return (body?.items ?? []) as MaterialItem[];
}

export async function uploadMaterial(
  password: string,
  file: File,
  disciplinaId?: string,
  customName?: string,
): Promise<void> {
  if (!disciplinaId) throw new Error("Selecione uma disciplina");
  const originalName = file.name;
  const lastDot = originalName.lastIndexOf(".");
  const ext = lastDot > 0 ? originalName.slice(lastDot) : "";
  const baseRaw =
    customName && customName.trim()
      ? customName.trim().toLowerCase().endsWith(ext.toLowerCase())
        ? customName.trim()
        : customName.trim() + ext
      : originalName;
  const safeName = baseRaw.replace(/[^\w.\-]+/g, "_");

  const res = await fetch(
    `${BASE}?action=upload&disciplinaId=${encodeURIComponent(disciplinaId)}&filename=${encodeURIComponent(safeName)}`,
    {
      method: "POST",
      headers: { ...authHeaders(password), "content-type": file.type || "application/octet-stream" },
      body: file,
    },
  );
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Falha no upload (${res.status})`);
  }
}

export async function deleteMaterial(password: string, item: MaterialItem): Promise<void> {
  const res = await fetch(`${BASE}?action=delete`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(password) },
    body: JSON.stringify({ url: item.download_url }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Falha ao remover (${res.status})`);
  }
}
