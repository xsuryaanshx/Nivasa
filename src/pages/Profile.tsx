import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  Star,
  Zap,
  Building2,
  Home,
  ReceiptIndianRupee,
  BarChart3,
  Globe,
  Bell,
  LogOut,
  ChevronRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Crown,
  Check,
  Coins,
  Languages,
  X,
  Moon,
  Sun,
  Monitor,
  Palette,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { SecurityModal } from "@/components/SecurityModal";
import { EditProfileModal } from "@/components/EditProfileModal";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { CURRENCIES, useCurrency, type CurrencyCode } from "@/lib/currency";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/translations";
import { createPortal } from "react-dom";

const PLAN_FEATURES = {
  free: {
    name: "Free",
    color: "from-slate-500 to-slate-600",
    badge: "FREE",
    badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    icon: Star,
    price: "₹0 / month",
    features: [
      { label: "Up to 3 Buildings", available: true },
      { label: "Up to 10 Rooms", available: true },
      { label: "Basic Payment Tracking", available: true },
      { label: "Dashboard Analytics", available: true },
      { label: "Electricity Billing", available: false },
      { label: "Advanced Reports", available: false },
      { label: "Multi-currency Support", available: false },
      { label: "Priority Support", available: false },
    ],
  },
  pro: {
    name: "Pro",
    color: "from-blue-500 to-violet-600",
    badge: "PRO",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Crown,
    price: "₹499 / month",
    features: [
      { label: "Unlimited Buildings", available: true },
      { label: "Unlimited Rooms", available: true },
      { label: "Advanced Payment Tracking", available: true },
      { label: "Full Dashboard Analytics", available: true },
      { label: "Electricity Billing", available: true },
      { label: "Advanced Reports", available: true },
      { label: "Multi-currency Support", available: true },
      { label: "Priority Support", available: true },
    ],
  },
};

const APP_FEATURES = [
  {
    icon: Building2,
    label: "Buildings",
    desc: "Manage multiple properties",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Home,
    label: "Rooms",
    desc: "Track room occupancy & tenants",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: ReceiptIndianRupee,
    label: "Payments",
    desc: "Rent & payment history",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    label: "Electricity",
    desc: "Utility billing automation",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    desc: "Revenue & occupancy insights",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    icon: Globe,
    label: "Multi-language",
    desc: "Supports EN, HI, and more",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
];

const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  },
  item: {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
  },
};

