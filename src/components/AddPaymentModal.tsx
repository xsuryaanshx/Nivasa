import { nivasaApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Banknote, Building2, CheckCircle2, CreditCard, FileText,
  Hash, Smartphone, CalendarDays, DoorOpen,
} from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { type PaymentStatus } from "@/lib/types";
import { useCurrency } from "@/lib/currency";
import { cn, calculateTenantShare } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "@/hooks/useAuth";

type Method = "Bank" | "UPI" | "Cash";

const methods: { key: Method; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "Bank", label: "Bank",  icon: CreditCard },
  { key: "UPI",  label: "UPI",   icon: Smartphone },
  { key: "Cash", label: "Cash",  icon: Banknote },
];

const statuses: { key: PaymentStatus; label: string; tint: string }[] = [
  { key: "paid",    label: "Paid",    tint: "data-[active=true]:bg-status-paid/15 data-[active=true]:text-status-paid" },
  { key: "pending", label: "Pending", tint: "data-[active=true]:bg-status-pending/15 data-[active=true]:text-status-pending" },
  { key: "late",    label: "Late",    tint: "data-[active=true]:bg-status-late/15 data-[active=true]:text-status-late" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  defaultRoomId?: string;
  defaultTenantId?: string;
  defaultAmount?: number;
}

export function AddPaymentModal({ open, onClose, defaultRoomId, defaultTenantId, defaultAmount }: Props) {
  const { currency } = useCurrency();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Building + Room cascade
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [buildingId, setBuildingId] = useState<string>("");
  const [roomId, setRoomId]         = useState(defaultRoomId || "");
  const [tenantId, setTenantId]     = useState(defaultTenantId || "");

  // Payment fields
  const [amount, setAmount]         = useState("");
  const [method, setMethod]         = useState<Method>("Bank");
  const [status, setStatus]         = useState<PaymentStatus>("paid");
  const [date, setDate]             = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [note, setNote]             = useState("");
  const [reference, setReference]   = useState("");

  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);

  // Deposit tracking states
  const [paymentType, setPaymentType] = useState<"Rent" | "Deposit">("Rent");
  const [checkingDeposit, setCheckingDeposit] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);

  // ── Fetch buildings + rooms on open ────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoadingData(true);
      if (!nivasaApi) return;
      const [buildings, rooms] = await Promise.all([
        nivasaApi.getBuildings(),
        nivasaApi.getRooms(),
      ]);
      setBuildingsList(buildings);
      setAllRooms(rooms);

      // Pre-select from defaultRoomId
      if (defaultRoomId) {
        const defRoom = rooms.find((r: any) => r.id === defaultRoomId);
        if (defRoom) {
          setBuildingId(defRoom.buildingId);
          setRoomsList(rooms.filter((r: any) => r.buildingId === defRoom.buildingId));
          setRoomId(defaultRoomId);
          return;
        }
      }
      // Default: first building
      if (buildings.length > 0) {
        const firstBId = buildings[0].id;
        setBuildingId(firstBId);
        const filtered = rooms.filter((r: any) => r.buildingId === firstBId);
        setRoomsList(filtered);
        if (filtered.length > 0) setRoomId(filtered[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSuccess(false);
      setError(null);
      setAmount(""); setNote(""); setReference("");
      setMethod("Bank"); setStatus("paid");
      setTenantId(defaultTenantId || "");
      setPaymentType("Rent");
      setDepositPaid(false);
      setDate(new Date().toISOString().slice(0, 10));
      fetchData();
    }
  }, [open, defaultTenantId]);

  // Check deposit paid status for selected tenant
  useEffect(() => {
    async function checkDepositStatus() {
      if (!tenantId) {
        setDepositPaid(false);
        return;
      }
      try {
        setCheckingDeposit(true);
        // 1. Check local tenant state for depositMethod/depositAmount (signup auto-log)
        const currentSelectedRoom = allRooms.find(r => r.id === roomId);
        const currentSelectedTenant = currentSelectedRoom?.tenants?.find(t => t.id === tenantId);
        
        if (currentSelectedTenant) {
          const isDepositConfiguredPaid = 
            (currentSelectedTenant.depositAmount || 0) > 0 && 
            currentSelectedTenant.depositMethod !== "Pending";
          if (isDepositConfiguredPaid) {
            setDepositPaid(true);
            return;
          }
        }

        // 2. Query DB payments table for any paid deposit transaction
        const { data, error: dbError } = await nivasaApi.supabase
          .from("payments")
          .select("amount, status, note")
          .eq("tenant_id", tenantId)
          .eq("status", "paid");
        
        if (dbError) throw dbError;

        const hasPaidDepositPayment = (data || []).some((p: any) => 
          p.note?.toLowerCase().includes("deposit")
        );
        setDepositPaid(hasPaidDepositPayment);
      } catch (err) {
        console.error("Error checking deposit status:", err);
      } finally {
        setCheckingDeposit(false);
      }
    }
    checkDepositStatus();
  }, [tenantId, allRooms, roomId]);

  // Cascade rooms when building changes
  const handleBuildingChange = (bId: string) => {
    setBuildingId(bId);
    const filtered = allRooms.filter((r: any) => r.buildingId === bId);
    setRoomsList(filtered);
    setRoomId(filtered.length > 0 ? filtered[0].id : "");
  };

  const selectedRoom = allRooms.find(r => r.id === roomId);
  const selectedTenant = selectedRoom?.tenants?.find(t => t.id === tenantId);
  const baseDefaultAmount = selectedRoom ? calculateTenantShare(selectedRoom) * currency.rate : 0;
  const tenantDepositAmount = selectedTenant?.depositAmount ? selectedTenant.depositAmount * currency.rate : 0;

  const initialAmount = paymentType === "Deposit"
    ? tenantDepositAmount
    : (defaultAmount !== undefined ? defaultAmount : baseDefaultAmount);
  const amountValue = Number(amount) || initialAmount;

  const handlePaymentTypeChange = (type: "Rent" | "Deposit") => {
    setPaymentType(type);
    setAmount(""); // Clear manual amount to default to the selected type's suggested amount
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!roomId) {
      setError("Please select a room");
      return;
    }
    if (!date) {
      setError("Please select a date");
      return;
    }
    if (selectedRoom?.tenants?.length && !tenantId) {
      setError("Please select a tenant");
      return;
    }
    if (amount && (Number.isNaN(Number(amount)) || Number(amount) <= 0)) {
      setError("Amount must be a positive number");
      return;
    }

    try {
      setSubmitting(true);

      let finalNote = note;
      if (paymentType === "Deposit") {
        finalNote = note ? `Deposit - ${note}` : "Deposit";
      }
      
      await nivasaApi.addPayment({
        building_id: buildingId,
        room_id: roomId,
        tenant_id: tenantId || selectedRoom?.tenants?.[0]?.id || null,
        amount: amountValue,
        method,
        status,
        date,
        note: finalNote || undefined,
        reference: reference || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        toast.success(paymentType === "Deposit" ? "Deposit recorded" : "Payment recorded", {
          description: `${currency.symbol}${amountValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} · Room ${selectedRoom?.number ?? "?"} · ${status}`,
        });
        window.dispatchEvent(new CustomEvent("nivasa:refresh"));
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to save payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassModal open={open} onClose={onClose} title="Add payment" description="Record a new transaction in seconds">
      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 py-8"
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-status-paid/15 text-status-paid"
          >
            <CheckCircle2 className="h-7 w-7" />
          </motion.div>
          <div className="text-base font-semibold">Recorded</div>
          <div className="text-xs text-muted-foreground">Closing…</div>
        </motion.div>
      ) : (
        <form onSubmit={submit} className="space-y-4">

          {/* Building selector */}
          <Field label="Building">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={buildingId}
                onChange={e => handleBuildingChange(e.target.value)}
                disabled={loadingData}
                className="h-11 w-full appearance-none rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              >
                {loadingData ? (
                  <option>Loading…</option>
                ) : buildingsList.length === 0 ? (
                  <option value="">No buildings found</option>
                ) : (
                  buildingsList.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))
                )}
              </select>
            </div>
          </Field>

          {/* Room selector — dynamically filtered */}
          <Field label="Room">
            <div className="relative">
              <DoorOpen className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                disabled={loadingData || roomsList.length === 0}
                className="h-11 w-full appearance-none rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              >
                {loadingData ? (
                  <option>Loading rooms…</option>
                ) : roomsList.length === 0 ? (
                  <option value="">No rooms in this building</option>
                ) : (
                  roomsList.map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.number}{r.tenants?.length ? ` · ${r.tenants.map((t: any) => t.name).join(", ")}` : ` · ${t("vacant").toLowerCase()}`}
                    </option>
                  ))
                )}
              </select>
            </div>
          </Field>

          {/* Tenant selector */}
          {selectedRoom?.tenants && selectedRoom.tenants.length > 0 && (
            <Field label="Tenant">
              <div className="relative">
                <DoorOpen className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                >
                  <option value="">Select a tenant</option>
                  {selectedRoom.tenants.filter((t: any) => t.status !== 'vacated').map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </Field>
          )}

          {/* Payment Type */}
          <Field label="Payment Type">
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={paymentType}
                onChange={e => handlePaymentTypeChange(e.target.value as "Rent" | "Deposit")}
                className="h-11 w-full appearance-none rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              >
                <option value="Rent">Rent</option>
                <option value="Deposit" disabled={depositPaid}>
                  Deposit {depositPaid ? " (Already paid)" : ""}
                </option>
              </select>
            </div>
          </Field>

          {/* Amount */}
          <Field
            label="Amount"
            hint={initialAmount > 0 ? `Suggested amount: ${currency.symbol}${initialAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : undefined}
            error={error ?? undefined}
          >
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground tnum">
                {currency.symbol}
              </span>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder={initialAmount.toFixed(0)}
                className="h-11 w-full rounded-xl border border-border bg-card/70 pl-8 pr-16 text-base font-semibold tnum outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {currency.code}
              </span>
            </div>
          </Field>

          {/* Start date */}
          <Field label="Start Date">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
            </div>
          </Field>

          {/* Payment Method */}
          <Field label="Payment Method">
            <div className="flex h-11 items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1">
              {methods.map(m => (
                <button
                  type="button" key={m.key} onClick={() => setMethod(m.key)}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                    method === m.key ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <m.icon className="h-3.5 w-3.5" /> {m.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Status */}
          <Field label="Status">
            <div className="flex h-11 items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1">
              {statuses.map((s) => (
                <button
                  type="button" key={s.key} onClick={() => setStatus(s.key)}
                  data-active={status === s.key}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors text-muted-foreground hover:text-foreground",
                    s.tint,
                    status === s.key && "shadow-soft",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Reference + Note */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference Number" optional>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="TXN-2025-0421"
                  className="h-11 w-full rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                />
              </div>
            </Field>
            <Field label="Notes" optional>
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. partial payment"
                  className="h-11 w-full rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                />
              </div>
            </Field>
          </div>

          {/* UPI QR Code */}
          {method === "UPI" && amountValue > 0 && (() => {
            const upiId = user?.upiId;
            const upiUrl = upiId
              ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user.fullName)}&am=${amountValue}&tn=${encodeURIComponent(note || 'Rent')}&cu=INR`
              : "";
            return (
              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/50 space-y-3">
                {upiId ? (
                  <>
                    <div className="relative p-2 bg-white rounded-lg border border-border shadow-soft flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUrl)}`}
                        alt="UPI QR Code"
                        className="h-40 w-40"
                      />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-foreground">Scan QR to pay exactly ₹{amountValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-muted-foreground tracking-wide font-mono truncate max-w-xs">{upiId}</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-center text-xs text-amber-600 dark:text-amber-500">
                    <p className="font-semibold">UPI ID not configured</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Please enter your UPI ID in Profile Settings to generate payment QR codes.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Summary */}
          <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3.5 py-2.5">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-lg font-semibold tnum">
              {currency.symbol}{amountValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose} disabled={submitting}
              className="h-11 flex-1 rounded-xl border border-border bg-card/60 text-sm font-medium transition-colors hover:bg-card disabled:opacity-50"
            >
              Cancel
            </button>
            <MagneticButton type="submit" className="flex-1" disabled={submitting || !roomId}>
              {submitting ? "Recording..." : "Record payment"}
            </MagneticButton>
          </div>
        </form>
      )}
    </GlassModal>
  );
}

function Field({
  label, hint, optional, error, children,
}: {
  label: string; hint?: string; optional?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
          {optional && <span className="ml-1 text-[10px] text-muted-foreground/70">(optional)</span>}
        </span>
        {!error && hint && <span className="text-[10px] text-muted-foreground tnum">{hint}</span>}
        {error && <span className="text-[10px] font-medium text-destructive">{error}</span>}
      </div>
      {children}
    </label>
  );
}