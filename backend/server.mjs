import http from "node:http";
import { URL } from "node:url";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

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

async function initDb() {
  await pool.query(`
    create table if not exists sheets (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      target_currency text not null default 'EUR',
      rows jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
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

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  try {
    await initDb();

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, service: "occu-med-price-conversion", timestamp: new Date().toISOString() });
    }

    if (req.method === "GET" && url.pathname === "/api/sheets") {
      const { rows } = await pool.query(
        "select id, name, target_currency, rows, created_at, updated_at from sheets order by updated_at desc"
      );
      return sendJson(res, 200, { sheets: rows });
    }

    const sheetMatch = url.pathname.match(/^\/api\/sheets\/([^/]+)$/);
    if (req.method === "GET" && sheetMatch) {
      const id = decodeURIComponent(sheetMatch[1]);
      const { rows } = await pool.query(
        "select id, name, target_currency, rows, created_at, updated_at from sheets where id = $1",
        [id]
      );
      if (rows.length === 0) return sendJson(res, 404, { error: "Sheet not found" });
      return sendJson(res, 200, { sheet: rows[0] });
    }

    if (req.method === "POST" && url.pathname === "/api/sheets") {
      const body = await readJson(req);
      const { name, target_currency, rows } = body || {};
      if (!name || !Array.isArray(rows)) {
        return sendJson(res, 400, { error: "name and rows are required" });
      }
      const { rows: result } = await pool.query(
        "insert into sheets (name, target_currency, rows) values ($1, $2, $3) returning *",
        [name, target_currency || "EUR", JSON.stringify(rows)]
      );
      return sendJson(res, 200, { sheet: result[0] });
    }

    if (req.method === "PUT" && sheetMatch) {
      const id = decodeURIComponent(sheetMatch[1]);
      const body = await readJson(req);
      const { name, target_currency, rows } = body || {};
      const { rows: result } = await pool.query(
        "update sheets set name = $1, target_currency = $2, rows = $3, updated_at = now() where id = $4 returning *",
        [name, target_currency, JSON.stringify(rows), id]
      );
      if (result.length === 0) return sendJson(res, 404, { error: "Sheet not found" });
      return sendJson(res, 200, { sheet: result[0] });
    }

    if (req.method === "DELETE" && sheetMatch) {
      const id = decodeURIComponent(sheetMatch[1]);
      await pool.query("delete from sheets where id = $1", [id]);
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(res, 500, { error: String(error) });
  }
});

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  console.log(`price-conversion backend listening on :${port}`);
});
