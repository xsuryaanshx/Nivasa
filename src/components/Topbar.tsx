import { Bell, Focus, LogOut, PanelLeftClose, PanelLeftOpen, Search, MoreVertical } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { useFocusMode } from "./FocusModeProvider";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  onOpenPalette: () => void;
}

export function Topbar({ collapsed, onToggle, onOpenPalette }: Props) {
  const { focus, toggle } = useFocusMode();
  const { user, signOut } = useAuth();
  
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
          aria-label="Toggle sidebar"
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        <button
          onClick={onOpenPalette}
          className="group flex h-10 flex-1 max-w-md items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search anything…</span>
          <kbd className="hidden lg:inline-block rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
        </button>

        {/* Desktop Right Section */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle focus mode"
            title="Focus mode (F)"
            className={cn(
              "h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors hidden sm:inline-flex",
              focus
                ? "border-foreground/20 bg-foreground text-background hover:opacity-90"
                : "border-border bg-card text-foreground/80 hover:bg-secondary",
            )}
          >
            <Focus className="h-3.5 w-3.5" />
            <span>Focus</span>
            <kbd className={cn(
              "ml-1 rounded px-1 py-0.5 font-mono text-[10px]",
              focus ? "bg-background/20 text-background/80" : "bg-secondary text-muted-foreground",
            )}>F</kbd>
          </button>

          <CurrencySwitcher />

          <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-status-info" />
          </button>

          <ThemeToggle />

          <button 
            onClick={signOut}
            title="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>

          <div className="ml-1 flex h-9 items-center gap-2.5 rounded-full border border-border bg-card pl-1 pr-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
              {user?.initials || "U"}
            </div>
            <span className="text-sm font-medium">{user?.firstName || "User"}</span>
          </div>
        </div>

        {/* Mobile Right Section (Hamburger Menu) */}
        <div className="ml-auto flex md:hidden items-center relative" ref={mobileMenuRef}>
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border glass-strong p-2 shadow-float z-50 flex flex-col gap-1"
              >
                <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                    {user?.initials || "U"}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{user?.firstName || "User"}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Account</span>
                  </div>
                </div>
                
                <div className="hairline my-1" />

                <div className="flex items-center justify-between px-2 py-2">
                  <span className="text-sm font-medium text-foreground/80">Theme</span>
                  <ThemeToggle />
                </div>
                
                <div className="flex items-center justify-between px-2 py-2 relative z-[60]">
                  <span className="text-sm font-medium text-foreground/80">Currency</span>
                  <CurrencySwitcher />
                </div>

                <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary">
                  <Bell className="h-4 w-4" />
                  Notifications
                </button>

                <div className="hairline my-1" />

                <button 
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}