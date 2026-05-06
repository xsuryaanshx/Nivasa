import { NavLink } from "react-router-dom";
import { Building2, Home, LayoutDashboard, Receipt, Sparkles, Zap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app",            label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/buildings",  label: "Buildings", icon: Building2 },
  { to: "/app/rooms",      label: "Rooms",     icon: Home },
  { to: "/app/payments",   label: "Payments",  icon: Receipt },
];

interface Props { collapsed: boolean; }

export function AppSidebar({ collapsed }: Props) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-sidebar/60 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex lg:flex-col",
        collapsed ? "w-[72px]" : "w-[244px]",
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
          <Sparkles className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Estate</div>
            <div className="text-[11px] text-muted-foreground">Property OS</div>
          </div>
        )}
      </div>

      <nav className="mt-2 flex flex-col gap-0.5 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Electricity billing quick-launch */}
      <div className="mt-2 px-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("estate:add-electricity"))}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
            "text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400",
          )}
        >
          <Zap className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Electricity</span>}
        </button>
      </div>

      {/* Logout */}
      <div className="mt-2 px-3">
        <button
          onClick={() => {
             const api = (window as any).estateApi;
             if (api) api.auth.signOut().then(() => window.location.href = "/login");
          }}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
        </button>
      </div>

      <div className={cn("mt-auto m-3 rounded-xl border border-border bg-card p-4", collapsed && "hidden")}>
        <div className="text-xs font-medium">Pro tip</div>
        <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd> to jump anywhere.
        </div>
      </div>
    </aside>
  );
}