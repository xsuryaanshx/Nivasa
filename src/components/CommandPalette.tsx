import { Command } from "cmdk";
import {
  ArrowRight, Building2, CheckCircle2, Coins, CornerDownLeft, Home, Keyboard,
  LayoutDashboard, Moon, Plus, ReceiptIndianRupee, Search, Sun, User, UserPlus, Zap,
} from "lucide-react";
import { forwardRef, useEffect, useMemo, useState, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { rooms as mockRooms, buildings as mockBuildings } from "@/lib/mockData";
import { CURRENCIES, useCurrency, type CurrencyCode } from "@/lib/currency";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onShowHelp?: () => void;
}

export function CommandPalette({ open, onOpenChange, onShowHelp }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();

  const [roomsList, setRoomsList] = useState<any[]>(mockRooms);
  const [buildingsList, setBuildingsList] = useState<any[]>(mockBuildings);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          const api = (window as any).nivasaApi;
          if (api) {
            const { data: { session } } = await api.supabase.auth.getSession();
            if (session) {
              const [fetchedRooms, fetchedBuildings] = await Promise.all([
                api.getRooms(),
                api.getBuildings()
              ]);
              setRoomsList(fetchedRooms || []);
              setBuildingsList(fetchedBuildings || []);
            } else {
              setRoomsList(mockRooms);
              setBuildingsList(mockBuildings);
            }
          }
        } catch (error) {
          console.error("Error fetching data for command palette:", error);
        }
      };
      fetchData();
    }
  }, [open]);

  const close = () => onOpenChange(false);
  const go = (path: string) => { close(); navigate(path); };

  const tenantRooms = useMemo(() => roomsList.filter(r => (r.tenants?.length || 0) > 0), [roomsList]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/25 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            className="relative w-full max-w-xl mx-4 overflow-hidden rounded-2xl border border-border glass-strong shadow-float"
          >
            <Command label="Command palette" loop className="bg-transparent">
              <div className="flex items-center gap-2.5 border-b border-border px-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  autoFocus
                  placeholder="Search rooms, tenants, or run an action…"
                  className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">ESC</kbd>
              </div>

              <Command.List className="max-h-[420px] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                <Command.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No results for &ldquo;<span className="text-foreground">{query}</span>&rdquo;
                </Command.Empty>

                <Command.Group heading="Navigate">
                  <Item value="dashboard nav home" onSelect={() => go("/app")}            icon={<LayoutDashboard className="h-4 w-4" />} shortcut="G D">Go to Dashboard</Item>
                  <Item value="buildings"          onSelect={() => go("/app/buildings")}  icon={<Building2 className="h-4 w-4" />}        shortcut="G B">Go to Buildings</Item>
                  <Item value="rooms"              onSelect={() => go("/app/rooms")}      icon={<Home className="h-4 w-4" />}             shortcut="G R">Go to Rooms</Item>
                  <Item value="payments"           onSelect={() => go("/app/payments")}   icon={<ReceiptIndianRupee className="h-4 w-4" />}          shortcut="G P">Go to Payments</Item>
                </Command.Group>

                <Command.Group heading="Quick actions">
                  <Item value="add payment new" onSelect={() => { close(); window.dispatchEvent(new CustomEvent("nivasa:add-payment")); }} icon={<Plus className="h-4 w-4" />}>
                    Add payment
                  </Item>
                  <Item value="add tenant new" onSelect={() => { close(); window.dispatchEvent(new CustomEvent("nivasa:add-tenant")); }} icon={<UserPlus className="h-4 w-4" />}>
                    Add new tenant
                  </Item>
                  <Item value="electricity meter reading" onSelect={() => { close(); window.dispatchEvent(new CustomEvent("nivasa:add-electricity")); }} icon={<Zap className="h-4 w-4" />}>
                    Enter electricity reading
                  </Item>
                  <Item value="mark all paid" onSelect={() => { close(); toast.success("Marked latest pending as paid"); }} icon={<CheckCircle2 className="h-4 w-4" />}>
                    Mark latest as paid
                  </Item>

                  <Item value="theme dark light" onSelect={() => { setTheme(theme === "dark" ? "light" : "dark"); }} icon={theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}>
                    Switch to {theme === "dark" ? "light" : "dark"} mode
                  </Item>
                  {onShowHelp && (
                    <Item value="keyboard shortcuts help" onSelect={() => { close(); onShowHelp(); }} icon={<Keyboard className="h-4 w-4" />} shortcut="?">
                      Keyboard shortcuts
                    </Item>
                  )}
                </Command.Group>

                <Command.Group heading={`Currency · ${currency.code}`}>
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map(code => {
                    const c = CURRENCIES[code];
                    return (
                      <Item key={code} value={`currency ${code} ${c.label}`}
                        onSelect={() => { setCurrency(code); close(); toast.success(`Currency set to ${c.code}`, { description: c.label }); }}
                        icon={<Coins className="h-4 w-4" />}
                        right={<span className="font-mono text-xs text-muted-foreground">{c.symbol}</span>}>
                        {c.code} <span className="text-muted-foreground">· {c.label}</span>
                      </Item>
                    );
                  })}
                </Command.Group>

                {roomsList.length > 0 && (
                  <Command.Group heading="Rooms">
                    {roomsList.slice(0, 8).map(r => (
                      <Item key={r.id} value={`room ${r.number} ${r.buildingName} ${(r.tenants || []).map((t: any) => t.name).join(" ")}`}
                        onSelect={() => go(`/app/rooms/${r.id}`)} icon={<Home className="h-4 w-4" />}>
                        Room {r.number} <span className="text-muted-foreground">· {r.buildingName}</span>
                      </Item>
                    ))}
                  </Command.Group>
                )}

                {tenantRooms.length > 0 && (
                  <Command.Group heading="Tenants">
                    {tenantRooms.slice(0, 6).flatMap(r => (r.tenants || []).map((t: any) => (
                      <Item key={t.id} value={`tenant ${t.name} ${r.number}`}
                        onSelect={() => go(`/app/rooms/${r.id}`)} icon={<User className="h-4 w-4" />}>
                        {t.name} <span className="text-muted-foreground">· Room {r.number}</span>
                      </Item>
                    )))}
                  </Command.Group>
                )}

                {buildingsList.length > 0 && (
                  <Command.Group heading="Buildings">
                    {buildingsList.map(b => (
                      <Item key={b.id} value={`building ${b.name} ${b.address || ""}`}
                        onSelect={() => go("/app/buildings")} icon={<Building2 className="h-4 w-4" />}>
                        {b.name} <span className="text-muted-foreground">· {b.rooms} rooms</span>
                      </Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="hairline" />
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Hint k="↑↓">Navigate</Hint>
                  <Hint icon={<CornerDownLeft className="h-3 w-3" />}>Select</Hint>
                  <Hint k="ESC">Close</Hint>
                  {onShowHelp && (
                    <button
                      type="button"
                      onClick={() => { close(); onShowHelp(); }}
                      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-secondary"
                    >
                      <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-secondary px-1 font-mono text-[10px] text-muted-foreground">?</kbd>
                      <span>Help</span>
                    </button>
                  )}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <span className="font-medium text-foreground">Nivasa</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type ItemProps = {
  value: string;
  onSelect: () => void;
  icon: ReactNode;
  children: ReactNode;
  shortcut?: string;
  right?: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof Command.Item>, "value" | "onSelect" | "children">;

// forwardRef so cmdk can attach its internal ref without React warnings.
const Item = forwardRef<ElementRef<typeof Command.Item>, ItemProps>(function Item(
  { value, onSelect, icon, children, shortcut, right, ...rest },
  ref,
) {
  return (
    <Command.Item
      ref={ref}
      value={value}
      onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors data-[selected=true]:bg-secondary aria-selected:bg-secondary"
      {...rest}
    >
      <span className="text-muted-foreground group-data-[selected=true]:text-foreground">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {right}
      {shortcut && (
        <span className="hidden gap-1 opacity-0 transition-opacity group-data-[selected=true]:opacity-100 sm:inline-flex">
          {shortcut.split(" ").map((k, i) => (
            <kbd key={i} className="rounded border border-border bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {k}
            </kbd>
          ))}
        </span>
      )}
    </Command.Item>
  );
});

function Hint({ k, icon, children }: { k?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-secondary px-1 font-mono text-[10px] text-muted-foreground">
        {icon ?? k}
      </kbd>
      <span>{children}</span>
    </span>
  );
}
