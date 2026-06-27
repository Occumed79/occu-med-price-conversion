import http from "node:http";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
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
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, service: "occu-med-price-conversion", timestamp: new Date().toISOString() });
    }

    if (req.method === "GET" && url.pathname === "/api/sheets") {
      const { data, error } = await supabase.from("sheets").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return sendJson(res, 200, { sheets: data || [] });
    }

    if (req.method === "GET" && url.pathname.match(/^\/api\/sheets\/([^/]+)$/)) {
      const id = decodeURIComponent(url.pathname.match(/^\/api\/sheets\/([^/]+)$/)[1]);
      const { data, error } = await supabase.from("sheets").select("*").eq("id", id).single();
      if (error) throw error;
      return sendJson(res, 200, { sheet: data });
    }

    if (req.method === "POST" && url.pathname === "/api/sheets") {
      const body = await readJson(req);
      const { name, target_currency, rows } = body || {};
      if (!name || !Array.isArray(rows)) {
        return sendJson(res, 400, { error: "name and rows are required" });
      }
      const { data, error } = await supabase
        .from("sheets")
        .insert({ name, target_currency: target_currency || "EUR", rows })
        .select()
        .single();
      if (error) throw error;
      return sendJson(res, 200, { sheet: data });
    }

    if (req.method === "PUT" && url.pathname.match(/^\/api\/sheets\/([^/]+)$/)) {
      const id = decodeURIComponent(url.pathname.match(/^\/api\/sheets\/([^/]+)$/)[1]);
      const body = await readJson(req);
      const { name, target_currency, rows } = body || {};
      const { data, error } = await supabase
        .from("sheets")
        .update({ name, target_currency, rows, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return sendJson(res, 200, { sheet: data });
    }

    if (req.method === "DELETE" && url.pathname.match(/^\/api\/sheets\/([^/]+)$/)) {
      const id = decodeURIComponent(url.pathname.match(/^\/api\/sheets\/([^/]+)$/)[1]);
      const { error } = await supabase.from("sheets").delete().eq("id", id);
      if (error) throw error;
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
