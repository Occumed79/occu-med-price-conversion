import http from "node:http";
import { URL as NodeURL } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, ".data");
const FALLBACK_FILE = path.join(DATA_DIR, "sheets.json");

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const SERVICE_NAME = "occu-med-price-conversion";

let activePool = null;
const dbStatus = {
  connected: false,
  lastError: null,
  usingFallback: false,
};

function sanitizeDatabaseUrl(raw) {
  if (!raw) return "";
  let url = raw.trim();
  if (!url) return "";

  // Remove channel_binding parameter
  url = url.replace(/[?&]channel_binding=[^&]*/gi, "");
  // Clean up trailing ? or &
  url = url.replace(/\?$/, "").replace(/&$/, "");

  // Ensure sslmode=require in production
  if (process.env.NODE_ENV === "production" && !/sslmode=/i.test(url)) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}sslmode=require`;
  }

  return url;
}

function getDirectUrl(pooledUrl) {
  try {
    const parsed = new NodeURL(pooledUrl);
    const host = parsed.hostname;
    if (!host.includes("-pooler")) return "";
    const directHost = host.replace("-pooler.", ".");
    parsed.hostname = directHost;
    parsed.host = directHost;
    return parsed.toString();
  } catch {
    return "";
  }
}

function createPool(connectionString) {
  return new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
}

async function testPool(pool) {
  const client = await pool.connect();
  try {
    await client.query("select 1");
    return true;
  } finally {
    client.release();
  }
}

async function initDbPool() {
  const rawUrl = process.env.DATABASE_URL || "";
  const primaryUrl = sanitizeDatabaseUrl(rawUrl);

  if (!primaryUrl) {
    dbStatus.connected = false;
    dbStatus.lastError = "DATABASE_URL not set";
    dbStatus.usingFallback = true;
    return;
  }

  // Try primary URL
  try {
    activePool = createPool(primaryUrl);
    await testPool(activePool);
    dbStatus.connected = true;
    dbStatus.lastError = null;
    dbStatus.usingFallback = false;
    console.log("neon primary connection ok");
    return;
  } catch (error) {
    console.error("neon primary failed:", error.message);
    dbStatus.lastError = error.message;
    if (activePool) {
      try { await activePool.end(); } catch {}
      activePool = null;
    }
  }

  // Try direct URL fallback if primary was a pooled connection
  const directUrl = getDirectUrl(primaryUrl);
  if (directUrl) {
    try {
      activePool = createPool(directUrl);
      await testPool(activePool);
      dbStatus.connected = true;
      dbStatus.lastError = null;
      dbStatus.usingFallback = false;
      console.log("neon direct connection ok");
      return;
    } catch (error) {
      console.error("neon direct failed:", error.message);
      dbStatus.lastError = error.message;
      if (activePool) {
        try { await activePool.end(); } catch {}
        activePool = null;
      }
    }
  }

  dbStatus.connected = false;
  dbStatus.usingFallback = true;
  console.warn("using local json fallback for sheets");
}

async function initDb() {
  if (!activePool) return;
  try {
    await activePool.query("create extension if not exists pgcrypto");
    await activePool.query(`
      create table if not exists sheets (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        source_currency text not null default 'EUR',
        rows jsonb not null default '[]'::jsonb,
        adjustments jsonb not null default '[]'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);
    await activePool.query(`
      do $$
      begin
        if exists (
          select 1 from information_schema.columns
          where table_name = 'sheets' and column_name = 'target_currency'
        ) then
          alter table sheets rename column target_currency to source_currency;
        end if;
        if not exists (
          select 1 from information_schema.columns
          where table_name = 'sheets' and column_name = 'adjustments'
        ) then
          alter table sheets add column adjustments jsonb not null default '[]'::jsonb;
        end if;
      end $$;
    `);
    console.log("database initialized");
  } catch (error) {
    console.error("database init failed:", error.message);
    dbStatus.lastError = error.message;
    throw error;
  }
}

async function ensureFallbackDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadFallbackSheets() {
  await ensureFallbackDir();
  try {
    const raw = await fs.readFile(FALLBACK_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.sheets) ? data.sheets : [];
  } catch {
    return [];
  }
}

async function saveFallbackSheets(sheets) {
  await ensureFallbackDir();
  await fs.writeFile(FALLBACK_FILE, JSON.stringify({ sheets }, null, 2));
}

async function fallbackList() {
  const sheets = await loadFallbackSheets();
  return { sheets: sheets.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)) };
}

async function fallbackGetById(id) {
  const sheets = await loadFallbackSheets();
  const sheet = sheets.find((s) => s.id === id);
  return sheet ? { sheet } : null;
}

async function fallbackCreate(body) {
  const sheets = await loadFallbackSheets();
  const now = new Date().toISOString();
  const sheet = {
    id: crypto.randomUUID(),
    name: body.name,
    source_currency: body.source_currency || "EUR",
    rows: Array.isArray(body.rows) ? body.rows : [],
    adjustments: Array.isArray(body.adjustments) ? body.adjustments : [],
    created_at: now,
    updated_at: now,
  };
  sheets.push(sheet);
  await saveFallbackSheets(sheets);
  return { sheet };
}

async function fallbackUpdate(id, body) {
  const sheets = await loadFallbackSheets();
  const index = sheets.findIndex((s) => s.id === id);
  if (index === -1) return null;
  const now = new Date().toISOString();
  sheets[index] = {
    ...sheets[index],
    name: body.name,
    source_currency: body.source_currency,
    rows: Array.isArray(body.rows) ? body.rows : sheets[index].rows,
    adjustments: Array.isArray(body.adjustments) ? body.adjustments : sheets[index].adjustments,
    updated_at: now,
  };
  await saveFallbackSheets(sheets);
  return { sheet: sheets[index] };
}

