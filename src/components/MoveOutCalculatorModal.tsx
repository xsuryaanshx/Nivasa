import { useState } from "react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { useCurrency } from "@/lib/currency";
import { Banknote, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  tenant: any;
  room: any;
  depositPaidAmount: number;
  pendingDues: number;
  onConfirm: (finalAmount: number, damages: number, notes: string) => Promise<void>;
}

export function MoveOutCalculatorModal({ open, onClose, tenant, room, depositPaidAmount, pendingDues, onConfirm }: Props) {
  const { currency } = useCurrency();
  const [damages, setDamages] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!tenant || !room) return null;

  const damagesAmount = Number(damages) || 0;
  
  // Final amount = (Deposit Paid) - (Pending Dues) - (Damages)
  const finalAmount = depositPaidAmount - pendingDues - damagesAmount;
  const isRefund = finalAmount > 0;
  const isOwed = finalAmount < 0;
  const absoluteFinal = Math.abs(finalAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onConfirm(finalAmount, damagesAmount, notes);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setDamages("");
        setNotes("");
      }, 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassModal open={open} onClose={onClose} title="Move-Out Settlement" description={`Calculate final settlement for ${tenant.name}`}>
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
          <div className="text-base font-semibold">Tenant Removed</div>
          <div className="text-xs text-muted-foreground">Settlement recorded</div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Security Deposit (Paid)</span>
              <span className="font-medium text-emerald-500">+{currency.symbol}{depositPaidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending Rent & Utilities</span>
              <span className="font-medium text-red-500">-{currency.symbol}{pendingDues.toFixed(2)}</span>
            </div>
          </div>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Room Damages Deduction</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground tnum">
                {currency.symbol}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={damages}
                onChange={e => setDamages(e.target.value)}
                placeholder="0"
                className="h-11 w-full rounded-xl border border-border bg-card/70 pl-8 pr-3 text-base font-semibold tnum outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
            </div>
          </label>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Notes (Optional)</span>
            </div>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. wall painting deduction"
                className="h-11 w-full rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
            </div>
          </label>

          <div className={cn("flex flex-col rounded-xl border p-4", isRefund ? "border-emerald-500/20 bg-emerald-500/5" : isOwed ? "border-red-500/20 bg-red-500/5" : "border-border bg-secondary/50")}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isRefund ? "Refund to Tenant" : isOwed ? "Tenant Owes You" : "Settled (No Dues)"}
              </span>
              <span className={cn("text-xl font-bold tnum", isRefund ? "text-emerald-600 dark:text-emerald-500" : isOwed ? "text-red-600 dark:text-red-500" : "text-foreground")}>
                {currency.symbol}{absoluteFinal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose} disabled={submitting}
              className="h-11 flex-1 rounded-xl border border-border bg-card/60 text-sm font-medium transition-colors hover:bg-card disabled:opacity-50"
            >
              Cancel
            </button>
            <MagneticButton type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Processing..." : "Confirm Move-Out"}
            </MagneticButton>
          </div>
        </form>
      )}
    </GlassModal>
  );
}
