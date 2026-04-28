import crypto from "node:crypto";
import http from "node:http";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { generateCertificatePdf, generateSignedPdf } from "./pdf.mjs";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ENVELOPE_PREFIX = process.env.ENVELOPE_PREFIX || "OM";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

function newEnvelopeId() {
  const rand = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `${ENVELOPE_PREFIX}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function base64ToUint8(base64) {
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 12_000_000) {
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

async function uploadPdf(path, bytes) {
  const { error } = await supabase.storage.from("envelopes").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
}

async function maybeSendEmail({ to, envelopeId, pdfHash, pdfBytes, certBytes }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!to || !apiKey || !from) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Signed Clinic Memo ${envelopeId}`,
      text: `Envelope ${envelopeId} has been finalized.\nSHA-256: ${pdfHash}`,
      attachments: [
        { filename: `${envelopeId}-signed.pdf`, content: Buffer.from(pdfBytes).toString("base64") },
        { filename: `${envelopeId}-certificate.pdf`, content: Buffer.from(certBytes).toString("base64") },
      ],
    }),
  });
}

async function getEnvelope(envelopeId) {
  const { data, error } = await supabase
    .from("envelopes")
    .select("envelope_id,created_at,viewed_at")
    .eq("envelope_id", envelopeId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, service: "occu-med-backend", timestamp: new Date().toISOString() });
    }

    if (req.method === "POST" && url.pathname === "/api/signed/envelopes") {
      const envelopeId = newEnvelopeId();
      const createdAt = new Date().toISOString();
      const ip = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "unknown";

      const { error } = await supabase.from("envelopes").insert({
        envelope_id: envelopeId,
        created_at: createdAt,
        ip_address: ip,
        user_agent: userAgent,
        status: "created",
      });
      if (error) throw error;

      return sendJson(res, 200, { envelopeId, createdAt });
    }

    const viewMatch = url.pathname.match(/^\/api\/signed\/envelopes\/([^/]+)\/view$/);
    if (req.method === "POST" && viewMatch) {
      const envelopeId = decodeURIComponent(viewMatch[1]);
      const viewedAt = new Date().toISOString();
      const ip = getClientIp(req);
      const ua = req.headers["user-agent"] || "unknown";

      const { error } = await supabase.from("envelopes").upsert({
        envelope_id: envelopeId,
        viewed_at: viewedAt,
        viewed_ip: ip,
        viewed_user_agent: ua,
        status: "viewed",
      }, { onConflict: "envelope_id" });
      if (error) throw error;

      return sendJson(res, 200, { envelopeId, viewedAt });
    }

    const finalizeMatch = url.pathname.match(/^\/api\/signed\/envelopes\/([^/]+)\/finalize$/);
    if (req.method === "POST" && finalizeMatch) {
      const envelopeId = decodeURIComponent(finalizeMatch[1]);
      const body = await readJson(req);
      const { data, viewedAt, recipientEmail } = body;

      if (!data?.agreedElectronic) return sendJson(res, 400, { error: "Agreement required." });
      if (!data?.occuMedRepName || !data?.clinicRepFullName) {
        return sendJson(res, 400, { error: "Both signatures are required." });
      }

      const signedAt = new Date().toISOString();
      const existingEnvelope = await getEnvelope(envelopeId);
      const createdAt = existingEnvelope?.created_at || signedAt;
      const effectiveViewedAt = viewedAt || existingEnvelope?.viewed_at || signedAt;
      const ip = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "unknown";

      const pdfBytes = data?.signedPdfBase64
        ? base64ToUint8(data.signedPdfBase64)
        : await generateSignedPdf({ envelopeId, data, signedAt, viewedAt: effectiveViewedAt, ip, userAgent });

      const pdfHash = sha256Hex(pdfBytes);
      const certBytes = await generateCertificatePdf({
        envelopeId,
        pdfHash,
        audit: {
          createdAt,
          viewedAt: effectiveViewedAt,
          signedAt,
          ipAddress: ip,
          userAgent,
          occuMedRepName: data.occuMedRepName,
          clinicRepFullName: data.clinicRepFullName,
          agreedElectronic: Boolean(data.agreedElectronic),
        },
      });

      const pdfPath = `${envelopeId}/document.pdf`;
      const certPath = `${envelopeId}/certificate.pdf`;
      await uploadPdf(pdfPath, pdfBytes);
      await uploadPdf(certPath, certBytes);

      const { error } = await supabase.from("envelopes").upsert({
        envelope_id: envelopeId,
        status: "signed",
        pdf_hash: pdfHash,
        pdf_path: pdfPath,
        certificate_path: certPath,
        created_at: createdAt,
        viewed_at: effectiveViewedAt,
        signed_at: signedAt,
        ip_address: ip,
        user_agent: userAgent,
        signed_ip: ip,
        signed_user_agent: userAgent,
        occu_med_rep_name: data.occuMedRepName,
        occu_med_rep_title: data.occuMedRepTitle,
        clinic_rep_name: data.clinicRepFullName,
        clinic_rep_title: data.clinicRepTitle,
        agreed_electronic: Boolean(data.agreedElectronic),
        payload: data,
      }, { onConflict: "envelope_id" });
      if (error) throw error;

      await maybeSendEmail({ to: recipientEmail, envelopeId, pdfHash, pdfBytes, certBytes });

      return sendJson(res, 200, {
        envelopeId,
        signedAt,
        createdAt,
        viewedAt: effectiveViewedAt,
        ipAddress: ip,
        userAgent,
        pdfHash,
        pdfBase64: Buffer.from(pdfBytes).toString("base64"),
        certificateBase64: Buffer.from(certBytes).toString("base64"),
      });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(res, 500, { error: String(error) });
  }
});

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  console.log(`occu-med backend listening on :${port}`);
});