async function fallbackDelete(id) {
  const sheets = await loadFallbackSheets();
  const filtered = sheets.filter((s) => s.id !== id);
  await saveFallbackSheets(filtered);
  return { ok: true };
}

async function dbList() {
  const { rows } = await activePool.query(
    "select id, name, source_currency, rows, adjustments, created_at, updated_at from sheets order by updated_at desc"
  );
  return { sheets: rows };
}

async function dbGetById(id) {
  const { rows } = await activePool.query(
    "select id, name, source_currency, rows, adjustments, created_at, updated_at from sheets where id = $1",
    [id]
  );
  return rows.length > 0 ? { sheet: rows[0] } : null;
}

async function dbCreate(body) {
  const { rows } = await activePool.query(
    "insert into sheets (name, source_currency, rows, adjustments) values ($1, $2, $3, $4) returning *",
    [body.name, body.source_currency || "EUR", JSON.stringify(body.rows || []), JSON.stringify(body.adjustments || [])]
  );
  return { sheet: rows[0] };
}

async function dbUpdate(id, body) {
  const { rows } = await activePool.query(
    "update sheets set name = $1, source_currency = $2, rows = $3, adjustments = $4, updated_at = now() where id = $5 returning *",
    [body.name, body.source_currency, JSON.stringify(body.rows || []), JSON.stringify(body.adjustments || []), id]
  );
  return rows.length > 0 ? { sheet: rows[0] } : null;
}

async function dbDelete(id) {
  await activePool.query("delete from sheets where id = $1", [id]);
  return { ok: true };
}

async function withFallback(operation, fallback) {
  if (activePool && dbStatus.connected) {
    try {
      return await operation();
    } catch (error) {
      console.error("db operation failed, falling back:", error.message);
      dbStatus.connected = false;
      dbStatus.lastError = error.message;
      dbStatus.usingFallback = true;
      return await fallback();
    }
  }
  return await fallback();
}

function safeError(error) {
  const message = error?.message || String(error);
  if (/password authentication failed/i.test(message)) {
    return "Database login failed. Update the Render DATABASE_URL with the current Neon connection string, then redeploy.";
  }
  if (/ENOTFOUND/i.test(message)) {
    return "Database host not found. Check your DATABASE_URL hostname and redeploy.";
  }
  if (/ECONNREFUSED/i.test(message)) {
    return "Database connection refused. Check your DATABASE_URL and redeploy.";
  }
  if (/self-signed certificate/i.test(message)) {
    return "Database SSL certificate error. Make sure sslmode=require is set in production.";
  }
  return "Database error. Please try again later or contact support.";
}

function sanitizedLastError() {
  if (!dbStatus.lastError) return null;
  return safeError({ message: dbStatus.lastError });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function validateSheetBody(body) {
  const { name, rows } = body || {};
  if (!name || !Array.isArray(rows)) {
    return { error: "name and rows are required" };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    });
    return res.end();
  }

  const url = new NodeURL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbStatus.connected,
        fallback: dbStatus.usingFallback,
      },
      lastError: sanitizedLastError(),
    });
  }

  if (req.method === "GET" && url.pathname === "/api/db-status") {
    return sendJson(res, 200, {
      connected: dbStatus.connected,
      fallback: dbStatus.usingFallback,
      lastError: sanitizedLastError(),
    });
  }

  try {
    const sheetMatch = url.pathname.match(/^\/api\/sheets\/([^/]+)$/);

    if (req.method === "GET" && url.pathname === "/api/sheets") {
      const data = await withFallback(dbList, fallbackList);
      return sendJson(res, 200, data);
    }

    if (req.method === "GET" && sheetMatch) {
      const id = decodeURIComponent(sheetMatch[1]);
      const data = await withFallback(() => dbGetById(id), () => fallbackGetById(id));
      if (!data) return sendJson(res, 404, { error: "Sheet not found" });
      return sendJson(res, 200, data);
    }

    if (req.method === "POST" && url.pathname === "/api/sheets") {
      const body = await readJson(req);
      const validation = validateSheetBody(body);
      if (validation) return sendJson(res, 400, validation);
      const data = await withFallback(() => dbCreate(body), () => fallbackCreate(body));
      return sendJson(res, 200, data);
    }

    if (req.method === "PUT" && sheetMatch) {
      const id = decodeURIComponent(sheetMatch[1]);
      const body = await readJson(req);
      const validation = validateSheetBody(body);
      if (validation) return sendJson(res, 400, validation);
      const data = await withFallback(() => dbUpdate(id, body), () => fallbackUpdate(id, body));
      if (!data) return sendJson(res, 404, { error: "Sheet not found" });
      return sendJson(res, 200, data);
    }

    if (req.method === "DELETE" && sheetMatch) {
      const id = decodeURIComponent(sheetMatch[1]);
      const data = await withFallback(() => dbDelete(id), () => fallbackDelete(id));
      return sendJson(res, 200, data);
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error("request error:", error);
    return sendJson(res, 500, { error: safeError(error) });
  }
});

const port = Number(process.env.PORT || 3001);

async function start() {
  await initDbPool();
  if (activePool) {
    try {
      await initDb();
    } catch (error) {
      console.error("database init failed, using fallback:", error.message);
      dbStatus.connected = false;
      dbStatus.usingFallback = true;
    }
  }
  server.listen(port, () => {
    console.log(`${SERVICE_NAME} backend listening on :${port}`);
  });
}

start();
