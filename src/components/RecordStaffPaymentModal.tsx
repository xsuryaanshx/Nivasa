import { useState } from "react";
import { X, Calendar, IndianRupee } from "lucide-react";
import { nivasaApi } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function RecordStaffPaymentModal({ 
  open, 
  onClose, 
  staffId,
  onSuccess 
}: { 
  open: boolean; 
  onClose: () => void;
  staffId: string;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: ""
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await nivasaApi.addStaffPayment({
        staff_id: staffId,
        amount: Number(formData.amount),
        payment_date: formData.payment_date,
        notes: formData.notes
      });
      toast.success("Payment recorded successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
            <h2 className="text-lg font-bold">Record Payment</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={e => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand min-h-[80px]"
                  placeholder="e.g. October Salary, Bonus, etc."
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Record"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
