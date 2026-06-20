import { nivasaApi } from "@/lib/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BellRing, CheckCircle2, IdCard, MessageCircle, Phone, Plus, Save, Send, UserPlus, UserMinus, Zap, Calendar, Banknote, Edit2, FileText, Wrench, ShieldAlert
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
import { EditTenantModal } from "@/components/EditTenantModal";
import { ElectricityBillingModal } from "@/components/ElectricityBillingModal";
import { TenantExpensesModal } from "@/components/TenantExpensesModal";
import { InvoiceGeneratorModal } from "@/components/InvoiceGeneratorModal";
import { PastInvoicesModal } from "@/components/PastInvoicesModal";
import { ReportIncidentModal } from "@/components/ReportIncidentModal";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { Money } from "@/components/Money";
import { type Room } from "@/lib/types";
import { buildTiersFromBaseAndPerAdditional, normalizeOccupancyTiers, type OccupancyPriceTier } from "@/lib/rentByOccupancy";
import { subscribeTenants } from "@/lib/tenantStore";
import { getTenantExpenses, getCustomExpenses } from "@/lib/expensesStore";
import { useCurrency, formatMoney, formatNumeric } from "@/lib/currency";
import { openWhatsApp } from "@/lib/whatsapp";
import { cn, calculateTenantShare, getTenantPaymentStatus } from "@/lib/utils";
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
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [electricityOpen, setElectricityOpen] = useState(false);
  const [expensesTenant, setExpensesTenant] = useState<any>(null);
  const [invoiceTenant, setInvoiceTenant] = useState<any>(null);
  const [incidentTenant, setIncidentTenant] = useState<any>(null);
  const [pastInvoicesRoomId, setPastInvoicesRoomId] = useState<string | null>(null);
  const [savingElectricity, setSavingElectricity] = useState(false);
  const [rentAmount, setRentAmount] = useState("");
  const [editCapacity, setEditCapacity] = useState("1");
  const [rentType, setRentType] = useState<"total" | "per_person">("total");
  const [pricingSaving, setPricingSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [roomPayments, setRoomPayments] = useState<any[]>([]);
  const [roomExpenses, setRoomExpenses] = useState<any[]>([]);
  const [tenantInvoices, setTenantInvoices] = useState<any[]>([]);
  const [paymentTenantId, setPaymentTenantId] = useState<string | undefined>();
  const [paymentDefaultAmount, setPaymentDefaultAmount] = useState<number | undefined>();

  const { currency } = useCurrency();

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!nivasaApi || !id) return;
      const data = await nivasaApi.getRoomById(id);
      if (data) {
        setRoom(data);
        setStartReading(data.prevReading);
        setEndReading(data.currReading);
        setPricePerUnit(data.ratePerUnit);
        setEditNameValue(data.number);
        setRentAmount(String(data.rent || ""));
        setEditCapacity(String(data.capacity || "1"));
        const tiers = data.occupancyPrices?.length ? data.occupancyPrices : [];
        if (tiers.length > 0) {
          // Check if it's a simple per-person pattern
          setRentType("per_person");
          setRentAmount(String(tiers[0].amount));
        } else {
          setRentType("total");
          setRentAmount(String(data.rent));
        }
      }
      await nivasaApi.ensureCurrentMonthInvoices();
      const [paymentsData, expensesData, invoicesData] = await Promise.all([
        nivasaApi.getRecentPayments(100),
        nivasaApi.getMaintenanceRequests(),
        nivasaApi.getTenantInvoices()
      ]);
      setRoomPayments(paymentsData.filter((p: any) => p.roomId === id));
      setRoomExpenses(expensesData.filter((e: any) => e.unit_id === id));
      setTenantInvoices(invoicesData.filter((i: any) => i.room_id === id));
    } catch (error) {
      console.error("Error fetching room details:", error);
      toast.error("Failed to load room details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    window.addEventListener("nivasa:refresh", handler);
    return () => window.removeEventListener("nivasa:refresh", handler);
  }, [id]);

  // Listen for global "Add payment" trigger.
  useEffect(() => {
    const h = () => setAddOpen(true);
    window.addEventListener("nivasa:add-payment", h);
    return () => window.removeEventListener("nivasa:add-payment", h);
  }, []);

  // Editable electricity readings (UI-only).
  const [startReading, setStartReading] = useState<number | string>("");
  const [endReading,   setEndReading]   = useState<number | string>("");
  const [pricePerUnit, setPricePerUnit] = useState<number | string>("");

  const saveElectricityReading = async () => {
    try {
      setSavingElectricity(true);
      if (!nivasaApi || !room) throw new Error("nivasaApi not loaded");
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await nivasaApi.saveElectricityReading({
        room_number: "Room Name / Number",
        month,
        prev_reading: Number(startReading) || 0,
        curr_reading: Number(endReading) || 0,
        rate_per_unit: Number(pricePerUnit) || 0,
      });
      toast.success("Meter reading saved", {
        description: `${used} units · ${formatMoney(cost, currency, { decimals: 2 })}`,
      });
      fetchData();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (err: any) {
      toast.error("Failed to save reading", { description: err.message });
    } finally {
      setSavingElectricity(false);
    }
  };

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

  const used = Math.max(0, (Number(endReading) || 0) - (Number(startReading) || 0));
  const cost = used * (Number(pricePerUnit) || 0);
  const totalDue = room.rent + cost;

  const handleSaveName = async () => {
    const val = editNameValue.trim();
    if (!val || !room) {
      setIsEditingName(false);
      return;
    }
    try {
            await nivasaApi.updateRoom(room.id, { number: val });
      toast.success("Room name updated");
      setIsEditingName(false);
      fetchData();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (err: any) {
      toast.error(err.message || "Failed to update room name");
    }
  };

  const handleSaveRentConfig = async () => {
    if (!room) return;
    const amt = parseFloat(rentAmount);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("Enter a valid rent amount.");
      return;
    }
    
    try {
      setPricingSaving(true);
      const updatedCapacity = parseInt(editCapacity) || 1;
      
      if (rentType === "per_person") {
        await nivasaApi.updateRoom(room.id, { 
          rent_amount: amt,
          capacity: updatedCapacity,
          occupancy_prices: buildTiersFromBaseAndPerAdditional(amt, amt, 10) 
        });
        toast.success("Rent configured per person");
      } else {
        await nivasaApi.updateRoom(room.id, { 
          rent_amount: amt, 
          capacity: updatedCapacity,
          occupancy_prices: null 
        });
        toast.success("Room configuration saved");
      }
      fetchData();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (err: any) {
      toast.error(err.message || "Failed to save rent configuration");
    } finally {
      setPricingSaving(false);
    }
  };

// Deprecated saveTenantOccupancy – removed in multi-tenant mode

  const usagePct = Math.min(100, Math.round((used / 250) * 100));

  const sendReminderAll = () => {
  if (!room.tenants || room.tenants.length === 0) {
    toast.error("No tenants to send reminder");
    return;
  }
  room.tenants.forEach(t => sendReminderToTenant(t));
};

  const sendReminderToTenant = (tenant: any) => {
    const phone = tenant.whatsapp_number || tenant.phone;
    if (phone) {
      openWhatsApp(phone, `Hi ${tenant.name ?? "tenant"}, a friendly reminder about the rent for Room ${room.number}. Thanks!`);
      toast.success("Reminder opened in WhatsApp");
    } else {
      toast.success("Reminder sent", { description: "No contact on file — SMS fallback." });
    }
  };

  const handleRemoveTenant = async (tenantId: string) => {
    const tenant = room.tenants?.find(t => t.id === tenantId);
    if (!tenant || !window.confirm(`Are you sure you want to remove ${tenant.name}? This will free a bed.`)) return;

    try {
      
      await nivasaApi.removeTenant(room.id, tenantId);
      toast.success("Tenant removed successfully");
      fetchData(); // Refresh data
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (error: any) {
      console.error("Error removing tenant:", error);
      toast.error(error.message || "Failed to remove tenant");
    }
  };

  // New helper to build invoice message for a specific tenant
  const buildInvoiceMessageForTenant = (tenant: any) => {
    const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    
    const activeExpenseIds = getTenantExpenses(tenant.id);
    const globalExpenses = getCustomExpenses();
    const activeExpenses = globalExpenses.filter(e => activeExpenseIds.includes(e.id));
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const invoicesForTenant = tenantInvoices.filter(i => i.tenant_id === tenant.id);
    const currentInvoice = invoicesForTenant.find(i => i.billing_month === currentMonthStr);
    
    const currentAddons = activeExpenses.reduce((sum: number, exp: any) => sum + exp.cost, 0);
    const currentBase = tenant.rent_amount ? Number(tenant.rent_amount) : calculateTenantShare(room!, tenant);
    
    let totalDueHistorical = invoicesForTenant.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
    if (!currentInvoice) {
      totalDueHistorical += (currentBase + currentAddons);
    }
    
    const allTenantPayments = roomPayments.filter(p => p.tenantId === tenant.id && p.status === "paid");
    const totalPaidHistorical = allTenantPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const tenantPaymentsThisMonth = roomPayments.filter(p => p.tenantId === tenant.id && String(p.date).startsWith(currentMonthStr) && p.status === "paid");
    const totalPaidThisMonth = tenantPaymentsThisMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const pastDueHistorical = totalDueHistorical - (currentInvoice ? Number(currentInvoice.total_amount) : (currentBase + currentAddons));
    const pastPaidHistorical = totalPaidHistorical - totalPaidThisMonth;
    const previousDues = pastDueHistorical - pastPaidHistorical;

    let totalAddons = 0;
    const addonLines: string[] = [];
    if (activeExpenses.length > 0) {
      addonLines.push(``, `*Add-ons:*`);
      activeExpenses.forEach(exp => {
        totalAddons += exp.cost;
        addonLines.push(`• ${exp.name}: ${formatMoney(exp.cost, currency, { decimals: 0 })}`);
      });
    }

    const baseRent = tenant.rent_amount ? Number(tenant.rent_amount) : room.rent;
    const finalTotal = baseRent + cost + totalAddons + previousDues;

    return [
      `*Nivasa · Invoice — ${monthLabel}*`,
      ``,
      `Hi ${tenant.name},`,
      `Here is your bill for Room ${room.number}${tenant.bed_assignment ? ` (Bed ${tenant.bed_assignment})` : ''}, ${room.buildingName}:`,
      ``,
      `• Rent: ${formatMoney(baseRent, currency, { decimals: 0 })}`,
      `• Electricity meter: ${startReading.toLocaleString()} → ${endReading.toLocaleString()} (${used} units)`,
      `• Rate / unit: ${currency.symbol}${formatNumeric(pricePerUnit, currency, 2)}`,
      `• Electricity total: ${formatMoney(cost, currency, { decimals: 2 })}`,
      ...addonLines,
      ...(previousDues > 0 ? [` `, `*Previous Dues:* ${formatMoney(previousDues, currency, { decimals: 0 })} (Unpaid from last month)`] : []),
      ``,
      `*Total due: ${formatMoney(finalTotal, currency, { decimals: 2 })}*`,
      ``,
      `Reply here if you have any questions. Thanks!`,
    ].join("\n");
  };

  return (
    <div>
      <Link to="/app/rooms" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to rooms
      </Link>

      <PageHeader
        title={
          isEditingName ? (
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                className="h-10 w-48 rounded-xl border border-border bg-card px-3 text-xl font-bold tracking-tight outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
              />
              <button onClick={handleSaveName} className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors">Save</button>
              <button onClick={() => setIsEditingName(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setEditNameValue(room.number); setIsEditingName(true); }}>
              <span>{room.number}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors" title="Edit Name">
                <Edit2 className="h-3.5 w-3.5" />
              </div>
            </div>
          )
        }
        subtitle={`${room.buildingName} · ${formatMoney(room.rent, currency, { decimals: 0 })} / month${
          room.occupancyPrices?.length ? " (by current billing occupancy)" : ""
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MagneticButton variant="ghost" onClick={sendReminderAll}>
              <BellRing className="h-4 w-4" /> Send reminder
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => setPastInvoicesRoomId(room.id)}>
              <FileText className="h-4 w-4" /> Past Invoices
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => setElectricityOpen(true)}>
              <Zap className="h-4 w-4" /> Enter Reading
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => navigate("/app/maintenance")}>
              <Wrench className="h-4 w-4" /> Maintenance
            </MagneticButton>
            <MagneticButton onClick={() => { setPaymentTenantId(undefined); setPaymentDefaultAmount(undefined); setAddOpen(true); }}>
              <Plus className="h-4 w-4" /> Add payment
            </MagneticButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tenants Section */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-muted-foreground">Tenants</div>
            <div className="text-xs text-muted-foreground">
              Filled: {room.tenants?.length ?? 0}/{room.capacity || 1}
            </div>
          </div>
          {room.tenants && room.tenants.length > 0 ? (
            <div className="space-y-4">
              {room.tenants.map((t) => {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const invoicesForTenant = tenantInvoices.filter(i => i.tenant_id === t.id);
                const currentInvoice = invoicesForTenant.find(i => i.billing_month === currentMonth);
                
                const tenantExpenseIds = getTenantExpenses(t.id);
                const activeExpenses = getCustomExpenses().filter((e: any) => tenantExpenseIds.includes(e.id));
                const currentAddons = activeExpenses.reduce((sum: number, exp: any) => sum + exp.cost, 0);
                const currentBase = t.rent_amount ? Number(t.rent_amount) : calculateTenantShare(room);
                const fallbackMonthlyDue = currentBase + currentAddons;
                
                // If the invoice hasn't generated yet or DB failed, assume they owe at least this month
                let totalDueHistorical = invoicesForTenant.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
                
                // Add the dynamic electricity cost for the current month
                totalDueHistorical += cost;
                
                // Add deposit amount to the total due
                totalDueHistorical += (t.depositAmount || 0);
                
                if (!currentInvoice) {
                  totalDueHistorical += fallbackMonthlyDue;
                }
                
                const allTenantPayments = roomPayments.filter(p => p.tenantId === t.id && p.status === "paid");
                const totalPaidHistorical = allTenantPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                
                const tenantPaymentsThisMonth = roomPayments.filter(p => p.tenantId === t.id && String(p.date).startsWith(currentMonth) && p.status === "paid");
                const totalPaidThisMonth = tenantPaymentsThisMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                
                const pastDueHistorical = totalDueHistorical - ((currentInvoice ? Number(currentInvoice.total_amount) : fallbackMonthlyDue) + cost);
                const pastPaidHistorical = totalPaidHistorical - totalPaidThisMonth;
                const carryForwardBalance = pastDueHistorical - pastPaidHistorical;
                
                const netBalance = totalDueHistorical - totalPaidHistorical;
                const remainingAmount = Math.max(0, netBalance);
                
                const monthlyDue = (currentInvoice ? Number(currentInvoice.total_amount) : fallbackMonthlyDue) + cost;
                const totalAddons = currentInvoice ? Number(currentInvoice.addons_total) : currentAddons;
                
                let displayStatus = getTenantPaymentStatus(t, roomPayments);
                let bgClass = "bg-secondary/60";
                
                if (netBalance <= 0) {
                  displayStatus = "paid";
                  bgClass = "bg-emerald-500/10 border border-emerald-500/20";
                } else if (totalPaidThisMonth > 0) {
                  displayStatus = "partial";
                  bgClass = "bg-blue-500/10 border border-blue-500/20";
                } else {
                  if (displayStatus === "late") bgClass = "bg-red-500/10 border border-red-500/20";
                  else bgClass = "bg-orange-500/10 border border-orange-500/20";
                }

                return (
                <div key={t.id} className={cn("rounded-xl p-3 flex flex-col gap-3 transition-colors", bgClass)}>
                  <div className="flex items-start justify-between gap-2">
                    <div 
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setEditingTenant(t)}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow">
                        {initials(t.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate flex items-center gap-2" title={t.name}>
                          {t.name}
                          <TrustScoreBadge aadhar={t.aadhar} />
                                 <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium">
                           {t.bed_assignment && <div className="text-brand dark:text-brand">Bed: <span className="font-semibold">{t.bed_assignment}</span></div>}
                           <div className="text-muted-foreground">This Month: <span className="text-foreground">{formatMoney(monthlyDue, currency, { decimals: 0 })}</span> {totalAddons > 0 && <span className="text-[10px] text-muted-foreground opacity-70">(inc. {formatMoney(totalAddons, currency, { decimals: 0 })} add-ons)</span>} {cost > 0 && <span className="text-[10px] text-muted-foreground opacity-70">(inc. {formatMoney(cost, currency, { decimals: 0 })} electricity)</span>}</div>
                           <div className="text-emerald-600 dark:text-emerald-500">Paid: <span className="font-semibold">{formatMoney(totalPaidHistorical, currency, { decimals: 0 })}</span></div>
                           {netBalance > 0 && (
                             <div className="text-red-600 dark:text-red-500">Net Remaining: <span className="font-bold">{formatMoney(netBalance, currency, { decimals: 0 })}</span></div>
                           )}
                           {netBalance < 0 && (
                             <div className="text-emerald-500 dark:text-emerald-400">Net Credit: <span className="font-bold">{formatMoney(Math.abs(netBalance), currency, { decimals: 0 })}</span></div>
                           )}
                           {(t.depositAmount || 0) > 0 && (
                             <div className="text-muted-foreground flex items-center gap-1">
                               Deposit: <span className={cn("font-semibold", totalPaidHistorical >= t.depositAmount ? "text-emerald-500 dark:text-emerald-400" : "text-orange-500 dark:text-orange-400")}>{totalPaidHistorical >= t.depositAmount ? "Paid" : "Pending"}</span>
                               <span className="text-[10px] text-muted-foreground opacity-70">({formatMoney(t.depositAmount, currency, { decimals: 0 })})</span>
                             </div>
                           )}
                         </div>
                       </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <Phone className="h-3 w-3 shrink-0" /> {t.phone}
                          </span>
                          {t.joined_at && <span className="flex items-center gap-1 shrink-0"><Calendar className="h-3 w-3" /> Joined: {new Date(t.joined_at).toLocaleDateString()}</span>}
                          {t.document_url ? (
                            <a href={t.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 shrink-0 text-brand hover:underline">
                              <FileText className="h-3 w-3" /> ID Document
                            </a>
                          ) : (
                            <span className="flex items-center gap-1 shrink-0 text-muted-foreground/60" title="No ID Document">
                              <FileText className="h-3 w-3" /> No Document
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setIncidentTenant(t)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-orange-500 hover:bg-orange-500/10 transition-colors"
                        title="Report Incident"
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => sendReminderToTenant(t)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground hover:bg-secondary transition-colors"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTenant(t.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove Tenant"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <a
                      href={`tel:${t.phone}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-background/50 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                    <button
                      type="button"
                      onClick={() => setExpensesTenant(t)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 py-1.5 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      <Banknote className="h-3.5 w-3.5" /> Add-ons
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceTenant(t)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-background/50 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" /> Invoice
                    </button>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                      onClick={() => { setPaymentTenantId(t.id); setPaymentDefaultAmount(remainingAmount); setAddOpen(true); }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pay ({currency.symbol}{remainingAmount.toFixed(0)})
                    </button>
                  </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No tenants assigned.</div>
          )}
          <div className="mt-4 flex justify-end">
            <MagneticButton variant="ghost" onClick={() => setTenantOpen(true)}>
              <UserPlus className="h-4 w-4" /> Add Tenant
            </MagneticButton>
          </div>
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
              {/* Legacy single-tenant invoice button removed – use per-tenant actions */}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="text-sm font-semibold tracking-tight">Rent Configuration</div>
        <div className="mt-0.5 text-xs text-muted-foreground mb-4">
          Set the rent amount, number of beds, and whether rent applies to the entire room or per person.
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Rent Amount</label>
            <input
              type="number" inputMode="decimal" step="any"
              placeholder="0.00"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Number of Beds</label>
            <input
              type="number" min="1"
              value={editCapacity}
              onChange={(e) => setEditCapacity(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Rent Type</label>
            <select
              value={rentType}
              onChange={(e) => setRentType(e.target.value as "total" | "per_person")}
              className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none appearance-none"
            >
              <option value="total">Total Rent</option>
              <option value="per_person">Per Person</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={handleSaveRentConfig}
              disabled={pricingSaving}
              className="h-[38px] w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-soft hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {pricingSaving ? "Saving…" : "Save configuration"}
            </button>
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
              onClick={() => { setPaymentTenantId(undefined); setPaymentDefaultAmount(undefined); setAddOpen(true); }}
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

      {/* Room Expenses / Maintenance */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold tracking-tight">Room Expenses & Maintenance</div>
            <div className="text-xs text-muted-foreground">Logged facility costs and maintenance requests</div>
          </div>
          <MagneticButton variant="ghost" onClick={() => navigate("/app/maintenance")}>
            <Wrench className="h-4 w-4" /> Manage
          </MagneticButton>
        </div>
        <div className="mt-4">
          {roomExpenses.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border-dashed border rounded-xl border-border">No expenses logged for this room.</div>
          ) : (
            <div className="space-y-3">
              {roomExpenses.map((exp: any) => (
                <div key={exp.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium text-sm">{exp.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">{exp.category || 'maintenance'} • {exp.status.replace("_", " ")}</div>
                  </div>
                  <div className="font-semibold text-sm">{formatMoney(exp.cost || 0, currency, { decimals: 0 })}</div>
                </div>
              ))}
            </div>
          )}
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
                  <div className="text-[11px] text-muted-foreground">
                    Joined: {t.joined_at ? new Date(t.joined_at).toLocaleDateString() : 'N/A'}
                    {t.leftAt && ` • Left: ${new Date(t.leftAt).toLocaleDateString()}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddPaymentModal open={addOpen} onClose={() => setAddOpen(false)} defaultRoomId={room.id} defaultTenantId={paymentTenantId} defaultAmount={paymentDefaultAmount} />
      <AddTenantModal open={tenantOpen} onClose={() => setTenantOpen(false)} defaultRoomId={room.id} />
      <EditTenantModal open={!!editingTenant} tenant={editingTenant} onClose={() => setEditingTenant(null)} onUpdated={fetchData} />
      <TenantExpensesModal open={!!expensesTenant} tenant={expensesTenant} onClose={() => setExpensesTenant(null)} />
      <InvoiceGeneratorModal 
        open={!!invoiceTenant} 
        tenant={invoiceTenant} 
        room={room} 
        roomPayments={roomPayments}
        electricityCost={cost}
        onClose={() => setInvoiceTenant(null)} 
      />
      <ReportIncidentModal
        open={!!incidentTenant}
        tenant={incidentTenant}
        buildingId={room.buildingId}
        onClose={() => setIncidentTenant(null)}
      />
      <PastInvoicesModal
        open={!!pastInvoicesRoomId}
        roomId={pastInvoicesRoomId || undefined}
        onClose={() => setPastInvoicesRoomId(null)}
      />
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
  value: number | string;
  onChange: (v: number | string) => void;
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
          type="number" inputMode="decimal"
          value={value === 0 && String(value) === "0" ? "" : value === "" ? "" : Number.isFinite(Number(value)) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
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
