'use client';

import { useNavigate, useLocation } from "react-router-dom";
import { Building2, Home, LayoutDashboard, Receipt, Zap } from "lucide-react";
import { InteractiveMenu } from "./ui/modern-mobile-menu";
import { useMemo } from "react";

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const dockApps = useMemo(() => [
    { id: "/app", label: "Home", icon: LayoutDashboard },
    { id: "/app/buildings", label: "Buildings", icon: Building2 },
    { id: "/app/rooms", label: "Rooms", icon: Home },
    { id: "/app/payments", label: "Payments", icon: Receipt },
    { id: "electricity", label: "Electric", icon: Zap }
  ], []);

  const handleAppClick = (index: number, id: string) => {
    if (id === "electricity") {
      window.dispatchEvent(new CustomEvent("estate:add-electricity"));
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
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-0 right-0 z-50 flex justify-center lg:hidden">
      <InteractiveMenu 
        items={dockApps}
        activeIndex={activeIndex}
        onItemClick={handleAppClick}
      />
    </nav>
  );
}
