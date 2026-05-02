import { Bell, Focus, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { useFocusMode } from "./FocusModeProvider";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  onOpenPalette: () => void;
}

export function Topbar({ collapsed, onToggle, onOpenPalette }: Props) {
  const { focus, toggle } = useFocusMode();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-5 lg:px-8">
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        <button
          onClick={onOpenPalette}
          className="group flex h-10 flex-1 max-w-md items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search anything…</span>
          <kbd className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
        </button>

        {/* Right section — note: no overflow-hidden here so CurrencySwitcher dropdown can escape */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle focus mode"
            title="Focus mode (F)"
            className={cn(
              "hidden h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors sm:inline-flex",
              focus
                ? "border-foreground/20 bg-foreground text-background hover:opacity-90"
                : "border-border bg-card text-foreground/80 hover:bg-secondary",
            )}
          >
            <Focus className="h-3.5 w-3.5" />
            <span>Focus</span>
            <kbd className={cn(
              "ml-1 rounded px-1 py-0.5 font-mono text-[10px]",
              focus ? "bg-background/20 text-background/80" : "bg-secondary text-muted-foreground",
            )}>F</kbd>
          </button>

          {/* CurrencySwitcher: parent has no overflow-hidden so dropdown is visible */}
          <CurrencySwitcher />

          <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-status-info" />
          </button>

          <ThemeToggle />

          {/* Dynamic user avatar — no hardcoded name */}
          <div className="ml-1 hidden h-9 items-center gap-2.5 rounded-full border border-border bg-card pl-1 pr-3.5 md:inline-flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
              {user?.initials || "U"}
            </div>
            <span className="text-sm font-medium">{user?.firstName || "User"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}