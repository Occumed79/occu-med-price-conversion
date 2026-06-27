export interface SheetRow {
  id: string;
  componentId: string;
  componentName: string;
  priceUsd: number;
}

export interface SavedSheet {
  id: string;
  name: string;
  targetCurrency: string;
  rows: SheetRow[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "occu-med-conversion-sheets";

export function getSavedSheets(): SavedSheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSheet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSheet(sheet: Omit<SavedSheet, "id" | "createdAt" | "updatedAt">): SavedSheet {
  const sheets = getSavedSheets();
  const now = new Date().toISOString();
  const newSheet: SavedSheet = {
    ...sheet,
    id: `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newSheet, ...sheets]));
  return newSheet;
}

export function updateSheet(updated: SavedSheet): SavedSheet {
  const sheets = getSavedSheets();
  const now = new Date().toISOString();
  const changed = { ...updated, updatedAt: now };
  const next = sheets.map((s) => (s.id === changed.id ? changed : s));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return changed;
}

export function deleteSheet(id: string): void {
  const sheets = getSavedSheets();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets.filter((s) => s.id !== id)));
}
