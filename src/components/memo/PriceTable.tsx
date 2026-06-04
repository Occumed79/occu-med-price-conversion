import { Plus, Trash2 } from "lucide-react";
import type { PriceRow } from "@/types/memo";

interface Props {
  rows: PriceRow[];
  onChange: (rows: PriceRow[]) => void;
  /** When true, hide the add (+) and remove buttons (e.g., for print/export). */
  readOnly?: boolean;
}

let _id = 0;
const newId = () => `row-${Date.now()}-${++_id}`;

export const PriceTable = ({ rows, onChange, readOnly }: Props) => {
  const update = (id: string, patch: Partial<PriceRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const add = () =>
    onChange([...rows, { id: newId(), component: "", price: "" }]);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="grid grid-cols-[1fr_140px_44px] bg-[hsl(var(--navy-deep))] text-white text-[12.5px] font-semibold uppercase tracking-wide">
        <div className="px-3 py-2.5">Exam Component</div>
        <div className="px-3 py-2.5 border-l border-white/10">Price</div>
        <div className="px-2 py-2.5 border-l border-white/10" />
      </div>
      {rows.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-6">
          No exam components yet. {readOnly ? "" : "Click components in the sidebar or the + below to add a row."}
        </div>
      )}
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={`grid grid-cols-[1fr_140px_44px] border-t border-border ${i % 2 === 0 ? "bg-background" : "bg-card"}`}
        >
          <input
            type="text"
            value={row.component}
            onChange={(e) => update(row.id, { component: e.target.value })}
            placeholder="Component name"
            className="px-3 py-2.5 text-sm bg-transparent outline-none"
            readOnly={readOnly}
          />
          <input
            type="text"
            value={row.price}
            onChange={(e) => update(row.id, { price: e.target.value })}
            placeholder="$0.00"
            className="px-3 py-2.5 text-sm bg-transparent outline-none border-l border-border"
            readOnly={readOnly}
          />
          {!readOnly && (
            <button
              type="button"
              onClick={() => remove(row.id)}
              className="border-l border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 flex items-center justify-center"
              aria-label="Remove row"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {readOnly && <div className="border-l border-border" />}
        </div>
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={add}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-[hsl(var(--navy-orb-1))] bg-[hsl(var(--navy-orb-1)/0.07)] hover:bg-[hsl(var(--navy-orb-1)/0.14)] border-t border-border transition-colors"
        >
          <Plus className="h-4 w-4" /> Add component
        </button>
      )}
    </div>
  );
};
