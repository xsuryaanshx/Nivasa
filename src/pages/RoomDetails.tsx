import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BellRing, CheckCircle2, IdCard, MessageCircle, Phone, Plus, Save, Send, UserPlus, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Sparkline } from "@/components/Sparkline";
import { PaymentTimeline } from "@/components/PaymentTimeline";
import { MagneticButton } from "@/components/MagneticButton";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { AddTenantModal } from "@/components/AddTenantModal";
import { ElectricityBillingModal } from "@/components/ElectricityBillingModal";
import { Money } from "@/components/Money";
import { type Room } from "@/lib/mockData";
import { subscribeTenants } from "@/lib/tenantStore";
import { useCurrency, formatMoney, formatNumeric } from "@/lib/currency";
import { openWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function maskAadhar(a?: string) {
  if (!a) return "—";
  const last4 = a.slice(-4);
  return `XXXX XXXX ${last4}`;
}

export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [electricityOpen, setElectricityOpen] = useState(false);
  const [savingElectricity, setSavingElectricity] = useState(false);
  const { currency } = useCurrency();

  const fetchData = async () => {
    try {
      setLoading(true);
      const api = (window as any).estateApi;
      if (!api || !id) return;
      const data = await api.getRoomById(id);
      if (data) {
        setRoom(data);
        setStartReading(data.prevReading);
        setEndReading(data.currReading);
        setPricePerUnit(data.ratePerUnit);
      }
    } catch (error) {
      console.error("Error fetching room details:", error);
      toast.error("Failed to load room details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Listen for global "Add payment" trigger.
  useEffect(() => {
    const h = () => setAddOpen(true);
    window.addEventListener("estate:add-payment", h);
    return () => window.removeEventListener("estate:add-payment", h);
  }, []);

  // Editable electricity readings (UI-only).
  const [startReading, setStartReading] = useState<number>(0);
  const [endReading,   setEndReading]   = useState<number>(0);
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);

  const saveElectricityReading = async () => {
    try {
      setSavingElectricity(true);
      const api = (window as any).estateApi;
      if (!api || !room) throw new Error("API not loaded");
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await api.saveElectricityReading({
        room_id: room.id,
        month,
        prev_reading: startReading,
        curr_reading: endReading,
        rate_per_unit: pricePerUnit,
      });
      toast.success("Meter reading saved", {
        description: `${used} units · ${formatMoney(cost, currency, { decimals: 2 })}`,
      });
      fetchData();
    } catch (err: any) {
      toast.error("Failed to save reading", { description: err.message });
    } finally {
      setSavingElectricity(false);
    }
  };

  const roomPayments = useMemo(() => [], []); // Will be populated by recent payments in a real app or filtered from a larger set

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading room details...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <div className="text-sm font-medium">Room not found</div>
        <button onClick={() => navigate("/app/rooms")} className="mt-3 text-xs text-muted-foreground underline">Back to rooms</button>
      </div>
    );
  }

  const used = Math.max(0, endReading - startReading);
  const cost = used * pricePerUnit;
  const totalDue = room.rent + cost;
  const usagePct = Math.min(100, Math.round((used / 250) * 100));

  const buildInvoiceMessage = () => {
    const tenantName = room.tenant?.name ?? "Tenant";
    const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return [
      `*Estate · Invoice — ${monthLabel}*`,
      ``,
      `Hi ${tenantName},`,
      `Here is your bill for Room ${room.number}, ${room.buildingName}:`,
      ``,
      `• Rent: ${formatMoney(room.rent, currency, { decimals: 0 })}`,
      `• Electricity meter: ${startReading.toLocaleString()} → ${endReading.toLocaleString()} (${used} units)`,
      `• Rate / unit: ${currency.symbol}${formatNumeric(pricePerUnit, currency, 2)}`,
      `• Electricity total: ${formatMoney(cost, currency, { decimals: 2 })}`,
      ``,
      `*Total due: ${formatMoney(totalDue, currency, { decimals: 2 })}*`,
      ``,
      `Reply here if you have any questions. Thanks!`,
    ].join("\n");
  };

  const sendInvoice = () => {
    const phone = room.tenant?.whatsapp_number || room.tenant?.phone;
    if (!phone) {
      toast.error("No contact number on file");
      return;
    }
    const ok = openWhatsApp(phone, buildInvoiceMessage());
    if (ok) toast.success("Invoice opened in WhatsApp", { description: `${room.tenant?.name} · ${phone}` });
  };

  const sendReminder = () => {
    const phone = room.tenant?.whatsapp_number || room.tenant?.phone;
    if (phone) {
      openWhatsApp(phone, `Hi ${room.tenant?.name ?? "tenant"}, a friendly reminder about the rent for Room ${room.number}. Thanks!`);
      toast.success("Reminder opened in WhatsApp");
    } else {
      toast.success("Reminder sent", { description: "No contact on file — SMS fallback." });
    }
  };

  const handleRemoveTenant = async () => {
    if (!room.tenant || !window.confirm(`Are you sure you want to remove ${room.tenant.name}? This will set the room to vacant.`)) return;

    try {
      const api = (window as any).estateApi;
      if (!api) throw new Error("API not loaded");
      
      await api.removeTenant(room.id, room.tenant.id);
      toast.success("Tenant removed successfully");
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error("Error removing tenant:", error);
      toast.error(error.message || "Failed to remove tenant");
    }
  };

  return (
    <div>
      <Link to="/app/rooms" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to rooms
      </Link>

      <PageHeader
        title={`Room ${room.number}`}
        subtitle={`${room.buildingName} · ${formatMoney(room.rent, currency, { decimals: 0 })} / month`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MagneticButton variant="ghost" onClick={sendReminder}>
              <BellRing className="h-4 w-4" /> Send reminder
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => toast.success("Marked as paid")}>
              <CheckCircle2 className="h-4 w-4" /> Mark paid
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => setElectricityOpen(true)}>
              <Zap className="h-4 w-4" /> Enter Reading
            </MagneticButton>
            <MagneticButton onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add payment
            </MagneticButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tenant */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground">Tenant</div>
            {room.tenant ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={sendReminder}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <MessageCircle className="h-3 w-3" /> Chat
                </button>
                <button
                  type="button"
                  onClick={handleRemoveTenant}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-destructive hover:bg-destructive/10"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setTenantOpen(true)}
                className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background hover:opacity-90"
              >
                <UserPlus className="h-3 w-3" /> Add tenant
              </button>
            )}
          </div>
          {room.tenant ? (
            <>
              <div className="mt-4 flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white text-base font-semibold shadow-glow">
                  {initials(room.tenant.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold tracking-tight truncate">{room.tenant.name}</div>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {room.tenant.phone}
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <InfoRow icon={<MessageCircle className="h-3 w-3" />} k="WhatsApp" v={room.tenant.whatsapp_number ?? room.tenant.phone} />
                <InfoRow icon={<IdCard className="h-3 w-3" />} k="Aadhar" v={maskAadhar(room.tenant.aadhar)} mono />
                <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <StatusPill status={room.status} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
                  <span className="text-xs text-muted-foreground">Joined</span>
                  <span className="text-xs font-medium tnum">
                    {new Date(room.tenant.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setTenantOpen(true)}
              className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center transition-colors hover:bg-secondary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card">
                <UserPlus className="h-4 w-4 text-foreground" />
              </div>
              <div className="text-sm font-medium">This room is vacant</div>
              <div className="text-[11px] text-muted-foreground">Click to assign a new tenant</div>
            </button>
          )}
        </div>

        {/* Electricity — meter readings */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Electricity billing</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Enter meter readings to calculate this month&apos;s bill.</div>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-foreground/80">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <NumberField
              label="Start reading"
              hint="At month start"
              value={startReading}
              onChange={setStartReading}
              suffix="kWh"
            />
            <NumberField
              label="End reading"
              hint="At month end"
              value={endReading}
              onChange={setEndReading}
              suffix="kWh"
            />
            <NumberField
              label="Price / unit"
              hint={currency.code}
              value={pricePerUnit}
              onChange={setPricePerUnit}
              prefix={currency.symbol}
              step={0.01}
              decimals
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <CalcCell label="Units used" value={`${used.toLocaleString()} kWh`} />
            <CalcCell label="Per unit" value={`${currency.symbol}${formatNumeric(pricePerUnit, currency, 2)}`} />
            <CalcCell label="Electricity total" value={formatMoney(cost, currency, { decimals: 2 })} accent />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Usage vs typical</span>
              <span className="tnum">{usagePct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${usagePct}%` }}
                transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
                className="h-full rounded-full bg-gradient-brand"
              />
            </div>
          </div>

          <div className="mt-4">
            <Sparkline data={room.history} gradientId={`detail-${room.id}`} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total due</span>
              <span className="text-base font-semibold tnum">{formatMoney(totalDue, currency, { decimals: 2 })}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveElectricityReading}
                disabled={savingElectricity}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/80 transition-all hover:bg-secondary disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingElectricity ? "Saving…" : "Save Reading"}
              </button>
              <button
                type="button"
                onClick={sendInvoice}
                disabled={!room.tenant}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
                  "bg-[#25D366] text-white shadow-soft hover:opacity-90",
                  !room.tenant && "cursor-not-allowed opacity-50",
                )}
                title={room.tenant ? `WhatsApp ${room.tenant.whatsapp_number ?? room.tenant.phone}` : "No tenant assigned"}
              >
                <Send className="h-3.5 w-3.5" />
                Send invoice via WhatsApp
                {room.tenant && (
                  <span className="ml-1 hidden rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                    {room.tenant.whatsapp_number ?? room.tenant.phone}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-xs font-semibold text-muted-foreground">This month</div>
          <div className="mt-4 space-y-3">
            <Row k="Rent"        v={<Money value={room.rent} />} />
            <Row k="Electricity" v={<Money value={cost} decimals={2} />} />
            <div className="hairline my-2" />
            <Row k="Total due"   v={<Money value={totalDue} decimals={2} />} bold />
          </div>
        </div>

        {/* Payment history */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold tracking-tight">Payment history</div>
              <div className="text-xs text-muted-foreground">Grouped by month, most recent first</div>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground/80 hover:bg-secondary"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="mt-4">
            <PaymentTimeline payments={roomPayments} />
          </div>
        </div>
      </div>

      {/* Past tenants */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="text-sm font-semibold tracking-tight">Past tenants</div>
        {room.pastTenants.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
            <div className="text-xs text-muted-foreground">No previous tenants on record.</div>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {room.pastTenants.map(t => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/85 text-background text-xs font-semibold">
                  {initials(t.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">Joined {t.joined_at}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddPaymentModal open={addOpen} onClose={() => setAddOpen(false)} defaultRoomId={room.id} />
      <AddTenantModal open={tenantOpen} onClose={() => setTenantOpen(false)} defaultRoomId={room.id} />
      <ElectricityBillingModal
        open={electricityOpen}
        onClose={() => setElectricityOpen(false)}
        defaultRoomId={room.id}
        onSaved={fetchData}
      />
    </div>
  );
}

function CalcCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl p-3", accent ? "bg-gradient-brand text-white" : "bg-secondary/50")}>
      <div className={cn("text-[10px] uppercase tracking-wider", accent ? "text-white/70" : "text-muted-foreground")}>{label}</div>
      <div className="mt-1 text-sm font-semibold tnum">{value}</div>
    </div>
  );
}

function NumberField({
  label, hint, value, onChange, prefix, suffix, step, decimals,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  decimals?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground tnum">{hint}</span>}
      </div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground tnum">{prefix}</span>}
        <input
          type="number" inputMode={decimals ? "decimal" : "numeric"}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step ?? 1} min={0}
          className={cn(
            "h-11 w-full rounded-xl border border-border bg-card/70 text-sm font-semibold tnum outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]",
            prefix ? "pl-7" : "pl-3.5",
            suffix ? "pr-12" : "pr-3.5",
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function InfoRow({ icon, k, v, mono }: { icon: React.ReactNode; k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {k}
      </span>
      <span className={cn("text-xs font-medium", mono && "font-mono")}>{v}</span>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? "text-foreground font-medium" : "text-muted-foreground"}`}>{k}</span>
      <span className={`tnum ${bold ? "text-base font-semibold" : "text-sm"}`}>{v}</span>
    </div>
  );
}
