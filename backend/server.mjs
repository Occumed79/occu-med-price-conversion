import http from "node:http";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    });
    return res.end();
  }

  try {
    if (req.method === "GET" && (req.url || "/") === "/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "occu-med-currency-backend",
        timestamp: new Date().toISOString(),
      });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(res, 500, { error: String(error) });
  }
});

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  console.log(`currency board backend listening on :${port}`);
});
