import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  ShieldCheck,
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
  Languages,
  X,
  Moon,
  Sun,
  Monitor,
  Palette,
  Banknote,
  Users,
  Calendar,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { nivasaApi } from "@/lib/api";
import { useTheme } from "next-themes";
import { SecurityModal } from "@/components/SecurityModal";
import { ProfitPanel } from "@/components/ProfitPanel";
import { EditProfileModal } from "@/components/EditProfileModal";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { StaffManagementPanel } from "@/components/StaffManagementPanel";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/translations";
import { createPortal } from "react-dom";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";

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
    icon: Banknote,
    label: "Facilities",
    desc: "Manage add-on costs",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Users,
    label: "Staff",
    desc: "Manage staff & salary",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Calendar,
    label: "Billing Cycle",
    desc: "Rent collection date",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: ShieldCheck,
    label: "Tenant Score",
    desc: "Check tenant history via Aadhar",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    icon: Wrench,
    label: "Expense Register",
    desc: "Log maintenance & facility costs",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: TrendingUp,
    label: "Profit",
    desc: "Net profit summary",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Bell,
    label: "Notifications",
    desc: "In-app alerts & property reminders",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
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
  const { t } = useLanguage();

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
                    <p className="text-sm font-semibold text-foreground">{t("theme")}</p>
                    <p className="text-xs text-muted-foreground">{t("theme_subtitle")}</p>
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
                  { id: "light", label: t("light"), icon: Sun },
                  { id: "dark", label: t("dark"), icon: Moon },
                  { id: "system", label: t("system_default"), icon: Monitor },
                ].map((opt) => {
                  const active = theme === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setTheme(opt.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                        active
                          ? "border-brand bg-brand/5 shadow-soft"
                          : "border-border bg-secondary/30 hover:bg-secondary/60",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">{opt.label}</span>
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
  const { language, setLanguage, t } = useLanguage();

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
                    <p className="text-sm font-semibold text-foreground">{t("language")}</p>
                    <p className="text-xs text-muted-foreground">{t("language_subtitle")}</p>
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
                    {t("language")}
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



                <button
                  onClick={onClose}
                  className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90"
                >
                  {t("save_and_close")}
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

// ── Rent Collection Settings Modal ────────────────────────────────────────────────────────
function RentSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [dateStr, setDateStr] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      nivasaApi.getUserSettings().then(res => {
        if (res && res.rent_collection_date) {
          setDateStr(res.rent_collection_date.toString());
        } else {
          setDateStr("");
        }
      });
    }
  }, [open]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const val = parseInt(dateStr, 10);
      const rent_collection_date = isNaN(val) ? null : val;
      if (rent_collection_date !== null && (rent_collection_date < 1 || rent_collection_date > 31)) {
        return; // invalid date
      }
      await nivasaApi.updateUserSettings({ rent_collection_date });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
                <h2 className="text-sm font-semibold tracking-tight">Billing Cycle</h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Billing Day of Month (Optional)</label>
                  <p className="text-xs text-muted-foreground mb-2">Specify a fixed day of the month for rent collection. This will be automatically added to invoices.</p>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g. 5"
                    value={dateStr}
                    onChange={e => setDateStr(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90"
                >
                  {saving ? "Saving..." : t("save_and_close")}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

const FEATURE_KEY_MAP: Record<string, string> = {
  "Up to 3 Buildings": "up_to_3_buildings",
  "Up to 10 Rooms": "up_to_10_rooms",
  "Basic Payment Tracking": "basic_payment_tracking",
  "Dashboard Analytics": "dashboard_analytics_feat",
  "Electricity Billing": "electricity_billing_feat",
  "Advanced Reports": "advanced_reports",
  "Multi-currency Support": "multi_currency_support",
  "Priority Support": "priority_support",
  "Unlimited Buildings": "unlimited_buildings",
  "Unlimited Rooms": "unlimited_rooms",
  "Advanced Payment Tracking": "advanced_payment_tracking",
  "Full Dashboard Analytics": "full_dashboard_analytics",
};

const APP_FEATURE_KEY_MAP: Record<string, { label: string; desc: string }> = {
  "Buildings": { label: "app_feat_buildings", desc: "app_feat_buildings_desc" },
  "Rooms": { label: "app_feat_rooms", desc: "app_feat_rooms_desc" },
  "Payments": { label: "app_feat_payments", desc: "app_feat_payments_desc" },
  "Electricity": { label: "app_feat_electricity", desc: "app_feat_electricity_desc" },
  "Analytics": { label: "app_feat_analytics", desc: "app_feat_analytics_desc" },
  "Facilities": { label: "app_feat_expenses", desc: "app_feat_expenses_desc" },
  "Staff": { label: "app_feat_staff", desc: "app_feat_staff_desc" },
  "Billing Cycle": { label: "app_feat_billing_cycle", desc: "app_feat_billing_cycle_desc" },
};

const MENU_KEY_MAP: Record<string, { label: string; desc: string }> = {
  "Notifications": { label: "notifications", desc: "notifications_desc" },
  "Theme": { label: "theme", desc: "theme_desc" },
  "Security": { label: "security", desc: "security_desc" },
  "Language": { label: "language", desc: "language_desc" },
  "Rent Date": { label: "rent_date" as any, desc: "rent_date_desc" as any },
};

// ── Main Profile Page ─────────────────────────────────────────────────────────
export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { subscription, limits } = useSubscriptionData();
  const [securityOpen, setSecurityOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [rentDateOpen, setRentDateOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [profitOpen, setProfitOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { t } = useLanguage();

  const activePlanName = subscription?.plans?.plan_name || "silver";
  const displayPlanName = subscription?.plans?.display_name || "Silver";
  const displayPrice = subscription?.plans?.monthly_price 
    ? `₹${subscription.plans.monthly_price} / month`
    : activePlanName === "platinum" ? "₹1199 / month" : activePlanName === "gold" ? "₹899 / month" : "₹499 / month";

  const getPlanColor = (pName: string) => {
    if (pName === "platinum") return "from-violet-600 to-indigo-600";
    if (pName === "gold") return "from-amber-500 to-yellow-600";
    return "from-slate-500 to-slate-600";
  };

  const getPlanBadgeColor = (pName: string) => {
    if (pName === "platinum") return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    if (pName === "gold") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  const PlanIcon = activePlanName === "platinum" ? Crown : activePlanName === "gold" ? Zap : Star;

  // Resolve dynamic features list
  const featuresList = Object.entries(limits.features).map(([key, feat]) => {
    let label = key.replace(/_/g, " ");
    label = label.charAt(0).toUpperCase() + label.slice(1);
    if (key === "room_limit") {
      label = `Room Limit: ${feat.value}`;
    } else if (key === "tenant_limit") {
      label = `Tenant Limit: ${feat.value}`;
    }
    return {
      label,
      enabled: feat.enabled && feat.value !== "false",
    };
  });

  const MENU_ITEMS = [
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
      label: "Language",
      desc: "Language preference",
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
              className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${getPlanColor(activePlanName)} opacity-10 blur-3xl`}
            />

            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getPlanColor(activePlanName)} text-2xl font-bold text-white shadow-lg`}>
                {user?.initials ?? "??"}
                {(activePlanName === "gold" || activePlanName === "platinum") && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow">
                    <Crown className="h-3 w-3 text-amber-900" />
                  </span>
                )}
              </div>

              {/* Name & email */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-foreground">
                  {user?.fullName ?? t("loading")}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {user?.email ?? ""}
                </p>
                <span
                  className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getPlanBadgeColor(activePlanName)}`}
                >
                  <PlanIcon className="h-2.5 w-2.5" />
                  {displayPlanName.toUpperCase()}
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

        {/* ── App Features ── */}
        <motion.div variants={stagger.item}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("app_features")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {APP_FEATURES.map((feat) => {
              const Icon = feat.icon;
              const mapping = APP_FEATURE_KEY_MAP[feat.label];
              const transLabel = mapping ? t(mapping.label as any) : feat.label;
              const transDesc = mapping ? t(mapping.desc as any) : feat.desc;
              return (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  key={feat.label}
                  onClick={() => {
                    const scroller = document.querySelector('.app-cover');
                    if (scroller) scroller.scrollTop = 0;
                    
                    if (feat.label === "Buildings") navigate("/app/buildings");
                    else if (feat.label === "Rooms") navigate("/app/rooms");
                    else if (feat.label === "Payments") navigate("/app/payments");
                    else if (feat.label === "Facilities" || feat.label === "Expenses") navigate("/app/expenses");
                    else if (feat.label === "Staff") setStaffOpen(true);
                    else if (feat.label === "Billing Cycle") setRentDateOpen(true);
                    else if (feat.label === "Analytics") navigate("/app");
                    else if (feat.label === "Electricity") window.dispatchEvent(new CustomEvent("nivasa:add-electricity")); 
                    else if (feat.label === "Multi-language") setLanguageOpen(true);
                    else if (feat.label === "Expense Register") navigate("/app/maintenance");
                    else if (feat.label === "Profit") setProfitOpen(true);
                    else if (feat.label === "Notifications") setNotificationsOpen(true);
                    else if (feat.label === "Tenant Score") navigate("/app/tenant-score");
                  }}
                  className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-5 shadow-soft transition-colors hover:border-border hover:bg-secondary/50 text-left relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${feat.bg}`}>
                    <Icon className={`h-5 w-5 ${feat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{transLabel}</p>
                    <p className="text-[11px] leading-snug text-muted-foreground mt-0.5">{transDesc}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>        {/* ── Settings quick-links ── */}
        <motion.div variants={stagger.item}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("settings")}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft">
            {MENU_ITEMS.map((item, i) => {
              const Icon = item.icon;
              const mapping = MENU_KEY_MAP[item.label];
              const transLabel = mapping ? t(mapping.label as any) : item.label;
              const transDesc = mapping ? t(mapping.desc as any) : item.desc;
              return (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  key={item.label}
                  onClick={item.onClick}
                  className={`flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-secondary/50 ${
                    i < MENU_ITEMS.length - 1 ? "border-b border-border/40" : ""
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                    <Icon className={`h-5 w-5 ${item.accent}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{transLabel}</p>
                    <p className="text-xs text-muted-foreground">{transDesc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </motion.button>
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
            {t("sign_out")}
          </button>
        </motion.div>

        {/* ── Version footer ── */}
        <motion.div variants={stagger.item}>
          <p className="text-center text-[10px] text-muted-foreground/40 tracking-widest uppercase">
            {t("version_footer")}
          </p>
        </motion.div>
      </motion.div>

      {/* ── Modals & Panels ── */}
      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
      <SecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
      <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <StaffManagementPanel open={staffOpen} onClose={() => setStaffOpen(false)} />
      <ThemePanel open={themeOpen} onClose={() => setThemeOpen(false)} />
      <LanguageRegionPanel open={languageOpen} onClose={() => setLanguageOpen(false)} />
      <RentSettingsModal open={rentDateOpen} onClose={() => setRentDateOpen(false)} />
      <ProfitPanel open={profitOpen} onClose={() => setProfitOpen(false)} />
    </>
  );
}
