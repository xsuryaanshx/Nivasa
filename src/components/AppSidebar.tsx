import { nivasaApi } from "@/lib/api";
import { NavLink, useLocation } from "react-router-dom";
import { Building2, Home, LayoutDashboard, ReceiptIndianRupee, Sparkles, UserCircle2, Zap, LogOut, Briefcase, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "./LanguageProvider";
import { NivasaLogo } from "./NivasaLogo";

interface Props { collapsed: boolean; }

export function AppSidebar({ collapsed }: Props) {
  const { t } = useLanguage();
  const location = useLocation();
  const items = [
    { to: "/app", label: t("dashboard"), icon: LayoutDashboard, end: true },
    { to: "/app/buildings", label: t("buildings"), icon: Building2 },
    { to: "/app/tenants", label: t("tenants") || "Tenants", icon: UserCircle2 },
    { to: "/app/payments", label: t("payments"), icon: ReceiptIndianRupee },
    { to: "/app/staff", label: "Staff", icon: Briefcase },
    { to: "/app/maintenance", label: "Maintenance", icon: Wrench },
    { to: "/app/subscription", label: t("subscription") || "Subscription", icon: Sparkles },
    { to: "/app/profile", label: t("profile"), icon: UserCircle2 },
  ];

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-sidebar/60 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex lg:flex-col",
        collapsed ? "w-[72px]" : "w-[244px]",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <NivasaLogo className="h-14 w-14 rounded-lg" />
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-xl font-semibold tracking-tight">Nivasa</div>
          </div>
        )}
      </div>

      <nav className="mt-2 flex flex-col gap-0.5 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={() => {
              const isItemActive = item.to === "/app/profile"
                ? (location.pathname === "/app/profile" || location.pathname === "/app/maintenance")
                : (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to));
              return cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isItemActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              );
            }}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Electricity billing quick-launch */}
      <div className="mt-2 px-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("nivasa:add-electricity"))}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
            "text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400",
          )}
        >
          <Zap className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{t("electricity")}</span>}
        </button>
      </div>

      {/* Logout */}
      <div className="mt-2 px-3">
        <button
          onClick={() => {
             if (nivasaApi) nivasaApi.auth.signOut().then(() => window.location.href = "/login");
          }}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{t("logout")}</span>}
        </button>
      </div>

    </aside>
  );
}
