'use client';

import { useNavigate, useLocation } from "react-router-dom";
import { Building2, Home, LayoutDashboard, Receipt, Zap } from "lucide-react";
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
    { id: "/app/rooms", label: t('rooms'), icon: Home },
    { id: "/app/payments", label: t('payments'), icon: Receipt },
    { id: "electricity", label: t('electricity'), icon: Zap }
  ], [t]);

  const handleAppClick = (index: number, id: string) => {
    if (id === "electricity") {
      window.dispatchEvent(new CustomEvent("nivasa:add-electricity"));
    } else {
      navigate(id);
    }
  };

  const activeIndex = useMemo(() => {
    const index = dockApps.findIndex(app => {
      if (app.id === "electricity") return false;
      if (app.id === "/app") return location.pathname === "/app";
      return location.pathname.startsWith(app.id);
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
