import { nivasaApi } from "@/lib/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BellRing, CheckCircle2, IdCard, MessageCircle, Phone, Plus, Save, Send, UserPlus, UserMinus, Zap, Calendar, Banknote, Edit2, FileText, Wrench, ShieldAlert, FileSignature
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Sparkline } from "@/components/Sparkline";
import { PaymentTimeline } from "@/components/PaymentTimeline";
import { MagneticButton } from "@/components/MagneticButton";
import { showUndoToast } from "@/components/UndoToast";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { AddTenantModal } from "@/components/AddTenantModal";
import { EditTenantModal } from "@/components/EditTenantModal";
import { ElectricityBillingModal } from "@/components/ElectricityBillingModal";
import { TenantExpensesModal } from "@/components/TenantExpensesModal";
import { InvoiceGeneratorModal } from "@/components/InvoiceGeneratorModal";
import { PastInvoicesModal } from "@/components/PastInvoicesModal";
import { ReportIncidentModal } from "@/components/ReportIncidentModal";
import { MoveOutCalculatorModal } from "@/components/MoveOutCalculatorModal";
import { LeaseAgreementModal } from "@/components/LeaseAgreementModal";
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
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [optimisticDeletedPastTenants, setOptimisticDeletedPastTenants] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [electricityOpen, setElectricityOpen] = useState(false);
  const [expensesTenant, setExpensesTenant] = useState<any>(null);
  const [invoiceTenant, setInvoiceTenant] = useState<any>(null);
  const [incidentTenant, setIncidentTenant] = useState<any>(null);
  const [moveOutTenant, setMoveOutTenant] = useState<any>(null);
  const [leaseTenant, setLeaseTenant] = useState<any>(null);
  const [moveOutNetBalance, setMoveOutNetBalance] = useState(0);
  const [moveOutDepositPaid, setMoveOutDepositPaid] = useState(0);
  const [pastInvoicesRoomId, setPastInvoicesRoomId] = useState<string | null>(null);
  const [savingElectricity, setSavingElectricity] = useState(false);
  const [rentAmount, setRentAmount] = useState("");
  const [editCapacity, setEditCapacity] = useState("1");
  const [rentType, setRentType] = useState<"total" | "per_person">("total");
  const [pricingSaving, setPricingSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [editPhoneValue, setEditPhoneValue] = useState("");
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
        room_id: room.id,
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

  const handleSavePhone = async (tenantId: string) => {
    const val = editPhoneValue.trim();
    if (!val) {
      setEditingPhoneId(null);
      return;
    }
    try {
      await nivasaApi.updateTenant(tenantId, { phone: val });
      toast.success("Phone number updated");
      setEditingPhoneId(null);
      fetchData();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (err: any) {
      toast.error(err.message || "Failed to update phone number");
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

  const handleConfirmMoveOut = async (finalAmount: number, damages: number, notes: string) => {
    if (!room || !moveOutTenant) return;
    try {
      if (finalAmount > 0) {
        await (nivasaApi as any).saveMaintenanceRequest?.({
          property_id: room.buildingId,
          unit_id: room.id,
          title: `Refund Security Deposit - ${moveOutTenant.name}`,
          description: notes ? `Move-out settlement. Notes: ${notes}` : "Move-out settlement refund.",
          status: "resolved",
          priority: "medium",
          cost: finalAmount,
          category: "other",
        });
      } else if (finalAmount < 0) {
        await nivasaApi.addPayment({
          building_id: room.buildingId,
          room_id: room.id,
          tenant_id: moveOutTenant.id,
          amount: Math.abs(finalAmount),
          method: "Cash",
          status: "paid",
          date: new Date().toISOString().slice(0, 10),
          note: notes ? `Move-out dues. Notes: ${notes}` : "Move-out settlement dues.",
        });
      }

      await nivasaApi.removeTenant(room.id, moveOutTenant.id);
      
      const tenantToRestore = moveOutTenant;
      const roomId = room.id;
      showUndoToast(
        "Tenant moved out and settled",
        async () => {
          try {
            await nivasaApi.restoreTenant(roomId, tenantToRestore.id);
            toast.success("Successfully restored tenant!");
            fetchData();
            window.dispatchEvent(new CustomEvent("nivasa:refresh"));
          } catch (err) {
            toast.error("Failed to restore tenant");
          }
        }
      );
      
      setMoveOutTenant(null);
      fetchData();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (error: any) {
      console.error("Error moving out tenant:", error);
      toast.error(error.message || "Failed to process move-out");
      throw error;
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
      <Link 
        to={room.buildingId ? `/app/buildings/${room.buildingId}` : "/app/rooms"} 
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {room.buildingName && room.buildingName !== "Unknown" ? room.buildingName : "building"}
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
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <MagneticButton variant="ghost" onClick={sendReminderAll} className="flex-1 basis-[calc(50%-4px)] sm:flex-initial text-xs py-2 px-3 bg-secondary/50 text-foreground hover:bg-secondary justify-center">
              <BellRing className="h-3.5 w-3.5" /> Send reminder
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => setPastInvoicesRoomId(room.id)} className="flex-1 basis-[calc(50%-4px)] sm:flex-initial text-xs py-2 px-3 bg-secondary/50 text-foreground hover:bg-secondary justify-center">
              <FileText className="h-3.5 w-3.5" /> Past Invoices
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => setElectricityOpen(true)} className="flex-1 basis-[calc(50%-4px)] sm:flex-initial text-xs py-2 px-3 bg-secondary/50 text-foreground hover:bg-secondary justify-center">
              <Zap className="h-3.5 w-3.5" /> Enter Reading
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => navigate("/app/maintenance")} className="flex-1 basis-[calc(50%-4px)] sm:flex-initial text-xs py-2 px-3 bg-secondary/50 text-foreground hover:bg-secondary justify-center">
              <Wrench className="h-3.5 w-3.5" /> Maintenance
            </MagneticButton>
            <MagneticButton onClick={() => { setPaymentTenantId(undefined); setPaymentDefaultAmount(undefined); setAddOpen(true); }} className="w-full sm:w-auto text-xs py-2 px-3 justify-center">
              <Plus className="h-3.5 w-3.5" /> Add payment
            </MagneticButton>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tenants Section */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft">
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
                
                // Sum up historical invoices (base_rent + addons_total) and their electricity_cost column
                let totalDueHistorical = invoicesForTenant.reduce(
                  (sum, i) => sum + (Number(i.total_amount) || 0) + (Number(i.electricity_cost) || 0), 
                  0
                );
                
                // Add deposit amount to the total due
                totalDueHistorical += Number(t.depositAmount || 0);
                
                // If the invoice hasn't generated yet or DB failed, assume they owe at least this month (rent + addons + dynamic electricity cost)
                if (!currentInvoice) {
                  totalDueHistorical += fallbackMonthlyDue + cost;
                }
                
                const allTenantPayments = roomPayments.filter(p => p.tenantId === t.id && p.status === "paid");
                const totalPaidHistorical = allTenantPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                
                const tenantPaymentsThisMonth = roomPayments.filter(p => p.tenantId === t.id && String(p.date).startsWith(currentMonth) && p.status === "paid");
                const totalPaidThisMonth = tenantPaymentsThisMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                
                const currentMonthDue = currentInvoice 
                  ? (Number(currentInvoice.total_amount) || 0) + (Number(currentInvoice.electricity_cost) || 0)
                  : fallbackMonthlyDue + cost;
                const pastDueHistorical = totalDueHistorical - currentMonthDue;
                const pastPaidHistorical = totalPaidHistorical - totalPaidThisMonth;
                const carryForwardBalance = pastDueHistorical - pastPaidHistorical;
                
                const netBalance = totalDueHistorical - totalPaidHistorical;
                const remainingAmount = Math.max(0, netBalance);
                
                const monthlyDue = currentMonthDue;
                const totalAddons = currentInvoice ? Number(currentInvoice.addons_total) : currentAddons;
                
                let displayStatus = getTenantPaymentStatus(t, roomPayments);
                let bgClass = "bg-secondary/60";
                
                if (netBalance <= 0) {
                  displayStatus = "paid";
                  bgClass = "bg-emerald-500/10 border border-emerald-500/20 glow-paid";
                } else if (totalPaidThisMonth > 0) {
                  displayStatus = "partial";
                  bgClass = "bg-blue-500/10 border border-blue-500/20";
                } else {
                  if (displayStatus === "late") bgClass = "bg-red-500/10 border border-red-500/20 glow-late";
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
                        onClick={() => {
                          const isDepositPaid = 
                            (t.depositMethod && t.depositMethod !== "Pending") || 
                            allTenantPayments.some(p => p.note?.toLowerCase().includes("deposit"));
                          const depPaidAmount = isDepositPaid ? Number(t.depositAmount || 0) : 0;
                          const dues = Math.max(0, netBalance - (isDepositPaid ? 0 : Number(t.depositAmount || 0)));
                          setMoveOutDepositPaid(depPaidAmount);
                          setMoveOutNetBalance(dues);
                          setMoveOutTenant(t);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove Tenant"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-background/50 p-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70">This Month</span>
                      <span className="text-sm font-semibold">{formatMoney(monthlyDue, currency, { decimals: 0 })}</span>
                      {(totalAddons > 0 || cost > 0) && (
                        <span className="text-[9px] text-muted-foreground">
                          inc. {[totalAddons > 0 ? "add-ons" : "", cost > 0 ? "electricity" : ""].filter(Boolean).join(" & ")}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70">Paid</span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">{formatMoney(totalPaidHistorical, currency, { decimals: 0 })}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70">Net Balance</span>
                      <span className={cn("text-sm font-bold", netBalance > 0 ? "text-red-600 dark:text-red-500" : netBalance < 0 ? "text-emerald-500 dark:text-emerald-400" : "text-foreground")}>
                        {netBalance === 0 ? "₹0" : netBalance > 0 ? `${formatMoney(netBalance, currency, { decimals: 0 })} Due` : `${formatMoney(Math.abs(netBalance), currency, { decimals: 0 })} Credit`}
                      </span>
                    </div>
                    {t.depositAmount !== undefined && t.depositAmount !== null && (() => {
                      const isDepositPaid = 
                        (t.depositMethod && t.depositMethod !== "Pending") || 
                        allTenantPayments.some(p => p.note?.toLowerCase().includes("deposit"));
                      return (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/70">Deposit ({formatMoney(Number(t.depositAmount || 0), currency, { decimals: 0 })})</span>
                          <span className={cn("text-sm font-bold", isDepositPaid ? "text-emerald-500 dark:text-emerald-400" : "text-orange-500 dark:text-orange-400")}>
                            {isDepositPaid ? "Paid" : "Pending"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
                      {editingPhoneId === t.id ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <input
                            autoFocus
                            value={editPhoneValue}
                            onChange={(e) => setEditPhoneValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSavePhone(t.id);
                              if (e.key === "Escape") setEditingPhoneId(null);
                            }}
                            onBlur={() => handleSavePhone(t.id)}
                            className="h-5 w-24 rounded bg-background px-1 text-[11px] font-medium text-foreground outline-none border border-brand focus:ring-1 focus:ring-brand"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <span 
                          className="flex items-center gap-1 truncate cursor-pointer hover:text-brand transition-colors group" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditPhoneValue(t.phone || ""); 
                            setEditingPhoneId(t.id); 
                          }}
                          title="Click to edit phone number"
                        >
                          <Phone className="h-3 w-3 shrink-0" /> {t.phone || "No Phone"}
                          <Edit2 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      )}
                      {t.joined_at && <span className="flex items-center gap-1 shrink-0"><Calendar className="h-3 w-3" /> {new Date(t.joined_at).toLocaleDateString()}</span>}
                      {t.bed_assignment && <span className="flex items-center gap-1 shrink-0 text-brand font-medium">Bed: {t.bed_assignment}</span>}
                    </div>
                    {t.document_url ? (
                      <a href={t.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 shrink-0 text-brand hover:underline"><FileText className="h-3 w-3" /> ID</a>
                    ) : (
                      <span className="flex items-center gap-1 shrink-0 text-muted-foreground/60" title="No ID Document"><FileText className="h-3 w-3" /> No ID</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 sm:flex sm:flex-wrap sm:items-center">
                    <a
                      href={`tel:${t.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-background/50 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors w-full sm:w-auto"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const phone = t.whatsapp_number || t.phone;
                        if (!phone) {
                          toast.error("No phone number found for this tenant");
                          return;
                        }
                        const signupUrl = `${window.location.origin}/register`;
                        const msg = `Hi ${t.name},\n\nWelcome to Nivasa! Your landlord has added you to the system. You can now register and set up your login credentials to view your room details, invoices, and pay rent directly.\n\n👉 Sign up here: ${signupUrl}\n\n*Important:* Please register using your phone number (${phone}) as it is linked to your profile.\n\nThank you!`;
                        openWhatsApp(phone, msg);
                        toast.success("Opening WhatsApp invite...");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand/10 text-brand py-1.5 text-xs font-medium hover:bg-brand/20 transition-colors w-full sm:w-auto"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Invite
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpensesTenant(t)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 py-1.5 text-xs font-medium hover:bg-emerald-500/20 transition-colors w-full sm:w-auto"
                    >
                      <Banknote className="h-3.5 w-3.5" /> Add-ons
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceTenant(t)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-background/50 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors w-full sm:w-auto"
                    >
                      <Send className="h-3.5 w-3.5" /> Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaseTenant(t)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-background/50 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors w-full sm:w-auto"
                    >
                      <FileSignature className="h-3.5 w-3.5" /> Lease
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white w-full sm:w-auto"
                      onClick={() => { setPaymentTenantId(t.id); setPaymentDefaultAmount(remainingAmount); setAddOpen(true); }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pay <span className="hidden sm:inline">({currency.symbol}{remainingAmount.toFixed(0)})</span>
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
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Electricity billing</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Enter meter readings to calculate this month&apos;s bill.</div>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-foreground/80">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-3">
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

          <div className="mt-4 grid gap-3 grid-cols-3">
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

          <div className="mt-4 w-full min-w-0 overflow-hidden">
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

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-end">
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
        {room.pastTenants.filter(t => !optimisticDeletedPastTenants.has(t.id)).length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
            <div className="text-xs text-muted-foreground">No previous tenants on record.</div>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {room.pastTenants.filter(t => !optimisticDeletedPastTenants.has(t.id)).map(t => (
              <li key={t.id} className="flex flex-col gap-3 rounded-xl bg-secondary/50 p-3">
                <div className="flex items-center gap-3">
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
                </div>
                
                <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
                  <button
                    onClick={async () => {
                      try {
                        await nivasaApi.restoreTenant(room.id, t.id);
                        toast.success(`${t.name} has been restored to Room ${room.number}`);
                        fetchData();
                        window.dispatchEvent(new CustomEvent("nivasa:refresh"));
                      } catch (err: any) {
                        toast.error(err.message || "Failed to restore tenant");
                      }
                    }}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => {
                      setOptimisticDeletedPastTenants(prev => new Set([...prev, t.id]));
                      showUndoToast(
                        `Deleted ${t.name}`,
                        () => {
                          setOptimisticDeletedPastTenants(prev => {
                            const next = new Set(prev);
                            next.delete(t.id);
                            return next;
                          });
                        },
                        async () => {
                          try {
                            await nivasaApi.hardDeleteTenant(t.id);
                            toast.success("Tenant permanently deleted");
                            fetchData();
                          } catch (err: any) {
                            toast.error(err.message || "Failed to delete tenant");
                            setOptimisticDeletedPastTenants(prev => {
                              const next = new Set(prev);
                              next.delete(t.id);
                              return next;
                            });
                          }
                        }
                      );
                    }}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    Delete
                  </button>
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

      {moveOutTenant && room && (
        <MoveOutCalculatorModal
          open={!!moveOutTenant}
          onClose={() => setMoveOutTenant(null)}
          tenant={moveOutTenant}
          room={room}
          depositPaidAmount={moveOutDepositPaid}
          pendingDues={moveOutNetBalance}
          onConfirm={handleConfirmMoveOut}
        />
      )}

      {leaseTenant && room && (
        <LeaseAgreementModal
          open={!!leaseTenant}
          onClose={() => setLeaseTenant(null)}
          tenant={leaseTenant}
          room={room}
        />
      )}
    </div>
  );
}

function CalcCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl p-2.5 sm:p-3", accent ? "bg-gradient-brand text-white" : "bg-secondary/50")}>
      <div className={cn("text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight", accent ? "text-white/70" : "text-muted-foreground")}>{label}</div>
      <div className="mt-1 text-xs sm:text-sm font-semibold tnum">{value}</div>
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
      <div className="mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {hint && <span className="ml-1.5 text-[10px] text-muted-foreground/70 tnum">({hint})</span>}
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
