import { nivasaApi } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import { CheckCircle2, FileText, Loader2, Calendar, Banknote, Zap, Plus, X } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { cn, calculateTenantShare } from "@/lib/utils";
import { toast } from "sonner";
import { useCurrency, formatMoney } from "@/lib/currency";
import { openWhatsApp } from "@/lib/whatsapp";
import { getTenantExpenses, getCustomExpenses } from "@/lib/expensesStore";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
  tenant: any;
  room: any;
  roomPayments: any[];
  electricityCost: number;
}

export function InvoiceGeneratorModal({ open, onClose, tenant, room, roomPayments, electricityCost }: Props) {
  const { currency } = useCurrency();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Month
  const [monthYear, setMonthYear] = useState(() => {
    const d = new Date();
    return `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
  });

  // Base rent & electricity
  const [baseRent, setBaseRent] = useState(0);
  const [elecCost, setElecCost] = useState(0);

  // Addons
  const [addons, setAddons] = useState<{ name: string; cost: number; checked: boolean }[]>([]);
  
  // Custom addon
  const [customAddonName, setCustomAddonName] = useState("");
  const [customAddonCost, setCustomAddonCost] = useState("");

  // Dues
  const [previousDues, setPreviousDues] = useState(0);

  // Fixed rent date
  const [fixedDate, setFixedDate] = useState<number | null>(null);

  useEffect(() => {
    if (open && tenant && room) {
      setSuccess(false);
      
      const share = calculateTenantShare(room, tenant);
      setBaseRent(share);
      setElecCost(electricityCost || 0);

      const activeExpenseIds = getTenantExpenses(tenant.id);
      const globalExpenses = getCustomExpenses();
      const loadedAddons = globalExpenses.map(e => ({
        name: e.name,
        cost: e.cost,
        checked: activeExpenseIds.includes(e.id)
      }));
      setAddons(loadedAddons);

      // Previous dues logic
      let dues = 0;
      if (tenant.joined_at) {
        const joinedDate = new Date(tenant.joined_at);
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (joinedDate < startOfCurrentMonth) {
          const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const paidPreviousMonth = roomPayments.some(p => {
            if (p.tenantId !== tenant.id) return false;
            if (p.status !== "paid") return false;
            const pDate = new Date(p.date);
            return pDate.getFullYear() === prevMonth.getFullYear() && pDate.getMonth() === prevMonth.getMonth();
          });
          if (!paidPreviousMonth) {
            dues = share;
          }
        }
      }
      setPreviousDues(dues);

      // Fetch user settings for fixed date
      nivasaApi.getUserSettings().then(settings => {
        if (settings?.rent_collection_date) {
          setFixedDate(settings.rent_collection_date);
        }
      }).catch(e => console.error("Could not fetch user settings", e));
    }
  }, [open, tenant, room, electricityCost, roomPayments]);

  const handleAddCustom = () => {
    if (!customAddonName.trim()) return;
    const c = parseFloat(customAddonCost);
    if (isNaN(c) || c < 0) return;
    setAddons(prev => [...prev, { name: customAddonName, cost: c, checked: true }]);
    setCustomAddonName("");
    setCustomAddonCost("");
  };

  const removeAddon = (index: number) => {
    setAddons(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAddon = (index: number) => {
    setAddons(prev => prev.map((a, i) => i === index ? { ...a, checked: !a.checked } : a));
  };

  const activeAddons = useMemo(() => addons.filter(a => a.checked), [addons]);
  const totalAddons = activeAddons.reduce((acc, a) => acc + a.cost, 0);
  const totalDue = baseRent + elecCost + totalAddons + previousDues;

  const handleGenerate = async () => {
    try {
      setSubmitting(true);
      const invoiceData = {
        tenant_id: tenant.id,
        room_id: room.id,
        month_year: monthYear,
        base_rent: baseRent,
        electricity_cost: elecCost,
        add_ons: activeAddons.map(a => ({ name: a.name, cost: a.cost })),
        previous_dues: previousDues,
        total_due: totalDue
      };
      await nivasaApi.createInvoice(invoiceData);
      
      // WhatsApp message
      const addonLines = activeAddons.map(a => `• ${a.name}: ${formatMoney(a.cost, currency, { decimals: 0 })}`);
      const upiId = user?.upiId;
      const upiUrl = upiId
        ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user.fullName)}&am=${totalDue.toFixed(2)}&tn=${encodeURIComponent(monthYear.replace(/\s+/g, '_'))}&cu=INR`
        : "";

      const lines = [
        `*Nivasa · Invoice — ${monthYear}*`,
        ``,
        `Hi ${tenant.name},`,
        `Here is your bill for Room ${room.number}, ${room.buildingName}:`,
        ``,
        `• Rent: ${formatMoney(baseRent, currency, { decimals: 0 })}`,
        `• Electricity total: ${formatMoney(elecCost, currency, { decimals: 2 })}`,
        ...addonLines,
        ...(previousDues > 0 ? [` `, `*Previous Dues:* ${formatMoney(previousDues, currency, { decimals: 0 })} (Unpaid from last month)`] : []),
        ``,
        `*Total due: ${formatMoney(totalDue, currency, { decimals: 2 })}*`,
        ...(upiId ? [``, `⚡ Pay instantly using this secure UPI link:`, upiUrl] : [])
      ];

      if (fixedDate) {
        lines.push(``, `Please submit the rent by the ${fixedDate}th of this month.`);
      }

      lines.push(``, `Reply here if you have any questions. Thanks!`);

      const phone = tenant.whatsapp_number || tenant.phone;
      if (phone) {
        openWhatsApp(phone, lines.join("\n"));
        toast.success("Invoice generated & WhatsApp opened");
      } else {
        toast.success("Invoice saved (No WhatsApp number found)");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <GlassModal open={open} onClose={onClose}>
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="rounded-full bg-green-500/10 p-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold">Invoice Generated</h2>
          <p className="text-sm text-muted-foreground">The invoice was successfully recorded.</p>
        </div>
      </GlassModal>
    );
  }

  return (
    <GlassModal open={open} onClose={onClose} title="Generate Invoice">
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Billing Month
            </label>
            <input
              type="text"
              value={monthYear}
              onChange={e => setMonthYear(e.target.value)}
              className="w-full rounded-xl bg-background/50 px-4 py-3 text-sm border border-border focus:border-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5" /> Base Rent
              </label>
              <input
                type="number"
                value={baseRent}
                onChange={e => setBaseRent(Number(e.target.value))}
                className="w-full rounded-xl bg-background/50 px-4 py-3 text-sm border border-border focus:border-brand focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Electricity Cost
              </label>
              <input
                type="number"
                value={elecCost}
                onChange={e => setElecCost(Number(e.target.value))}
                className="w-full rounded-xl bg-background/50 px-4 py-3 text-sm border border-border focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Previous Dues</label>
            <input
              type="number"
              value={previousDues}
              onChange={e => setPreviousDues(Number(e.target.value))}
              className="w-full rounded-xl bg-background/50 px-4 py-3 text-sm border border-border focus:border-brand focus:outline-none"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground">Add-ons & Expenses</label>
            {addons.map((addon, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={addon.checked}
                  onChange={() => toggleAddon(idx)}
                  className="rounded border-border bg-background"
                />
                <span className="text-sm flex-1">{addon.name}</span>
                <span className="text-sm font-medium">{formatMoney(addon.cost, currency)}</span>
                <button onClick={() => removeAddon(idx)} className="text-muted-foreground hover:text-red-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Custom addon"
                value={customAddonName}
                onChange={e => setCustomAddonName(e.target.value)}
                className="flex-1 rounded-lg bg-background/50 px-3 py-2 text-xs border border-border"
              />
              <input
                type="number"
                placeholder="Amount"
                value={customAddonCost}
                onChange={e => setCustomAddonCost(e.target.value)}
                className="w-24 rounded-lg bg-background/50 px-3 py-2 text-xs border border-border"
              />
              <button onClick={handleAddCustom} className="p-2 bg-brand/10 text-brand rounded-lg hover:bg-brand/20">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-brand/5 rounded-xl p-4 border border-brand/10">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-muted-foreground">Total Due</span>
            <span className="text-lg font-bold text-brand">{formatMoney(totalDue, currency)}</span>
          </div>
          {fixedDate && (
            <div className="text-xs text-muted-foreground mt-2">
              Note: Rent collection is fixed for the {fixedDate}th of the month.
            </div>
          )}
        </div>

        {(() => {
          const upiId = user?.upiId;
          const upiUrl = upiId
            ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user.fullName)}&am=${totalDue.toFixed(2)}&tn=${encodeURIComponent(monthYear.replace(/\s+/g, '_'))}&cu=INR`
            : "";
          if (!upiId) return null;
          return (
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/50 space-y-3">
              <div className="relative p-2 bg-white rounded-lg border border-border shadow-soft flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUrl)}`}
                  alt="UPI QR Code"
                  className="h-36 w-36"
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-foreground">Scan QR to pay exactly {formatMoney(totalDue, currency)}</p>
                <p className="text-[9px] text-muted-foreground tracking-wide font-mono mt-0.5 truncate max-w-xs">{upiId}</p>
              </div>
            </div>
          );
        })()}

        <div className="flex gap-3">
          <MagneticButton
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </MagneticButton>
          <MagneticButton
            className="flex-1"
            onClick={handleGenerate}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Send"}
          </MagneticButton>
        </div>
      </div>
    </GlassModal>
  );
}
