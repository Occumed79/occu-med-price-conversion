const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function url(path: string) {
  return `${API_BASE}${path}`;
}

export async function apiCreateEnvelope() {
  const res = await fetch(url("/api/signed/envelopes"), { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ envelopeId: string; createdAt: string }>;
}

export async function apiLogView(envelopeId: string) {
  const res = await fetch(url(`/api/signed/envelopes/${envelopeId}/view`), { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ envelopeId: string; viewedAt: string }>;
}

export async function apiFinalizeEnvelope(
  envelopeId: string,
  payload: { data: unknown; viewedAt?: string; recipientEmail?: string },
) {
  const res = await fetch(url(`/api/signed/envelopes/${envelopeId}/finalize`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    envelopeId: string;
    signedAt: string;
    pdfHash: string;
    pdfBase64: string;
    certificateBase64: string;
  }>;
}

export function base64PdfToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
