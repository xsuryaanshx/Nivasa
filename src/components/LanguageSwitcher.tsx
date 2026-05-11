
import { Globe, Check, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";
import type { Language } from "@/lib/translations";
import { cn } from "@/lib/utils";

type MenuPosition = { top: number; right: number };

const languages: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिंदी" },
];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
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
        aria-label={t("language")}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-secondary"
      >
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="uppercase">{language}</span>
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
            className="z-[1000] w-40 overflow-hidden rounded-xl border border-border bg-card shadow-float backdrop-blur-xl"
          >
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("select_language")}
            </div>
            <div className="h-px bg-border/50" />
            <ul className="p-1">
              {languages.map(lang => {
                const active = language === lang.code;
                return (
                  <li key={lang.code}>
                    <button
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => { setLanguage(lang.code); setOpen(false); }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active ? "bg-secondary" : "hover:bg-secondary/60",
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{lang.label}</span>
                        <span className="text-[10px] text-muted-foreground">{lang.native}</span>
                      </div>
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
