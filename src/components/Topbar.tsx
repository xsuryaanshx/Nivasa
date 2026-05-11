import { Bell, Focus, LogOut, PanelLeftClose, PanelLeftOpen, Search, MoreVertical } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useFocusMode } from "./FocusModeProvider";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "./LanguageProvider";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  onOpenPalette: () => void;
}

export function Topbar({ collapsed, onToggle, onOpenPalette }: Props) {
  const { focus, toggle } = useFocusMode();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl pt-safe">
      <div className="flex h-20 lg:h-16 items-center gap-3 px-5 lg:px-8">
        <button
          onClick={onToggle}
          aria-label={t("toggle_sidebar")}
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        <button
          onClick={onOpenPalette}
          className="group flex h-10 flex-1 max-w-md items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">{t("search")}</span>
          <kbd className="hidden lg:inline-block rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
        </button>

        {/* Desktop Right Section */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle focus mode"
            title={`${t("focus_mode")} (F)`}
            className={cn(
              "h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors hidden sm:inline-flex",
              focus
                ? "border-foreground/20 bg-foreground text-background hover:opacity-90"
                : "border-border bg-card text-foreground/80 hover:bg-secondary",
            )}
          >
            <Focus className="h-3.5 w-3.5" />
            <span>{t("focus")}</span>
            <kbd className={cn(
              "ml-1 rounded px-1 py-0.5 font-mono text-[10px]",
              focus ? "bg-background/20 text-background/80" : "bg-secondary text-muted-foreground",
            )}>F</kbd>
          </button>

          <CurrencySwitcher />
          <LanguageSwitcher />

          <button
            aria-label={t("notifications")}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-status-info" />
          </button>

          <ThemeToggle />

          <button 
            onClick={signOut}
            title={t("logout")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>

          <div className="ml-1 flex h-9 items-center gap-2.5 rounded-full border border-border bg-card pl-1 pr-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
              {user?.initials || "U"}
            </div>
            <span className="text-sm font-medium">{user?.firstName || t("user")}</span>
          </div>
        </div>

        {/* Mobile Right Section */}
        <div className="ml-auto flex md:hidden items-center gap-2">
          <LanguageSwitcher />
        </div>

      </div>
    </header>
  );
}
