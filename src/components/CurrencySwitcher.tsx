import { Check, ChevronDown, Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CURRENCIES, useCurrency, type CurrencyCode } from "@/lib/currency";
import { useLanguage } from "./LanguageProvider";
import { cn } from "@/lib/utils";

type MenuPosition = { top: number; right: number };

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, right: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          updatePosition();
          setOpen(v => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change currency"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary"
      >
        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="tnum">{currency.code}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
            role="menu"
            style={{ position: "fixed", top: position.top, right: position.right }}
            className="z-[1000] w-56 overflow-hidden rounded-xl border border-border glass-strong shadow-float"
          >
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("display_currency")}
            </div>
            <div className="hairline" />
            <ul className="p-1">
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map(code => {
                const c = CURRENCIES[code];
                const active = currency.code === code;
                return (
                  <li key={code}>
                    <button
                      role="menuitemradio"
                      aria-checked={active}
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
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
