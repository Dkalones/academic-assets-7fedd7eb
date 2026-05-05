// Serviço de integração com a GitHub API
// Configure o owner/repo/branch abaixo conforme o repositório que hospeda o site no GitHub Pages.

export const GITHUB_CONFIG = {
  owner: "dkalones",
  repo: "academic-assets-7fedd7eb",
  branch: "main",
  materialsPath: "materiais",
  avisosPath: "data/avisos.json",
  temaPath: "data/tema.json",
  disciplinasPath: "data/disciplinas.json",
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

// Lista materiais. Se disciplinaId for informado, lista de materiais/<disciplinaId>.
// Sem disciplinaId, lista a raiz (materiais legados, antes do recurso de disciplinas).
export async function listMaterials(disciplinaId?: string): Promise<MaterialItem[]> {
  const { owner, repo, branch, materialsPath } = GITHUB_CONFIG;
  const path = disciplinaId ? `${materialsPath}/${disciplinaId}` : materialsPath;
  const url = `${API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
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
  disciplinaIds?: string[]; // vazio/ausente = aparece para todas
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

export async function uploadMaterial(token: string, file: File, disciplinaId?: string): Promise<void> {
  const { owner, repo, branch, materialsPath } = GITHUB_CONFIG;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const folder = disciplinaId ? `${materialsPath}/${disciplinaId}` : materialsPath;
  const path = `${folder}/${safeName}`;
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

// Helper genérico: PUT JSON com retry automático em conflito de SHA.
async function putJsonFile(
  token: string,
  path: string,
  jsonValue: unknown,
  sha: string | null,
  message: string,
): Promise<string> {
  const { owner, repo, branch } = GITHUB_CONFIG;
  const url = `${API}/repos/${owner}/${repo}/contents/${path}`;

  const doPut = async (currentSha: string | null) => {
    const content = utf8ToBase64(JSON.stringify(jsonValue, null, 2));
    return fetch(url, {
      method: "PUT",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ message, content, branch, sha: currentSha ?? undefined }),
    });
  };

  let res = await doPut(sha);
  // Se conflito de SHA (409) ou SHA inválida (422), refaz o GET pra pegar o sha atual e tenta de novo.
  if (res.status === 409 || res.status === 422) {
    const head = await fetch(`${url}?ref=${branch}`, { headers: authHeaders(token) });
    if (head.ok) {
      const cur = await head.json();
      res = await doPut(cur.sha);
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    throw new Error(err.message || `Falha ao salvar ${path} (${res.status})`);
  }
  const data = await res.json();
  return data.content.sha;
}

export async function saveAvisos(token: string, avisos: Aviso[], sha: string | null): Promise<string> {
  return putJsonFile(token, GITHUB_CONFIG.avisosPath, avisos, sha, "Atualiza avisos");
}

export async function verifyToken(token: string): Promise<boolean> {
  const { owner, repo } = GITHUB_CONFIG;
  const res = await fetch(`${API}/repos/${owner}/${repo}`, { headers: authHeaders(token) });
  return res.ok;
}

// =============== Disciplinas ===============
export interface Disciplina {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string; // CSS color opcional para identificar a aba
}

export async function fetchDisciplinas(): Promise<{ disciplinas: Disciplina[]; sha: string | null }> {
  const { owner, repo, branch, disciplinasPath } = GITHUB_CONFIG;
  const url = `${API}/repos/${owner}/${repo}/contents/${disciplinasPath}?ref=${branch}`;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 404) return { disciplinas: [], sha: null };
  if (!res.ok) return { disciplinas: [], sha: null };
  const data = await res.json();
  try {
    const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
    const parsed = JSON.parse(decoded);
    return { disciplinas: Array.isArray(parsed) ? parsed : [], sha: data.sha };
  } catch {
    return { disciplinas: [], sha: data.sha };
  }
}

export async function saveDisciplinas(token: string, disciplinas: Disciplina[], sha: string | null): Promise<string> {
  return putJsonFile(token, GITHUB_CONFIG.disciplinasPath, disciplinas, sha, "Atualiza disciplinas");
}

// =============== Tema ===============
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
  return putJsonFile(token, GITHUB_CONFIG.temaPath, tema, sha, "Atualiza tema do site");
}
