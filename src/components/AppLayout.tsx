import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Sparkles, Trash2, ArrowRight, ShieldAlert, Loader2 } from "lucide-react";
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
import { PremiumUpgradeModal } from "./PremiumUpgradeModal";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/api";
import { toast } from "sonner";

function TrialBanner() {
  const { user } = useAuth();
  const { subscription, refetch } = useSubscriptionData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { data: hasMockData } = useQuery({
    queryKey: ["hasMockData", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { count } = await supabase
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_mock", true);
      return (count || 0) > 0;
    },
    enabled: !!user?.id,
  });

  if (!subscription) return null;

  const isTrial = subscription.status === "trial";
  const expiryDate = subscription.expiry_date ? new Date(subscription.expiry_date) : null;
  const isExpired = isTrial && expiryDate && expiryDate < new Date();

  const handleSeed = async () => {
    if (!user?.id) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.rpc("seed_mock_data", { target_user_id: user.id });
      if (error) throw error;
      toast.success("Demo sandbox data loaded!");
      await queryClient.invalidateQueries();
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to load demo data");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClear = async () => {
    if (!user?.id) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.rpc("clear_mock_data", { target_user_id: user.id });
      if (error) throw error;
      toast.success("Demo sandbox data cleared.");
      await queryClient.invalidateQueries();
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to clear data");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isExpired) {
    return (
      <div className="bg-destructive/15 border-b border-destructive/20 px-4 py-3 text-center sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm font-medium text-destructive">
          <span className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="h-4.5 w-4.5 animate-pulse" />
            Your 7-Day Free Trial Has Expired
          </span>
          <p className="text-destructive/90 text-xs sm:text-sm">
            Subscribe now to reactivate access and continue managing your properties.
          </p>
          <button
            onClick={() => navigate("/app/subscription")}
            className="inline-flex items-center gap-1 rounded-md bg-destructive px-3.5 py-1.5 text-xs font-bold text-destructive-foreground shadow hover:bg-destructive/90 transition-all cursor-pointer"
          >
            Choose Plan
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  if (isTrial) {
    return (
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm font-medium text-primary w-full">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span>
              You are currently on a <strong>7-Day Free Trial</strong>.
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isActionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : hasMockData ? (
              <button
                onClick={handleClear}
                className="inline-flex items-center gap-1 text-xs font-bold text-destructive hover:underline cursor-pointer border-none bg-transparent"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Demo Data
              </button>
            ) : null}
            {hasMockData && <span className="text-muted-foreground/40">|</span>}
            <button
              onClick={() => navigate("/app/subscription")}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
            >
              Choose Plan
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [electricityOpen, setElectricityOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalProps, setUpgradeModalProps] = useState({ title: "", message: "" });
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

  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setUpgradeModalProps({ title: detail.title, message: detail.message });
      } else {
        setUpgradeModalProps({ title: "Unlock Premium Features", message: "You have reached your plan limit. Upgrade to continue." });
      }
      setUpgradeModalOpen(true);
    };
    window.addEventListener("nivasa:upgrade-plan", h);
    return () => window.removeEventListener("nivasa:upgrade-plan", h);
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
        className="app-cover flex min-w-0 flex-1 flex-col overflow-x-hidden bg-background shadow-2xl pb-[env(safe-area-inset-bottom)]"
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
            <TrialBanner />

        <main className="relative flex-1 overflow-x-hidden px-4 py-5 pb-28 sm:px-5 sm:py-6 lg:px-10 lg:py-8 lg:pb-8">
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
      <PremiumUpgradeModal 
        open={upgradeModalOpen} 
        onOpenChange={setUpgradeModalOpen} 
        title={upgradeModalProps.title} 
        message={upgradeModalProps.message} 
      />

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
