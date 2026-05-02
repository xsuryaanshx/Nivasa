/**
 * ElectricityBillingModal
 * ─────────────────────────────────────────────
 * Meter-based electricity tracking per room, per month.
 *
 * Logic:
 *   Units consumed = Current reading − Previous reading
 *   First entry    = Initial (move-in) reading
 *   Each month     = Previous end becomes next start automatically
 *   Bill           = Units consumed × rate / unit
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, CalendarDays, CheckCircle2, DoorOpen,
  IndianRupee, Save, Zap,
} from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultRoomId?: string;
  onSaved?: () => void;
}

export function ElectricityBillingModal({ open, onClose, defaultRoomId, onSaved }: Props) {
  const { currency } = useCurrency();

  // Data
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Selection
  const [buildingId, setBuildingId] = useState("");
  const [roomId, setRoomId] = useState(defaultRoomId || "");

  // Meter fields
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [prevReading, setPrevReading] = useState<string>("");
  const [currReading, setCurrReading] = useState<string>("");
  const [ratePerUnit, setRatePerUnit] = useState<string>("0.18");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load data ────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoadingData(true);
      const api = (window as any).estateApi;
      if (!api) return;
      const [buildings, rooms, globalRate] = await Promise.all([
        api.getBuildings(),
        api.getRooms(),
        api.getElectricityRate()
      ]);
      setBuildingsList(buildings);
      setAllRooms(rooms);
      setRatePerUnit(String(globalRate || 0.18));

      if (defaultRoomId) {
        const defRoom = rooms.find((r: any) => r.id === defaultRoomId);
        if (defRoom) {
          setBuildingId(defRoom.buildingId);
          setRoomsList(rooms.filter((r: any) => r.buildingId === defRoom.buildingId));
          setRoomId(defaultRoomId);
          // Pre-fill from room data
          setPrevReading(String(defRoom.currReading || 0));
          setCurrReading("");
          // Use global rate if room rate is not specifically set (or just always use global for now as per prompt)
          setRatePerUnit(String(defRoom.ratePerUnit || globalRate || 0.18));
          return;
        }
      }

      if (buildings.length > 0) {
        const firstBId = buildings[0].id;
        setBuildingId(firstBId);
        const filtered = rooms.filter((r: any) => r.buildingId === firstBId);
        setRoomsList(filtered);
        if (filtered.length > 0) {
          const firstRoom = filtered[0];
          setRoomId(firstRoom.id);
          // Last ending reading becomes new starting reading
          setPrevReading(String(firstRoom.currReading || 0));
          setCurrReading("");
          setRatePerUnit(String(firstRoom.ratePerUnit || globalRate || 0.18));
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSuccess(false);
      setError(null);
      fetchData();
    }
  }, [open]);

  // Cascade: when building changes
  const handleBuildingChange = (bId: string) => {
    setBuildingId(bId);
    const filtered = allRooms.filter((r: any) => r.buildingId === bId);
    setRoomsList(filtered);
    if (filtered.length > 0) {
      const r = filtered[0];
      setRoomId(r.id);
      setPrevReading(String(r.currReading || 0));
      setCurrReading("");
      setRatePerUnit(String(r.ratePerUnit || 0.18));
    } else {
      setRoomId("");
    }
  };

  // Cascade: when room changes
  const handleRoomChange = (rId: string) => {
    setRoomId(rId);
    const room = allRooms.find((r: any) => r.id === rId);
    if (room) {
      // Auto-fill prev reading from room's current reading (prev month's end)
      setPrevReading(String(room.currReading || 0));
      setCurrReading("");
      setRatePerUnit(String(room.ratePerUnit || 0.18));
    }
  };

  // Computed
  const prev = parseFloat(prevReading) || 0;
  const curr = parseFloat(currReading) || 0;
  const rate = parseFloat(ratePerUnit) || 0;
  const unitsConsumed = Math.max(0, curr - prev);
  const electricityBill = unitsConsumed * rate * currency.rate;
  const isFirstEntry = prev === 0;

  const selectedRoom = allRooms.find(r => r.id === roomId);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!roomId) { setError("Please select a room"); return; }
    if (!month) { setError("Please select a month"); return; }
    if (currReading === "") { setError("Current meter reading is required"); return; }
    if (curr < prev && !isFirstEntry) {
      setError("Current reading cannot be less than previous reading");
      return;
    }
    if (rate < 0) { setError("Rate per unit must be positive"); return; }

    try {
      setSubmitting(true);
      const api = (window as any).estateApi;
      if (!api) throw new Error("API not loaded");

      await api.saveElectricityReading({
        room_id: roomId,
        month,
        prev_reading: prev,
        curr_reading: curr,
        rate_per_unit: rate,
      });

      setSuccess(true);
      toast.success("Meter reading saved", {
        description: `Room ${selectedRoom?.number} · ${unitsConsumed} units · ${currency.symbol}${electricityBill.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      });

      setTimeout(() => {
        onClose();
        onSaved?.();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to save reading");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Electricity Billing"
      description="Enter meter readings to calculate monthly consumption"
    >
      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 py-8"
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500"
          >
            <Zap className="h-7 w-7" />
          </motion.div>
          <div className="text-base font-semibold">Reading Saved</div>
          <div className="text-xs text-muted-foreground">
            {unitsConsumed} units · {currency.symbol}{electricityBill.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </motion.div>
      ) : (
        <form onSubmit={submit} className="space-y-4">

          {/* Building + Room cascade */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Building">
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={buildingId}
                  onChange={e => handleBuildingChange(e.target.value)}
                  disabled={loadingData}
                  className="h-11 w-full appearance-none rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                >
                  {buildingsList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </Field>

            <Field label="Room">
              <div className="relative">
                <DoorOpen className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={roomId}
                  onChange={e => handleRoomChange(e.target.value)}
                  disabled={loadingData || roomsList.length === 0}
                  className="h-11 w-full appearance-none rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                >
                  {roomsList.map(r => (
                    <option key={r.id} value={r.id}>Room {r.number}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          {/* Month */}
          <Field label="Billing Month">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
            </div>
          </Field>

          {/* First-entry notice */}
          {isFirstEntry && (
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/8 px-3.5 py-2.5 text-xs text-yellow-600 dark:text-yellow-400">
              <strong>First entry:</strong> This is the initial meter reading for this room.
              Enter the reading at tenant move-in.
            </div>
          )}

          {/* Meter readings */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={isFirstEntry ? "Initial Reading (kWh)" : "Previous Reading (kWh)"}>
              <MeterInput
                value={prevReading}
                onChange={setPrevReading}
                placeholder="e.g. 4820"
                hint={isFirstEntry ? "At move-in" : "Auto-filled from last month"}
                readOnly={!isFirstEntry && prev > 0}
              />
            </Field>
            <Field label="Current Reading (kWh)" error={error?.includes("Current") ? error : undefined}>
              <MeterInput
                value={currReading}
                onChange={setCurrReading}
                placeholder="e.g. 4956"
                hint="This month's end"
                autoFocus
              />
            </Field>
          </div>

          {/* Rate */}
          <Field label="Rate per Unit">
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="number"
                inputMode="decimal"
                step={0.01}
                min={0}
                value={ratePerUnit}
                onChange={e => setRatePerUnit(e.target.value)}
                placeholder="0.18"
                className="h-11 w-full rounded-xl border border-border bg-card/70 pl-9 pr-16 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                / unit
              </span>
            </div>
          </Field>

          {/* Live calculation */}
          <div className={cn(
            "rounded-xl border p-4 space-y-2.5 transition-colors",
            unitsConsumed > 0 ? "border-yellow-500/20 bg-yellow-500/5" : "border-border bg-secondary/30",
          )}>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <Zap className="h-3 w-3" /> Live Calculation
            </div>
            <div className="grid grid-cols-3 gap-2">
              <CalcCell
                label="Units Consumed"
                value={`${unitsConsumed.toLocaleString()} kWh`}
                accent={unitsConsumed > 0}
              />
              <CalcCell
                label="Rate"
                value={`${currency.symbol}${parseFloat(ratePerUnit || "0").toFixed(2)}`}
              />
              <CalcCell
                label="Electricity Bill"
                value={unitsConsumed > 0
                  ? `${currency.symbol}${electricityBill.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : "—"}
                bold
              />
            </div>
            {selectedRoom && (
              <div className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Total due (rent + electricity)</span>
                <span className="font-semibold tnum">
                  {currency.symbol}
                  {((selectedRoom.rent + electricityBill / currency.rate) * currency.rate)
                    .toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && !error.includes("Current") && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose} disabled={submitting}
              className="h-11 flex-1 rounded-xl border border-border bg-card/60 text-sm font-medium transition-colors hover:bg-card disabled:opacity-50"
            >
              Cancel
            </button>
            <MagneticButton type="submit" className="flex-1" disabled={submitting || !roomId || currReading === ""}>
              {submitting ? "Saving…" : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" /> Save Reading
                </span>
              )}
            </MagneticButton>
          </div>
        </form>
      )}
    </GlassModal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({
  label, hint, error, children,
}: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {!error && hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
        {error && <span className="text-[10px] font-medium text-destructive">{error}</span>}
      </div>
      {children}
    </label>
  );
}

function MeterInput({
  value, onChange, placeholder, hint, readOnly, autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        className={cn(
          "h-11 w-full rounded-xl border border-border bg-card/70 pl-3.5 pr-12 text-sm font-semibold tnum outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]",
          readOnly && "cursor-not-allowed bg-secondary/40 text-muted-foreground",
        )}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        kWh
      </span>
    </div>
  );
}

function CalcCell({ label, value, accent, bold }: { label: string; value: string; accent?: boolean; bold?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg p-2.5",
      accent ? "bg-yellow-500/10" : "bg-background/60",
    )}>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-xs tnum", bold ? "font-bold" : "font-semibold", accent && "text-yellow-600 dark:text-yellow-400")}>
        {value}
      </div>
    </div>
  );
}
