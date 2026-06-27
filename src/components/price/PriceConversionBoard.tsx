import { useEffect, useMemo, useState } from "react";
import { ComponentSidebar } from "./ComponentSidebar";
import { fetchLiveRates, formatCurrency, formatRate } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { CURRENCIES } from "@/data/currencies";
import { EXAM_CATEGORIES, type ExamComponent } from "@/data/examComponents";
import { RefreshCw, Trash2, Calculator } from "lucide-react";

interface PriceRow {
  id: string;
  component: ExamComponent;
  priceUsd: number;
}

export const PriceConversionBoard = () => {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [targetCurrency, setTargetCurrency] = useState<string>("EUR");
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

  const target = CURRENCIES.find((c) => c.code === targetCurrency);
  const targetRate = rates[targetCurrency] || 0;

  const totalUsd = useMemo(() => rows.reduce((sum, r) => sum + (r.priceUsd || 0), 0), [rows]);
  const totalConverted = totalUsd * targetRate;

  const activeIds = useMemo(() => rows.map((r) => r.component.id), [rows]);

  return (
    <div className="theme-navy flex flex-col md:flex-row gap-6 max-w-[1200px] mx-auto items-start min-h-screen py-7 px-4 pb-24">
      <ComponentSidebar onAdd={addComponent} activeIds={activeIds} />

      <div className="form-card flex-1" style={{ maxWidth: "none" }}>
        <div className="navy-header flex-col items-center text-center py-6">
          <div className="navy-orb navy-orb-1" style={{ width: 80, height: 80, top: "10%", left: "10%" }} />
          <div className="navy-orb navy-orb-2" style={{ width: 60, height: 60, bottom: "10%", right: "10%" }} />
          <div className="flex items-center gap-3 z-10">
            <Calculator className="h-7 w-7 text-white" />
            <div className="header-title" style={{ fontSize: 22 }}>Price Conversion Board</div>
          </div>
          <div className="text-sm text-white/80 z-10 mt-1">Live currency rates · USD base · Auto-refresh</div>
        </div>

        <div className="form-body space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 rounded-lg p-4 border border-border">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Target Currency</div>
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  className="mt-1 px-3 py-2 rounded border border-border bg-background focus:outline-none focus:border-[hsl(var(--navy-orb-1))]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {target && (
                <div className="text-sm text-muted-foreground">
                  <div>1 USD = {formatRate(targetRate)} {target.code}</div>
                  <div>1 {target.code} = {formatRate(targetRate > 0 ? 1 / targetRate : 0)} USD</div>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Last updated</div>
              <div className="text-base font-medium text-foreground">{lastUpdated || "Loading..."}</div>
              <button
                type="button"
                onClick={loadRates}
                disabled={loading}
                className="mt-2 text-sm text-[hsl(var(--navy-orb-1))] hover:underline flex items-center gap-1 disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg">
              <div className="text-muted-foreground text-lg mb-2">No components added</div>
              <div className="text-sm text-muted-foreground">Use the sidebar to add exam components and their USD prices.</div>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Component</th>
                    <th className="text-right px-4 py-3 font-semibold text-foreground w-40">Price (USD)</th>
                    <th className="text-right px-4 py-3 font-semibold text-foreground w-40">Converted ({targetCurrency})</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const converted = (row.priceUsd || 0) * targetRate;
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-foreground">{row.component.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-muted-foreground">$</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={row.priceUsd || ""}
                              onChange={(e) => updatePrice(row.id, parseFloat(e.target.value) || 0)}
                              className="w-28 px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:border-[hsl(var(--navy-orb-1))] text-right"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[hsl(var(--navy-orb-1))]">
                          {formatCurrency(converted, target?.symbol || "")}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 border-t border-border">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-foreground">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(totalUsd, "$")}</td>
                    <td className="px-4 py-3 text-right font-bold text-[hsl(var(--navy-deep))]">{formatCurrency(totalConverted, target?.symbol || "")}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Rates auto-refresh every hour. Prices are entered in USD and converted using the selected live rate.
          </div>
        </div>
      </div>
    </div>
  );
};
