// Serviço de integração com a GitHub API
// Configure o owner/repo/branch abaixo conforme o repositório que hospeda o site no GitHub Pages.

export const GITHUB_CONFIG = {
  owner: "SEU_USUARIO_GITHUB",
  repo: "SEU_REPOSITORIO",
  branch: "main",
  materialsPath: "materiais",
  avisosPath: "data/avisos.json",
  temaPath: "data/tema.json",
};

const API = "https://api.github.com";

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export interface MaterialItem {
  name: string;
  path: string;
  size: number;
  download_url: string;
  sha: string;
}

export async function listMaterials(): Promise<MaterialItem[]> {
  const { owner, repo, branch, materialsPath } = GITHUB_CONFIG;
  const url = `${API}/repos/${owner}/${repo}/contents/${materialsPath}?ref=${branch}`;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Erro ao listar materiais (${res.status})`);
  const data = await res.json();
  return (Array.isArray(data) ? data : [])
    .filter((f: any) => f.type === "file")
    .map((f: any) => ({
      name: f.name,
      path: f.path,
      size: f.size,
      download_url: f.download_url,
      sha: f.sha,
    }));
}

export interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
}

export async function fetchAvisos(): Promise<{ avisos: Aviso[]; sha: string | null }> {
  const { owner, repo, branch, avisosPath } = GITHUB_CONFIG;
  const url = `${API}/repos/${owner}/${repo}/contents/${avisosPath}?ref=${branch}`;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 404) return { avisos: [], sha: null };
  if (!res.ok) throw new Error(`Erro ao buscar avisos (${res.status})`);
  const data = await res.json();
  try {
    const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
    const parsed = JSON.parse(decoded);
    return { avisos: Array.isArray(parsed) ? parsed : [], sha: data.sha };
  } catch {
    return { avisos: [], sha: data.sha };
  }
}

// Converte ArrayBuffer em base64 (compatível com arquivos grandes)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export async function uploadMaterial(token: string, file: File): Promise<void> {
  const { owner, repo, branch, materialsPath } = GITHUB_CONFIG;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${materialsPath}/${safeName}`;
  const buffer = await file.arrayBuffer();
  const content = arrayBufferToBase64(buffer);

  // Verifica se já existe (para obter SHA e sobrescrever)
  let sha: string | undefined;
  const check = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: authHeaders(token) }
  );
  if (check.ok) {
    const existing = await check.json();
    sha = existing.sha;
  }

  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Upload material: ${safeName}`,
      content,
      branch,
      sha,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Falha no upload (${res.status})`);
  }
}

export async function deleteMaterial(token: string, item: MaterialItem): Promise<void> {
  const { owner, repo, branch } = GITHUB_CONFIG;
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${item.path}`, {
    method: "DELETE",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Remove material: ${item.name}`,
      sha: item.sha,
      branch,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Falha ao remover (${res.status})`);
  }
}

export async function saveAvisos(token: string, avisos: Aviso[], sha: string | null): Promise<string> {
  const { owner, repo, branch, avisosPath } = GITHUB_CONFIG;
  const content = utf8ToBase64(JSON.stringify(avisos, null, 2));
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${avisosPath}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Atualiza avisos`,
      content,
      branch,
      sha: sha ?? undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Falha ao salvar avisos (${res.status})`);
  }
  const data = await res.json();
  return data.content.sha;
}

export async function verifyToken(token: string): Promise<boolean> {
  const { owner, repo } = GITHUB_CONFIG;
  const res = await fetch(`${API}/repos/${owner}/${repo}`, { headers: authHeaders(token) });
  return res.ok;
}

export interface Tema {
  primary: string;   // HSL: "220 60% 28%"
  accent: string;    // HSL: "35 75% 55%"
  background: string; // CSS válido: "#fcfbf8" | "linear-gradient(...)" | "url(...) center/cover"
}

export const TEMA_PADRAO: Tema = {
  primary: "220 60% 28%",
  accent: "35 75% 55%",
  background: "hsl(40 33% 98%)",
};

export async function fetchTema(): Promise<{ tema: Tema; sha: string | null }> {
  const { owner, repo, branch, temaPath } = GITHUB_CONFIG;
  const url = `${API}/repos/${owner}/${repo}/contents/${temaPath}?ref=${branch}`;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 404) return { tema: TEMA_PADRAO, sha: null };
  if (!res.ok) return { tema: TEMA_PADRAO, sha: null };
  const data = await res.json();
  try {
    const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
    const parsed = JSON.parse(decoded);
    return { tema: { ...TEMA_PADRAO, ...parsed }, sha: data.sha };
  } catch {
    return { tema: TEMA_PADRAO, sha: data.sha };
  }
}

export async function saveTema(token: string, tema: Tema, sha: string | null): Promise<string> {
  const { owner, repo, branch, temaPath } = GITHUB_CONFIG;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(tema, null, 2))));
  const res = await fetch(`${API}/repos/${owner}/${repo}/contents/${temaPath}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Atualiza tema do site",
      content,
      branch,
      sha: sha ?? undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Falha ao salvar tema (${res.status})`);
  }
  const data = await res.json();
  return data.content.sha;
}
