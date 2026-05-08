// api/blob.ts

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put, del, list, type PutBlobResult } from "@vercel/blob";

// Configuração Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};

const JSON_KEYS = ["disciplinas", "avisos", "tema"] as const;
type JsonKey = (typeof JSON_KEYS)[number];

function jsonPath(key: JsonKey) {
  return `data/${key}.json`;
}

function isJsonKey(v: any): v is JsonKey {
  return JSON_KEYS.includes(v);
}

function authorized(req: VercelRequest) {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    console.error("ADMIN_PASSWORD não configurada");
    return false;
  }

  const header = req.headers["x-admin-password"];

  return header === expected;
}

async function readJson(key: JsonKey): Promise<unknown> {
  const { blobs } = await list({
    prefix: jsonPath(key),
    limit: 1,
  });

  const blob = blobs.find(
    (b) => b.pathname === jsonPath(key)
  );

  if (!blob) {
    return key === "tema" ? null : [];
  }

  const response = await fetch(
    blob.url + `?t=${Date.now()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return key === "tema" ? null : [];
  }

  try {
    return await response.json();
  } catch {
    return key === "tema" ? null : [];
  }
}

async function writeJson(
  key: JsonKey,
  value: unknown
): Promise<PutBlobResult> {

  return put(
    jsonPath(key),
    JSON.stringify(value, null, 2),
    {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    }
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {

  const action = req.query.action as string;

  try {

    // =========================
    // JSON GET
    // =========================
    if (req.method === "GET" && action === "json") {

      const key = req.query.key as string;

      if (!isJsonKey(key)) {
        return res.status(400).json({
          error: "key inválida",
        });
      }

      const value = await readJson(key);

      return res.status(200).json({
        value,
      });
    }

    // =========================
    // JSON SAVE
    // =========================
    if (req.method === "POST" && action === "json") {

      if (!authorized(req)) {
        return res.status(401).json({
          error: "não autorizado",
        });
      }

      const body = req.body || {};

      const key = body.key;

      if (!isJsonKey(key)) {
        return res.status(400).json({
          error: "key inválida",
        });
      }

      await writeJson(
        key,
        body.value ?? (key === "tema" ? {} : [])
      );

      return res.status(200).json({
        ok: true,
      });
    }

    // =========================
    // LISTAR MATERIAIS
    // =========================
    if (req.method === "GET" && action === "list") {

      const disciplinaId =
        (req.query.disciplinaId as string) || "";

      if (!disciplinaId) {
        return res.status(200).json({
          items: [],
        });
      }

      const prefix = `materials/${disciplinaId}/`;

      const { blobs } = await list({
        prefix,
        limit: 1000,
      });

      const items = blobs.map((b) => ({
        name: b.pathname.slice(prefix.length),
        path: b.pathname,
        size: b.size,
        download_url: b.url,
        sha: b.url,
      }));

      return res.status(200).json({
        items,
      });
    }

    // =========================
    // DELETE MATERIAL
    // =========================
    if (req.method === "POST" && action === "delete") {

      if (!authorized(req)) {
        return res.status(401).json({
          error: "não autorizado",
        });
      }

      const body = req.body || {};

      if (!body.url) {
        return res.status(400).json({
          error: "url obrigatória",
        });
      }

      await del(body.url);

      return res.status(200).json({
        ok: true,
      });
    }

    // =========================
    // VERIFY LOGIN
    // =========================
    if (req.method === "POST" && action === "verify") {

      return res.status(200).json({
        ok: authorized(req),
      });
    }

    return res.status(404).json({
      error: "ação desconhecida",
    });

  } catch (e: any) {

    console.error("ERRO API BLOB:");
    console.error(e);

    return res.status(500).json({
      error: e?.message || "erro interno",
      stack: e?.stack || null,
    });
  }
}
