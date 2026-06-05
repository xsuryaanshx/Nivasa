import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Focus, Keyboard } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { CurrencyProvider } from "./CurrencyProvider";
import { FocusModeProvider, useFocusMode } from "./FocusModeProvider";
import { AddTenantModal } from "./AddTenantModal";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { MobileNav } from "./MobileNav";
import { ElectricityBillingModal } from "./ElectricityBillingModal";
import { MobileDrawerMenu } from "./MobileDrawerMenu";
import { LanguageProvider } from "./LanguageProvider";

function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [electricityOpen, setElectricityOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const { focus, toggle } = useFocusMode();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Global tenant trigger (palette / pages dispatch this).
  useEffect(() => {
    const h = () => setTenantOpen(true);
    window.addEventListener("nivasa:add-tenant", h);
    return () => window.removeEventListener("nivasa:add-tenant", h);
  }, []);

  useEffect(() => {
    const h = () => setElectricityOpen(true);
    window.addEventListener("nivasa:add-electricity", h);
    return () => window.removeEventListener("nivasa:add-electricity", h);
  }, []);

  // "?" opens shortcuts help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField = tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-secondary/30">
      <MobileDrawerMenu
        open={mobileDrawerOpen}
        onOpenChange={setMobileDrawerOpen}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      
      <div 
        ref={scrollRef}
        className="app-cover absolute w-full h-full left-0 top-0 z-10 flex min-w-0 flex-1 flex-col bg-background shadow-2xl overflow-y-auto border border-border/10 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex flex-1">
          <AnimatePresence initial={false}>
            {!focus && (
              <motion.div
                key="sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
                className="overflow-hidden hidden lg:block"
              >
                <AppSidebar collapsed={collapsed} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col">
        <AnimatePresence initial={false}>
          {!focus && (
            <motion.div
              key="topbar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
              style={{ overflow: "visible" }}
            >
              <Topbar
                collapsed={collapsed}
                onToggle={() => setCollapsed(v => !v)}
                onOpenPalette={() => setPaletteOpen(true)}
                onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="relative flex-1 px-5 py-8 pb-44 lg:px-10 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
              onAnimationStart={() => {
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
                window.scrollTo(0, 0);
              }}
              className="mx-auto w-full max-w-[1280px]"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onToggleFocus={toggle}
        onShowHelp={() => setHelpOpen(true)}
      />

      <AddTenantModal open={tenantOpen} onClose={() => setTenantOpen(false)} />
      <ElectricityBillingModal open={electricityOpen} onClose={() => setElectricityOpen(false)} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Floating help button — bottom right */}
      {!focus && (
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          className="fixed bottom-5 right-5 z-30 hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90 text-foreground/70 shadow-soft backdrop-blur transition-all hover:scale-105 hover:text-foreground"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      )}

      {/* Floating exit-focus chip */}
      <AnimatePresence>
        {focus && (
          <motion.button
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            onClick={toggle}
            className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 inline-flex items-center gap-2 rounded-full glass-strong border border-border px-4 py-2 text-xs font-medium shadow-float hover:bg-card"
          >
            <Focus className="h-3.5 w-3.5" /> Exit focus mode
            <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">F</kbd>
          </motion.button>
        )}
      </AnimatePresence>

        </div>
      </div>
      <MobileNav />
    </div>
  );
}

export function AppLayout() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <FocusModeProvider>
          <AppShell />
        </FocusModeProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
