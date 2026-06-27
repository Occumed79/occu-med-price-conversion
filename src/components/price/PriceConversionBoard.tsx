import { useEffect, useMemo, useState } from "react";
import { ComponentSidebar } from "./ComponentSidebar";
import { fetchLiveRates, formatCurrency, formatRate } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { CURRENCIES } from "@/data/currencies";
import { EXAM_CATEGORIES, type ExamComponent } from "@/data/examComponents";
import { getSavedSheets, saveSheet, updateSheet, deleteSheet, type SavedSheet, type SheetRow } from "@/lib/sheets";
import { RefreshCw, Trash2, Calculator, Save, FolderOpen, X, Plus } from "lucide-react";

interface PriceRow {
  id: string;
  component: ExamComponent;
  priceUsd: number;
}

const componentById = (id: string): ExamComponent | undefined => {
  for (const cat of EXAM_CATEGORIES) {
    const found = cat.items.find((i) => i.id === id);
    if (found) return found;
  }
  return undefined;
};

export const PriceConversionBoard = () => {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [targetCurrency, setTargetCurrency] = useState<string>("EUR");
  const [sheetName, setSheetName] = useState<string>("");
  const [savedSheets, setSavedSheets] = useState<SavedSheet[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadRates = async () => {
    setLoading(true);
    try {
      const data = await fetchLiveRates();
      setRates(data.rates);
      setLastUpdated(new Date().toLocaleString());
    } catch (e) {
      toast({
        title: "Rate update failed",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
    setSavedSheets(getSavedSheets());
    const interval = setInterval(loadRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const addComponent = (component: ExamComponent) => {
    if (rows.some((r) => r.component.id === component.id)) return;
    setRows((prev) => [...prev, { id: `row-${Date.now()}-${Math.random()}`, component, priceUsd: 0 }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updatePrice = (id: string, priceUsd: number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, priceUsd } : r)));
  };

  const clearRows = () => {
    setRows([]);
    setCurrentSheetId(null);
    setSheetName("");
  };

  const toSheetRows = (): SheetRow[] =>
    rows.map((r) => ({ id: r.id, componentId: r.component.id, componentName: r.component.name, priceUsd: r.priceUsd }));

  const fromSheetRows = (sheetRows: SheetRow[]): PriceRow[] =>
    sheetRows
      .map((sr) => {
        const component = componentById(sr.componentId) || { id: sr.componentId, name: sr.componentName };
        return { id: sr.id || `row-${Date.now()}-${Math.random()}`, component, priceUsd: sr.priceUsd };
      });

  const handleSave = () => {
    if (rows.length === 0) {
      toast({ title: "Nothing to save", description: "Add at least one component first.", variant: "destructive" });
      return;
    }
    const name = sheetName.trim() || `Sheet ${new Date().toLocaleString()}`;
    const payload = { name, targetCurrency, rows: toSheetRows() };
    if (currentSheetId) {
      const existing = savedSheets.find((s) => s.id === currentSheetId);
      if (existing) {
        const updated = updateSheet({ ...existing, ...payload });
        setSavedSheets(getSavedSheets());
        toast({ title: "Sheet updated", description: updated.name });
        return;
      }
    }
    const saved = saveSheet(payload);
    setSavedSheets(getSavedSheets());
    setCurrentSheetId(saved.id);
    setSheetName(saved.name);
    toast({ title: "Sheet saved", description: saved.name });
  };

  const handleLoad = (sheet: SavedSheet) => {
    setRows(fromSheetRows(sheet.rows));
    setTargetCurrency(sheet.targetCurrency);
    setSheetName(sheet.name);
    setCurrentSheetId(sheet.id);
    setShowSaved(false);
    toast({ title: "Sheet loaded", description: sheet.name });
  };

  const handleDelete = (id: string) => {
    deleteSheet(id);
    setSavedSheets(getSavedSheets());
    if (currentSheetId === id) {
      setCurrentSheetId(null);
      setSheetName("");
    }
    toast({ title: "Sheet deleted" });
  };

  const target = CURRENCIES.find((c) => c.code === targetCurrency);
  const targetRate = rates[targetCurrency] || 0;

  const totalUsd = useMemo(() => rows.reduce((sum, r) => sum + (r.priceUsd || 0), 0), [rows]);
  const totalConverted = totalUsd * targetRate;

  const activeIds = useMemo(() => rows.map((r) => r.component.id), [rows]);

  return (
    <div className="min-h-screen p-4 md:p-7 pb-24 liquid-bg">
      <div className="max-w-[1300px] mx-auto flex flex-col md:flex-row gap-6 items-start">
        <ComponentSidebar onAdd={addComponent} activeIds={activeIds} />

        <div className="flex-1 w-full" style={{ maxWidth: "none" }}>
          <div className="glass-card overflow-hidden">
            <div className="glass-header flex-col items-center text-center py-6">
              <div className="flex items-center gap-3 z-10">
                <Calculator className="h-7 w-7 text-white" />
                <div className="header-title" style={{ fontSize: 24 }}>Price Conversion Board</div>
              </div>
              <div className="text-sm text-white/70 z-10 mt-1">Live currency rates · USD base · Auto-refresh</div>
            </div>

            <div className="p-6 space-y-6">
              <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-sm text-white/60">Target Currency</div>
                    <select
                      value={targetCurrency}
                      onChange={(e) => setTargetCurrency(e.target.value)}
                      className="mt-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/30"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {target && (
                    <div className="text-sm text-white/60">
                      <div>1 USD = {formatRate(targetRate)} {target.code}</div>
                      <div>1 {target.code} = {formatRate(targetRate > 0 ? 1 / targetRate : 0)} USD</div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/60">Last updated</div>
                  <div className="text-base font-medium text-white">{lastUpdated || "Loading..."}</div>
                  <button
                    type="button"
                    onClick={loadRates}
                    disabled={loading}
                    className="mt-2 text-sm text-cyan-300 hover:underline flex items-center gap-1 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1 w-full">
                  <label className="text-sm text-white/60 block mb-1">Sheet name</label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="e.g., Q3 Pricing — Dubai Clinic"
                    className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn-glass flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {currentSheetId ? "Update" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaved((v) => !v)}
                    className="btn-glass flex items-center gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    {showSaved ? "Close" : "Saved"}
                  </button>
                  {rows.length > 0 && (
                    <button
                      type="button"
                      onClick={clearRows}
                      className="btn-glass-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {showSaved && (
                <div className="glass-panel p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-white font-semibold">Saved Sheets</div>
                    <button onClick={() => setShowSaved(false)} className="text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
                  </div>
                  {savedSheets.length === 0 ? (
                    <div className="text-sm text-white/50">No saved sheets yet.</div>
                  ) : (
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {savedSheets.map((sheet) => (
                        <li key={sheet.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10">
                          <button
                            type="button"
                            onClick={() => handleLoad(sheet)}
                            className="text-left text-sm text-white/90 flex-1"
                          >
                            <div className="font-medium">{sheet.name}</div>
                            <div className="text-xs text-white/50">{sheet.rows.length} items · {sheet.targetCurrency} · {new Date(sheet.updatedAt).toLocaleString()}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sheet.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {rows.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/20 rounded-2xl">
                  <div className="text-white/70 text-lg mb-2">No components added</div>
                  <div className="text-sm text-white/50">Use the sidebar to add exam components and their USD prices.</div>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-white">Component</th>
                        <th className="text-right px-4 py-3 font-semibold text-white w-40">Price (USD)</th>
                        <th className="text-right px-4 py-3 font-semibold text-white w-40">Converted ({targetCurrency})</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {rows.map((row) => {
                        const converted = (row.priceUsd || 0) * targetRate;
                        return (
                          <tr key={row.id}>
                            <td className="px-4 py-3 text-white/90">{row.component.name}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-white/50">$</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={row.priceUsd || ""}
                                  onChange={(e) => updatePrice(row.id, parseFloat(e.target.value) || 0)}
                                  className="w-28 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/30 text-right"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-cyan-300">
                              {formatCurrency(converted, target?.symbol || "")}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-rose-300"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-white/10 border-t border-white/10">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-white">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-white">{formatCurrency(totalUsd, "$")}</td>
                        <td className="px-4 py-3 text-right font-bold text-cyan-300">{formatCurrency(totalConverted, target?.symbol || "")}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="text-sm text-white/50">
                Rates auto-refresh every hour. Sheets are saved to your browser and persist across sessions.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
