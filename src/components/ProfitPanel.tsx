import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X, TrendingUp, IndianRupee, Wrench, Building2, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { nivasaApi } from "@/lib/api";
import { useCurrency, formatMoney } from "@/lib/currency";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProfitPanel({ open, onClose }: Props) {
  const { currency } = useCurrency();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["profitStats"],
    queryFn: nivasaApi.getProfitStats,
    enabled: open,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Profit & Expenses</h2>
                  <p className="text-xs text-muted-foreground">Overall financial summary</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* Revenue Card */}
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5 shadow-sm">
                    <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                      <IndianRupee className="h-5 w-5" />
                      <h3 className="text-sm font-semibold">Total Revenue (Paid)</h3>
                    </div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                      {formatMoney(stats?.totalRevenue || 0, currency, { decimals: 0 })}
                    </div>
                  </div>

                  {/* Expenses Card */}
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                        <Wrench className="h-5 w-5" />
                        <h3 className="text-sm font-semibold">Total Expenses</h3>
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                      {formatMoney(stats?.totalExpenses || 0, currency, { decimals: 0 })}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><Wrench className="h-4 w-4" /> Maintenance</span>
                        <span className="font-medium text-foreground">{formatMoney(stats?.totalMaintenance || 0, currency, { decimals: 0 })}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" /> Staff Salaries</span>
                        <span className="font-medium text-foreground">{formatMoney(stats?.totalStaffSalaries || 0, currency, { decimals: 0 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Profit Card */}
                  <div className="rounded-2xl border-2 border-brand/20 bg-brand/5 p-6 shadow-sm">
                    <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Net Profit
                    </div>
                    <div className="mt-2 text-4xl font-extrabold tracking-tight text-brand">
                      {formatMoney(stats?.netProfit || 0, currency, { decimals: 0 })}
                    </div>
                  </div>

                  {/* Building-wise Breakdown */}
                  {stats?.buildingProfits && stats.buildingProfits.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Profit by Building
                      </h3>
                      <div className="space-y-3">
                        {stats.buildingProfits.map((b: any) => (
                          <div key={b.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <h4 className="font-semibold text-foreground mb-3">{b.name}</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Revenue</span>
                                <span className="text-emerald-500 font-medium">{formatMoney(b.revenue || 0, currency, { decimals: 0 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Expenses</span>
                                <span className="text-rose-500 font-medium">{formatMoney(b.expenses || 0, currency, { decimals: 0 })}</span>
                              </div>
                              <div className="flex justify-between border-t border-border pt-2 mt-2 font-semibold">
                                <span>Net Profit</span>
                                <span className={b.netProfit >= 0 ? "text-brand" : "text-rose-500"}>
                                  {formatMoney(b.netProfit || 0, currency, { decimals: 0 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
