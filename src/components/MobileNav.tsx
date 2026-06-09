'use client';

import { useNavigate, useLocation } from "react-router-dom";
import { Building2, Home, LayoutDashboard, ReceiptIndianRupee, UserCircle2 } from "lucide-react";
import { InteractiveMenu } from "./ui/modern-mobile-menu";
import { useMemo } from "react";
import { useLanguage } from "./LanguageProvider";

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  const dockApps = useMemo(() => [
    { id: "/app", label: t('home'), icon: LayoutDashboard },
    { id: "/app/buildings", label: t('buildings'), icon: Building2 },
    { id: "/app/tenants", label: t('tenants') || "Tenants", icon: UserCircle2 },
    { id: "/app/payments", label: t('payments'), icon: ReceiptIndianRupee },
    { id: "/app/profile", label: t("profile"), icon: UserCircle2 },
  ], [t]);

  const handleAppClick = (index: number, id: string) => {
    navigate(id);
  };

  const activeIndex = useMemo(() => {
    const currentPath = (location.pathname === "/app/expenses" || location.pathname === "/app/subscription")
      ? "/app/profile"
      : location.pathname;
    const index = dockApps.findIndex(app => {
      if (app.id === "/app") return currentPath === "/app";
      return currentPath.startsWith(app.id);
    });
    return index === -1 ? 0 : index;
  }, [location.pathname, dockApps]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="w-full max-w-lg px-3 pt-2">
        <InteractiveMenu
          items={dockApps}
          activeIndex={activeIndex}
          onItemClick={handleAppClick}
        />
      </div>
    </div>
  );
}
