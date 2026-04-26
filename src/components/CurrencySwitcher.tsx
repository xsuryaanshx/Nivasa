import { Check, ChevronDown, Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CURRENCIES, useCurrency, type CurrencyCode } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Change currency"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary"
      >
        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="tnum">{currency.code}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border glass-strong shadow-float"
          >
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Display currency
            </div>
            <div className="hairline" />
            <ul className="p-1">
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map(code => {
                const c = CURRENCIES[code];
                const active = currency.code === code;
                return (
                  <li key={code}>
                    <button
                      onClick={() => { setCurrency(code); setOpen(false); }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active ? "bg-secondary" : "hover:bg-secondary/60",
                      )}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary/70 text-xs font-semibold tnum">
                        {c.symbol}
                      </span>
                      <span className="flex-1 leading-tight">
                        <span className="block text-sm font-medium">{c.code}</span>
                        <span className="block text-[11px] text-muted-foreground">{c.label}</span>
                      </span>
                      {active && <Check className="h-3.5 w-3.5 text-foreground" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}