import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Banknote, Check } from "lucide-react";
import { getCustomExpenses, getTenantExpenses, saveTenantExpenses, CustomExpense } from "@/lib/expensesStore";
import { useCurrency, formatMoney } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TenantExpensesModal({ tenant, open, onClose }: { tenant: any, open: boolean; onClose: () => void }) {
  const { currency } = useCurrency();
  const [globalExpenses, setGlobalExpenses] = useState<CustomExpense[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && tenant) {
      setGlobalExpenses(getCustomExpenses());
      setActiveIds(getTenantExpenses(tenant.id));
    }
  }, [open, tenant]);

  const handleToggle = (id: string) => {
    setActiveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (tenant) {
      saveTenantExpenses(tenant.id, activeIds);
      toast.success("Add-ons updated for " + tenant.name);
    }
    onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Banknote className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Add-on Expenses</p>
                    <p className="text-xs text-muted-foreground">{tenant?.name}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-2 max-h-[60vh] overflow-y-auto">
                {globalExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No global expenses defined. Go to Profile &gt; Expenses to add them.
                  </p>
                ) : (
                  globalExpenses.map(exp => {
                    const active = activeIds.includes(exp.id);
                    return (
                      <button
                        key={exp.id}
                        onClick={() => handleToggle(exp.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                          active
                            ? "border-brand bg-brand/5 shadow-soft"
                            : "border-border bg-secondary/30 hover:bg-secondary/60",
                        )}
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{exp.name}</p>
                          <p className="text-xs text-muted-foreground">{formatMoney(exp.cost, currency, { decimals: 0 })} / month</p>
                        </div>
                        {active && <Check className="h-4 w-4 text-brand shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border p-6 pt-4">
                <button
                  onClick={handleSave}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