// ── Theme Sub-panel ────────────────────────────────────────────────────────
function ThemePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                    <Palette className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Theme</p>
                    <p className="text-xs text-muted-foreground">App appearance</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-2">
                {[
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "system", label: "System Default", icon: Monitor },
                ].map((t) => {
                  const active = theme === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                        active
                          ? "border-brand bg-brand/5 shadow-soft"
                          : "border-border bg-secondary/30 hover:bg-secondary/60",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">{t.label}</span>
                      </div>
                      {active && <Check className="h-4 w-4 text-brand shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── Language & Region Sub-panel ─────────────────────────────────────────────
const LANGUAGE_OPTIONS: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिंदी" },
];

function LanguageRegionPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language, setLanguage } = useLanguage();
  const { currency, setCurrency } = useCurrency();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
                    <Globe className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Language & Region</p>
                    <p className="text-xs text-muted-foreground">Language, currency & display</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Language */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Languages className="h-3.5 w-3.5" />
                    Language
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const active = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => setLanguage(lang.code)}
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                            active
                              ? "border-brand bg-brand/5 shadow-soft"
                              : "border-border bg-secondary/30 hover:bg-secondary/60",
                          )}
                        >
                          <div>
                            <p className="text-sm font-semibold text-foreground">{lang.label}</p>
                            <p className="text-xs text-muted-foreground">{lang.native}</p>
                          </div>
                          {active && <Check className="h-4 w-4 text-brand shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Coins className="h-3.5 w-3.5" />
                    Display Currency
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
                      const c = CURRENCIES[code];
                      const active = currency.code === code;
                      return (
                        <button
                          key={code}
                          onClick={() => setCurrency(code)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                            active
                              ? "border-brand bg-brand/5 shadow-soft"
                              : "border-border/50 bg-secondary/20 hover:bg-secondary/50",
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold tnum">
                            {c.symbol}
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-foreground">{c.code}</span>
                            <span className="block text-xs text-muted-foreground">{c.label}</span>
                          </span>
                          {active && <Check className="h-4 w-4 text-brand shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentPlan] = useState<"free" | "pro">("free");
  const [securityOpen, setSecurityOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const plan = PLAN_FEATURES[currentPlan];
  const PlanIcon = plan.icon;

  const MENU_ITEMS = [
    {
      icon: Bell,
      label: "Notifications",
      desc: "In-app alerts & property reminders",
      onClick: () => setNotificationsOpen(true),
      accent: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: Palette,
      label: "Theme",
      desc: "Light, dark, & system preferences",
      onClick: () => setThemeOpen(true),
      accent: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: Shield,
      label: "Security",
      desc: "Change password & account security",
      onClick: () => setSecurityOpen(true),
      accent: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      icon: Globe,
      label: "Language & Region",
      desc: "Language, currency, timezone",
      onClick: () => setLanguageOpen(true),
      accent: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
  ];

  return (
    <>
      <motion.div
        className="mx-auto w-full max-w-2xl space-y-6 pb-10"
        variants={stagger.container}
        initial="hidden"
        animate="show"
      >
        {/* ── Header / Avatar card ── */}
        <motion.div variants={stagger.item}>
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-soft">
            {/* Decorative gradient blob */}
            <div
              className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${plan.color} opacity-10 blur-3xl`}
            />

            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.color} text-2xl font-bold text-white shadow-lg`}>
                {user?.initials ?? "??"}
                {currentPlan === "pro" && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow">
                    <Crown className="h-3 w-3 text-amber-900" />
                  </span>
                )}
              </div>

              {/* Name & email */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-foreground">
                  {user?.fullName ?? "Loading…"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {user?.email ?? ""}
                </p>
                <span
                  className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${plan.badgeColor}`}
                >
                  <PlanIcon className="h-2.5 w-2.5" />
                  {plan.badge}
                </span>
              </div>

              {/* Edit icon placeholder */}
              <button
                onClick={() => setEditProfileOpen(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/60 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <User className="h-4 w-4" />
              </button>
            </div>

            {/* Quick info row */}
            <div className="mt-5 flex gap-3 text-sm text-muted-foreground">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="truncate">{user?.email ?? "—"}</span>
            </div>
          </div>
        </motion.div>

        {/* ── Current Plan card ── */}
        <motion.div variants={stagger.item}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Current Plan
          </h2>
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${plan.color} p-[1px] shadow-float`}>
            <div className="rounded-[calc(1rem-1px)] bg-card px-5 py-5">
              {/* Plan header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color} shadow`}>
                    <PlanIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Nivasa {plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.price}</p>
                  </div>
                </div>
                {currentPlan === "free" && (
                  <button
                    className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-br ${plan.color} px-3.5 py-2 text-xs font-semibold text-white shadow transition hover:opacity-90 active:scale-95`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Upgrade
                  </button>
                )}
              </div>

              {/* Feature checklist */}
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-sm">
                    {f.available ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={f.available ? "text-foreground" : "text-muted-foreground/50"}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* ── App Features ── */}
        <motion.div variants={stagger.item}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            App Features
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {APP_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <button
                  key={feat.label}
                  onClick={() => {
                    const scroller = document.querySelector('.app-cover');
                    if (scroller) scroller.scrollTop = 0;
                    
                    if (feat.label === "Buildings") navigate("/app/buildings");
                    else if (feat.label === "Rooms") navigate("/app/rooms");
                    else if (feat.label === "Payments") navigate("/app/payments");
                    else if (feat.label === "Analytics") navigate("/app");
                    else if (feat.label === "Electricity") navigate("/app"); 
                    else if (feat.label === "Multi-language") setLanguageOpen(true);
                  }}
                  className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-card p-4 shadow-soft transition hover:border-border hover:bg-secondary/50 active:scale-[0.97] text-left"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${feat.bg}`}>
                    <Icon className={`h-4 w-4 ${feat.color}`} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{feat.label}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{feat.desc}</p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Settings quick-links ── */}
        <motion.div variants={stagger.item}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Settings
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft">
            {MENU_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    const scroller = document.querySelector('.app-cover');
                    if (scroller) scroller.scrollTop = 0;
                    item.onClick();
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-secondary/50 active:scale-[0.99] ${
                    i < MENU_ITEMS.length - 1 ? "border-b border-border/40" : ""
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                    <Icon className={`h-4 w-4 ${item.accent}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Sign out ── */}
        <motion.div variants={stagger.item}>
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm font-medium text-destructive transition hover:bg-destructive/10 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </motion.div>

        {/* ── Version footer ── */}
        <motion.div variants={stagger.item}>
          <p className="text-center text-[10px] text-muted-foreground/40 tracking-widest uppercase">
            Nivasa v1.0 · Built with ♥
          </p>
        </motion.div>
      </motion.div>

      {/* ── Modals & Panels ── */}
      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
      <SecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
      <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <ThemePanel open={themeOpen} onClose={() => setThemeOpen(false)} />
      <LanguageRegionPanel open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </>
  );
}
