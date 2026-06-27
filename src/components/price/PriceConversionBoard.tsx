import { useEffect, useMemo, useState } from "react";
import { ComponentSidebar } from "./ComponentSidebar";
import { fetchLiveRates, formatCurrency, formatRate } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { CURRENCIES } from "@/data/currencies";
import { EXAM_CATEGORIES, type ExamComponent } from "@/data/examComponents";
import { listSheets, createSheet, updateSheet, deleteSheet, type SavedSheet, type SheetRow, type Adjustment } from "@/lib/sheetsApi";
import { RefreshCw, Trash2, Calculator, Save, FolderOpen, X, Plus, FileSpreadsheet, FileText, Percent } from "lucide-react";
import * as XLSX from "xlsx";

interface PriceRow {
  id: string;
  component: ExamComponent;
  priceSource: number;
}

const componentById = (id: string): ExamComponent | undefined => {
  for (const cat of EXAM_CATEGORIES) {
    const found = cat.items.find((i) => i.id === id);
    if (found) return found;
  }
  return undefined;
};

const generateId = () => `row-${Date.now()}-${Math.random()}`;

export const PriceConversionBoard = () => {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [sourceCurrency, setSourceCurrency] = useState<string>("EUR");
  const [sheetName, setSheetName] = useState<string>("");
  const [savedSheets, setSavedSheets] = useState<SavedSheet[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();

  const loadRates = async () => {
    setRatesLoading(true);
    try {
      const data = await fetchLiveRates();
      setRates(data.rates);
      setLastUpdated(new Date().toLocaleString());
    } catch (e) {
      toast({ title: "Rate update failed", description: String(e), variant: "destructive" });
    } finally {
      setRatesLoading(false);
    }
  };

  const loadSavedSheets = async () => {
    setSheetsLoading(true);
    try {
      const sheets = await listSheets();
      setSavedSheets(sheets);
    } catch (e) {
      toast({ title: "Failed to load sheets", description: String(e), variant: "destructive" });
    } finally {
      setSheetsLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
    loadSavedSheets();
    const interval = setInterval(loadRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const addComponent = (component: ExamComponent) => {
    if (rows.some((r) => r.component.id === component.id)) return;
    setRows((prev) => [...prev, { id: generateId(), component, priceSource: 0 }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updatePrice = (id: string, priceSource: number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, priceSource } : r)));
  };

  const addAdjustment = () => {
    setAdjustments((prev) => [...prev, { id: generateId(), name: "Tax / Fee", percent: 0 }]);
  };

  const updateAdjustment = (id: string, patch: Partial<Adjustment>) => {
    setAdjustments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAdjustment = (id: string) => {
    setAdjustments((prev) => prev.filter((a) => a.id !== id));
  };

  const clearRows = () => {
    setRows([]);
    setAdjustments([]);
    setCurrentSheetId(null);
    setSheetName("");
  };

  const toSheetRows = (): SheetRow[] =>
    rows.map((r) => ({ id: r.id, componentId: r.component.id, componentName: r.component.name, priceSource: r.priceSource }));

  const fromSheetRows = (sheetRows: SheetRow[]): PriceRow[] =>
    sheetRows.map((sr) => {
      const component = componentById(sr.componentId) || { id: sr.componentId, name: sr.componentName };
      return { id: sr.id || generateId(), component, priceSource: sr.priceSource || 0 };
    });

  const handleSave = async () => {
    if (rows.length === 0) {
      toast({ title: "Nothing to save", description: "Add at least one component first.", variant: "destructive" });
      return;
    }
    const name = sheetName.trim() || `Sheet ${new Date().toLocaleString()}`;
    const payload = {
      name,
      source_currency: sourceCurrency,
      rows: toSheetRows(),
      adjustments,
    };
    try {
      if (currentSheetId) {
        const updated = await updateSheet(currentSheetId, payload);
        setSavedSheets(await listSheets());
        toast({ title: "Sheet updated", description: updated.name });
      } else {
        const saved = await createSheet(payload);
        setSavedSheets(await listSheets());
        setCurrentSheetId(saved.id);
        setSheetName(saved.name);
        toast({ title: "Sheet saved", description: saved.name });
      }
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" });
    }
  };

  const handleLoad = async (sheet: SavedSheet) => {
    setRows(fromSheetRows(sheet.rows));
    setSourceCurrency(sheet.source_currency);
    setAdjustments(sheet.adjustments || []);
    setSheetName(sheet.name);
    setCurrentSheetId(sheet.id);
    setShowSaved(false);
    toast({ title: "Sheet loaded", description: sheet.name });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSheet(id);
      setSavedSheets(await listSheets());
      if (currentSheetId === id) {
        setCurrentSheetId(null);
        setSheetName("");
      }
      toast({ title: "Sheet deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" });
    }
  };

  const source = CURRENCIES.find((c) => c.code === sourceCurrency);
  const sourceRate = rates[sourceCurrency] || 0;
  const usdPerSource = sourceRate > 0 ? 1 / sourceRate : 0;

  const convertToUsd = (amountSource: number) => amountSource * usdPerSource;

  const totalSource = useMemo(() => rows.reduce((sum, r) => sum + (r.priceSource || 0), 0), [rows]);
  const subtotalUsd = totalSource * usdPerSource;

  const adjustmentLines = useMemo<{ id: string; name: string; percent: number; amountUsd: number }[]>(() => {
    return adjustments.map((a) => ({
      id: a.id,
      name: a.name,
      percent: a.percent,
      amountUsd: subtotalUsd * (a.percent / 100),
    }));
  }, [adjustments, subtotalUsd]);

  const totalAdjustmentsUsd = useMemo(() => adjustmentLines.reduce((sum, a) => sum + a.amountUsd, 0), [adjustmentLines]);
  const finalUsd = subtotalUsd + totalAdjustmentsUsd;
  const finalSource = usdPerSource > 0 ? finalUsd / usdPerSource : 0;

  const activeIds = useMemo(() => rows.map((r) => r.component.id), [rows]);

  const exportExcel = () => {
    const sheetRows = rows.map((r) => ({
      Component: r.component.name,
      [`Price (${sourceCurrency})`]: r.priceSource,
      "Converted (USD)": convertToUsd(r.priceSource),
    }));

    const summaryRows = [
      {},
      { Component: "Subtotal", [`Price (${sourceCurrency})`]: totalSource, "Converted (USD)": subtotalUsd },
      ...adjustmentLines.map((a) => ({
        Component: `${a.name} (${a.percent}%)`,
        [`Price (${sourceCurrency})`]: a.amountUsd / usdPerSource,
        "Converted (USD)": a.amountUsd,
      })),
      { Component: "Total", [`Price (${sourceCurrency})`]: finalSource, "Converted (USD)": finalUsd },
    ];

    const ws = XLSX.utils.json_to_sheet([...sheetRows, ...summaryRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pricing");
    XLSX.writeFile(wb, `${sheetName || "pricing"}.xlsx`);
  };

  const printReport = () => {
    setShowReport(true);
    setTimeout(() => window.print(), 300);
  };

  return (
    <>
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
                <div className="text-sm text-white/70 z-10 mt-1">Convert any currency to USD · Shared sheets</div>
              </div>

              <div className="p-6 space-y-6">
                <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm text-white/60">Source Currency</div>
                      <select
                        value={sourceCurrency}
                        onChange={(e) => setSourceCurrency(e.target.value)}
                        className="mt-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/30"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {source && (
                      <div className="text-sm text-white/60">
                        <div>1 {source.code} = {formatRate(usdPerSource)} USD</div>
                        <div>1 USD = {formatRate(sourceRate)} {source.code}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/60">Last updated</div>
                    <div className="text-base font-medium text-white">{lastUpdated || "Loading..."}</div>
                    <button
                      type="button"
                      onClick={loadRates}
                      disabled={ratesLoading}
                      className="mt-2 text-sm text-cyan-300 hover:underline flex items-center gap-1 disabled:opacity-60"
                    >
                      <RefreshCw className={`h-3 w-3 ${ratesLoading ? "animate-spin" : ""}`} />
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={handleSave} className="btn-glass flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {currentSheetId ? "Update" : "Save"}
                    </button>
                    <button type="button" onClick={() => { setShowSaved((v) => !v); if (!showSaved) loadSavedSheets(); }} className="btn-glass flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      {showSaved ? "Close" : "Saved"}
                    </button>
                    {rows.length > 0 && (
                      <button type="button" onClick={exportExcel} className="btn-glass flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </button>
                    )}
                    {rows.length > 0 && (
                      <button type="button" onClick={printReport} className="btn-glass flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Report
                      </button>
                    )}
                    {rows.length > 0 && (
                      <button type="button" onClick={clearRows} className="btn-glass-danger">
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
                    {sheetsLoading ? (
                      <div className="text-sm text-white/50">Loading sheets...</div>
                    ) : savedSheets.length === 0 ? (
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
                              <div className="text-xs text-white/50">{sheet.rows.length} items · {sheet.source_currency} → USD · {new Date(sheet.updated_at).toLocaleString()}</div>
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

                <div className="glass-panel p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-white font-semibold flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Adjustments
                    </div>
                    <button type="button" onClick={addAdjustment} className="btn-glass flex items-center gap-2 text-sm">
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                  {adjustments.length === 0 ? (
                    <div className="text-sm text-white/50">No adjustments. Add tax, fees, or markups.</div>
                  ) : (
                    <div className="space-y-2">
                      {adjustmentLines.map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={a.name}
                            onChange={(e) => updateAdjustment(a.id, { name: e.target.value })}
                            placeholder="Tax / Fee / Markup"
                            className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={a.percent}
                              onChange={(e) => updateAdjustment(a.id, { percent: parseFloat(e.target.value) || 0 })}
                              className="w-20 px-2 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/30 text-right"
                            />
                            <span className="text-white/60">%</span>
                          </div>
                          <div className="text-sm text-cyan-300 w-24 text-right">
                            {formatCurrency(a.amountUsd, "$")}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdjustment(a.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {rows.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/20 rounded-2xl">
                    <div className="text-white/70 text-lg mb-2">No components added</div>
                    <div className="text-sm text-white/50">Use the sidebar to add exam components and their source-currency prices.</div>
                  </div>
                ) : (
                  <div className="glass-panel rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-white">Component</th>
                          <th className="text-right px-4 py-3 font-semibold text-white w-40">Price ({sourceCurrency})</th>
                          <th className="text-right px-4 py-3 font-semibold text-white w-40">Converted (USD)</th>
                          <th className="px-4 py-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {rows.map((row) => {
                          const converted = convertToUsd(row.priceSource || 0);
                          return (
                            <tr key={row.id}>
                              <td className="px-4 py-3 text-white/90">{row.component.name}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-white/50">{source?.symbol || sourceCurrency}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={row.priceSource || ""}
                                    onChange={(e) => updatePrice(row.id, parseFloat(e.target.value) || 0)}
                                    className="w-28 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/30 text-right"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-cyan-300">
                                {formatCurrency(converted, "$")}
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
                          <td className="px-4 py-3 font-semibold text-white">Subtotal</td>
                          <td className="px-4 py-3 text-right font-bold text-white">{formatCurrency(totalSource, source?.symbol || sourceCurrency)}</td>
                          <td className="px-4 py-3 text-right font-bold text-white">{formatCurrency(subtotalUsd, "$")}</td>
                          <td></td>
                        </tr>
                        {adjustmentLines.map((a) => (
                          <tr key={a.id}>
                            <td className="px-4 py-3 text-white/80">{a.name} ({a.percent}%)</td>
                            <td className="px-4 py-3 text-right text-white/80">{formatCurrency(a.amountUsd / usdPerSource, source?.symbol || sourceCurrency)}</td>
                            <td className="px-4 py-3 text-right font-medium text-cyan-300">{formatCurrency(a.amountUsd, "$")}</td>
                            <td></td>
                          </tr>
                        ))}
                        <tr>
                          <td className="px-4 py-3 font-semibold text-white">Total</td>
                          <td className="px-4 py-3 text-right font-bold text-white">{formatCurrency(finalSource, source?.symbol || sourceCurrency)}</td>
                          <td className="px-4 py-3 text-right font-bold text-cyan-300">{formatCurrency(finalUsd, "$")}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                <div className="text-sm text-white/50">
                  Rates auto-refresh every hour. Sheets are stored in Neon and shared across users.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReport && (
        <div className="report-overlay fixed inset-0 z-50 bg-black/80 p-4 overflow-y-auto">
          <div className="report-sheet mx-auto">
            <div className="flex items-center justify-between mb-6 print:hidden">
              <div className="text-white font-semibold">Report Preview</div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="btn-glass">Print</button>
                <button onClick={() => setShowReport(false)} className="btn-glass-danger">Close</button>
              </div>
            </div>

            <div className="report-header">
              <img src="/logo.svg" alt="Occu-Med" className="report-logo" />
              <div className="report-meta">
                <div className="report-title">{sheetName || "Pricing Report"}</div>
                <div className="report-subtitle">Currency Conversion Sheet</div>
                <div className="report-date">Prepared: {lastUpdated}</div>
              </div>
            </div>

            <div className="report-box">
              <div className="report-row">
                <span>Source currency</span>
                <span className="font-semibold">{sourceCurrency} — {source?.name}</span>
              </div>
              <div className="report-row">
                <span>Exchange rate</span>
                <span className="font-semibold">1 {sourceCurrency} = {formatRate(usdPerSource)} USD</span>
              </div>
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th className="text-right">Price ({sourceCurrency})</th>
                  <th className="text-right">Converted (USD)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.component.name}</td>
                    <td className="text-right">{formatCurrency(r.priceSource, source?.symbol || sourceCurrency)}</td>
                    <td className="text-right font-semibold">{formatCurrency(convertToUsd(r.priceSource), "$")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="report-summary">
              <div className="report-summary-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotalUsd, "$")}</span>
              </div>
              {adjustmentLines.map((a) => (
                <div key={a.id} className="report-summary-row">
                  <span>{a.name} ({a.percent}%)</span>
                  <span>{formatCurrency(a.amountUsd, "$")}</span>
                </div>
              ))}
              <div className="report-summary-row total">
                <span>Total</span>
                <span>{formatCurrency(finalUsd, "$")}</span>
              </div>
            </div>

            <div className="report-footer">
              Rates are live and auto-refresh every hour. Report generated by Occu-Med Price Conversion Board.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
