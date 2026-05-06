import { useNavigate, useLocation } from "react-router-dom";
import { Building2, Home, LayoutDashboard, Receipt, Zap } from "lucide-react";
import MacOSDock from "./ui/mac-os-dock";
import { useMemo } from "react";

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const dockApps = useMemo(() => [
    { id: "/app", name: "Dashboard", icon: LayoutDashboard },
    { id: "/app/buildings", name: "Buildings", icon: Building2 },
    { id: "/app/rooms", name: "Rooms", icon: Home },
    { id: "/app/payments", name: "Payments", icon: Receipt },
    { id: "electricity", name: "Electric", icon: Zap }
  ], []);

  const handleAppClick = (appId: string) => {
    if (appId === "electricity") {
      window.dispatchEvent(new CustomEvent("estate:add-electricity"));
    } else {
      navigate(appId);
    }
  };

  const activeAppIds = dockApps
    .filter(app => {
      if (app.id === "electricity") return false;
      if (app.id === "/app") return location.pathname === "/app";
      return location.pathname.startsWith(app.id);
    })
    .map(app => app.id);

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 flex justify-center lg:hidden pb-safe pointer-events-none">
      <div className="pointer-events-auto">
        <MacOSDock 
          apps={dockApps}
          onAppClick={handleAppClick}
          openApps={activeAppIds}
        />
      </div>
    </nav>
  );
}
