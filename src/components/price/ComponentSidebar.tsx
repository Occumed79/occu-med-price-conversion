import { useMemo, useState } from "react";
import { EXAM_CATEGORIES, type ExamComponent } from "@/data/examComponents";
import { Search, Plus } from "lucide-react";

interface Props {
  onAdd: (component: ExamComponent) => void;
  activeIds: string[];
}

export const ComponentSidebar = ({ onAdd, activeIds }: Props) => {
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const activeSet = new Set(activeIds);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EXAM_CATEGORIES;
    return EXAM_CATEGORIES.map((c) => ({
      ...c,
      items: c.items.filter((i) => i.name.toLowerCase().includes(q)),
    })).filter((c) => c.items.length > 0);
  }, [query]);

  return (
    <aside className="glass-panel w-full md:w-72 overflow-hidden flex flex-col max-h-[85vh] sticky top-4">
      <div className="glass-header justify-center" style={{ padding: "14px 16px", minHeight: "auto" }}>
        <div className="header-title text-center" style={{ fontSize: 18 }}>Exam Components</div>
      </div>
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
          <input
            type="text"
            placeholder="Search components..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-2">
        {filtered.map((cat) => {
          const isOpen = query.length > 0 || openCats[cat.category];
          return (
            <div key={cat.category} className="mb-2">
              <button
                type="button"
                onClick={() => setOpenCats((s) => ({ ...s, [cat.category]: !s[cat.category] }))}
                className="w-full text-left text-[12px] font-bold uppercase tracking-wide text-white/70 py-1.5 px-2 hover:bg-white/5 rounded-lg"
              >
                {cat.category} <span className="text-white/40 font-normal">({cat.items.length})</span>
              </button>
              {isOpen && (
                <ul className="mt-1 space-y-1">
                  {cat.items.map((item) => {
                    const isActive = activeSet.has(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => !isActive && onAdd(item)}
                          disabled={isActive}
                          className={`w-full text-left text-[12.5px] leading-snug px-2 py-1.5 rounded-lg flex items-start gap-2 group ${
                            isActive ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5 mt-0.5 text-cyan-300 shrink-0 opacity-60 group-hover:opacity-100" />
                          <span className="text-white/90 break-words whitespace-normal">{item.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-white/50 py-8">No components match.</div>
        )}
      </div>
    </aside>
  );
};
