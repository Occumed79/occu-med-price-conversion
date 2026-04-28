import { useEffect, useRef, useState } from "react";
import { Building2, FileText, ShieldCheck } from "lucide-react";

export type FormVariant =
  | "network"
  | "clinic"
  | "clinic-signed"
  | "provider-agreement"
  | "provider-agreement-terms"
  | "occu-contact-sheet"
  | "provider-contact-sheet";

interface Props {
  variant: FormVariant;
  onSelect: (v: FormVariant) => void;
}

export const FloatingFormSelector = ({ variant, onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Bubble visual style follows current variant: aurora when on Network, navy when on a Clinic form.
  const bubbleClass = variant === "network" ? "aurora" : "navy";
  const bubbleLabel = "Forms";

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const options: { value: FormVariant; label: string; desc: string; icon: typeof FileText }[] = [
    { value: "network", label: "Network Management", desc: "Standard internal pricing memo", icon: FileText },
    { value: "clinic", label: "Provider Pricing Sheet", desc: "Provider-facing memo with exam pricing", icon: Building2 },
    { value: "clinic-signed", label: "Provider Pricing Sheet (Signed)", desc: "With dual signatures, audit trail & certificate", icon: ShieldCheck },
    { value: "provider-agreement", label: "Provider Service Agreement", desc: "Agreement template variant", icon: FileText },
    { value: "provider-agreement-terms", label: "Provider Service Agreement + Terms", desc: "Agreement with Terms of Service block", icon: FileText },
    { value: "occu-contact-sheet", label: "Occu-Med Contact Sheet", desc: "Standalone contact information sheet", icon: FileText },
    { value: "provider-contact-sheet", label: "Provider Contact Sheet", desc: "Standalone provider contact information", icon: FileText },
  ];

  return (
    <div ref={ref} className="print-hide">
      {open && (
        <div
          className="fixed bottom-[150px] right-6 z-[801] bg-card rounded-xl shadow-[var(--shadow-elevated)] border border-border w-[280px] overflow-hidden animate-in fade-in slide-in-from-bottom-2"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Switch form</div>
          </div>
          <ul className="py-1">
            {options.map((opt) => {
              const Icon = opt.icon;
              const active = opt.value === variant;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors ${active ? "bg-muted/60" : ""}`}
                  >
                    <Icon className="h-5 w-5 mt-0.5 text-[hsl(var(--aurora-teal))] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {opt.label}
                        {active && <span className="text-[10px] uppercase tracking-wide text-[hsl(var(--aurora-green))] font-bold">Active</span>}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">{opt.desc}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`float-bubble ${bubbleClass}`}
        aria-label={`Switch form (currently ${variant})`}
      >
        <span>{bubbleLabel}</span>
      </button>
    </div>
  );
};
