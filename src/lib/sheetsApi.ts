export interface SheetRow {
  id: string;
  componentId: string;
  componentName: string;
  priceSource: number;
}

export interface SavedSheet {
  id: string;
  name: string;
  source_currency: string;
  rows: SheetRow[];
  created_at: string;
  updated_at: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function url(path: string) {
  return `${API_BASE}${path}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url(path), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function listSheets(): Promise<SavedSheet[]> {
  const data = await fetchJson<{ sheets: SavedSheet[] }>("/api/sheets");
  return data.sheets;
}

export async function createSheet(sheet: { name: string; source_currency: string; rows: SheetRow[] }): Promise<SavedSheet> {
  const data = await fetchJson<{ sheet: SavedSheet }>("/api/sheets", {
    method: "POST",
    body: JSON.stringify(sheet),
  });
  return data.sheet;
}

export async function updateSheet(id: string, sheet: { name: string; source_currency: string; rows: SheetRow[] }): Promise<SavedSheet> {
  const data = await fetchJson<{ sheet: SavedSheet }>(`/api/sheets/${id}`, {
    method: "PUT",
    body: JSON.stringify(sheet),
  });
  return data.sheet;
}

export async function deleteSheet(id: string): Promise<void> {
  await fetchJson<{ ok: boolean }>(`/api/sheets/${id}`, { method: "DELETE" });
}
