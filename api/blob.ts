// Vercel Serverless Function — gerencia disciplinas/avisos/tema (JSON)
// e materiais (arquivos) usando Vercel Blob.
//
// Variáveis de ambiente necessárias na Vercel:
// - BLOB_READ_WRITE_TOKEN  → criada automaticamente ao habilitar Blob no projeto
// - ADMIN_PASSWORD         → senha para operações de escrita (mesma da tela admin)

import { put, del, list, type PutBlobResult } from "@vercel/blob";

export const config = { runtime: "nodejs" };

const JSON_KEYS = ["disciplinas", "avisos", "tema"] as const;
type JsonKey = (typeof JSON_KEYS)[number];

function jsonPath(key: JsonKey) {
  return `data/${key}.json`;
}

function isJsonKey(v: any): v is JsonKey {
  return JSON_KEYS.includes(v);
}

function authorized(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const header = req.headers.get("x-admin-password") || "";
  return header === expected;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

async function readJson(key: JsonKey): Promise<unknown> {
  // Vercel Blob: list with exact prefix; pega URL pública e baixa.
  const { blobs } = await list({ prefix: jsonPath(key), limit: 1 });
  const blob = blobs.find((b) => b.pathname === jsonPath(key));
  if (!blob) return key === "tema" ? null : [];
  const res = await fetch(blob.url + `?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return key === "tema" ? null : [];
  try { return await res.json(); } catch { return key === "tema" ? null : []; }
}

async function writeJson(key: JsonKey, value: unknown): Promise<PutBlobResult> {
  return put(jsonPath(key), JSON.stringify(value, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  try {
    // ============= JSON: GET =============
    if (req.method === "GET" && action === "json") {
      const key = url.searchParams.get("key");
      if (!isJsonKey(key)) return jsonResponse({ error: "key inválida" }, 400);
      const value = await readJson(key);
      return jsonResponse({ value });
    }

    // ============= JSON: PUT =============
    if (req.method === "POST" && action === "json") {
      if (!authorized(req)) return jsonResponse({ error: "não autorizado" }, 401);
      const body = (await req.json()) as { key?: string; value?: unknown };
      if (!isJsonKey(body.key)) return jsonResponse({ error: "key inválida" }, 400);
      await writeJson(body.key, body.value ?? (body.key === "tema" ? {} : []));
      return jsonResponse({ ok: true });
    }

    // ============= MATERIAIS: LIST =============
    if (req.method === "GET" && action === "list") {
      const disciplinaId = url.searchParams.get("disciplinaId") || "";
      if (!disciplinaId) return jsonResponse({ items: [] });
      const prefix = `materials/${disciplinaId}/`;
      const { blobs } = await list({ prefix, limit: 1000 });
      const items = blobs.map((b) => ({
        name: b.pathname.slice(prefix.length),
        path: b.pathname,
        size: b.size,
        download_url: b.url,
        sha: b.url, // identificador estável para delete
      }));
      return jsonResponse({ items });
    }

    // ============= MATERIAIS: UPLOAD =============
    if (req.method === "POST" && action === "upload") {
      if (!authorized(req)) return jsonResponse({ error: "não autorizado" }, 401);
      const disciplinaId = url.searchParams.get("disciplinaId") || "";
      const filename = url.searchParams.get("filename") || "";
      if (!disciplinaId || !filename) {
        return jsonResponse({ error: "disciplinaId e filename obrigatórios" }, 400);
      }
      if (!req.body) return jsonResponse({ error: "body vazio" }, 400);
      const safe = filename.replace(/[^\w.\-]+/g, "_");
      const result = await put(`materials/${disciplinaId}/${safe}`, req.body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: req.headers.get("content-type") || "application/octet-stream",
      });
      return jsonResponse({ ok: true, url: result.url });
    }

    // ============= MATERIAIS: DELETE =============
    if (req.method === "POST" && action === "delete") {
      if (!authorized(req)) return jsonResponse({ error: "não autorizado" }, 401);
      const body = (await req.json()) as { url?: string };
      if (!body.url) return jsonResponse({ error: "url obrigatória" }, 400);
      await del(body.url);
      return jsonResponse({ ok: true });
    }

    // ============= AUTH PING =============
    if (req.method === "POST" && action === "verify") {
      return jsonResponse({ ok: authorized(req) });
    }

    return jsonResponse({ error: "ação desconhecida" }, 404);
  } catch (e: any) {
    return jsonResponse({ error: e?.message || "erro interno" }, 500);
  }
}
