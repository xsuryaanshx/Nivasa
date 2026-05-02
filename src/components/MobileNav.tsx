import { NavLink } from "react-router-dom";
import { Building2, Home, LayoutDashboard, Receipt, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app",            label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/buildings",  label: "Buildings", icon: Building2 },
  { to: "/app/rooms",      label: "Rooms",     icon: Home },
  { to: "/app/payments",   label: "Payments",  icon: Receipt },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/80 px-4 pb-safe backdrop-blur-xl lg:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors",
              isActive
                ? "text-brand"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          <item.icon className={cn("h-5 w-5", "transition-transform active:scale-90")} />
          <span>{item.label}</span>
        </NavLink>
      ))}

      {/* Electricity quick-launch — mobile */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("estate:add-electricity"))}
        className="flex flex-col items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-yellow-500 active:scale-90"
      >
        <Zap className="h-5 w-5 transition-transform" />
        <span>Electric</span>
      </button>
    </nav>
  );
}
