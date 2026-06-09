import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { CurrencyProvider } from "./CurrencyProvider";
import { AddTenantModal } from "./AddTenantModal";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { MobileNav } from "./MobileNav";
import { ElectricityBillingModal } from "./ElectricityBillingModal";
import { MobileDrawerMenu } from "./MobileDrawerMenu";
import { LanguageProvider } from "./LanguageProvider";
import { useLocation, Outlet } from "react-router-dom";

function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [electricityOpen, setElectricityOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentPath = location.pathname;
    return () => {
      sessionStorage.setItem('lastPath', currentPath);
    };
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
    <div className="relative min-h-[100dvh] w-full bg-secondary/30 flex flex-col">
      <div className="flex-1 flex w-full relative">
        <MobileDrawerMenu
        open={mobileDrawerOpen}
        onOpenChange={setMobileDrawerOpen}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      
      <div 
        ref={scrollRef}
        className="app-cover flex min-w-0 flex-1 flex-col bg-background shadow-2xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex flex-1">
          <div className="hidden lg:block">
            <AppSidebar collapsed={collapsed} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              collapsed={collapsed}
              onToggle={() => setCollapsed(v => !v)}
              onOpenPalette={() => setPaletteOpen(true)}
              onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
            />

        <main className="relative flex-1 px-5 py-8 pb-44 lg:px-10 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
              onAnimationStart={() => {
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
        onShowHelp={() => setHelpOpen(true)}
      />

      <AddTenantModal open={tenantOpen} onClose={() => setTenantOpen(false)} />
      <ElectricityBillingModal open={electricityOpen} onClose={() => setElectricityOpen(false)} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Floating help button — bottom right */}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        className="fixed bottom-5 right-5 z-30 hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90 text-foreground/70 shadow-soft backdrop-blur transition-all hover:scale-105 hover:text-foreground"
      >
        <Keyboard className="h-4 w-4" />
      </button>

        </div>
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
        <AppShell />
      </CurrencyProvider>
    </LanguageProvider>
  );
}
