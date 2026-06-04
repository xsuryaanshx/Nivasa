import { motion } from "framer-motion";
import { ReceiptIndianRupee, MessageCircle } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { Money } from "./Money";
import { useCurrency, formatMoney } from "@/lib/currency";
import { useMemo } from "react";
import type { Payment } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";
import { useLanguage } from "./LanguageProvider";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function monthKey(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface Props {
  payments: Payment[];
  dense?: boolean;
  /** Group by month with sub-totals (default true) */
  grouped?: boolean;
}

export function PaymentTimeline({ payments, dense = false, grouped = true }: Props) {
  const { currency } = useCurrency();
  const { t } = useLanguage();

  const groups = useMemo(() => {
    if (!grouped) return [{ key: "All", items: payments, total: payments.reduce((s, p) => s + p.amount, 0) }];
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      const k = monthKey(p.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      items: items.sort((a, b) => b.date.localeCompare(a.date)),
      total: items.reduce((s, p) => s + p.amount, 0),
    }));
  }, [payments, grouped]);

  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
        <div className="text-sm font-medium">{t("no_payments_yet")}</div>
        <div className="mt-1 text-xs text-muted-foreground">{t("payments_empty_hint")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          {grouped && (
            <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="inline-flex min-w-0 items-center gap-2">
                <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.key}</span>
                <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] tnum text-muted-foreground">{g.items.length}</span>
              </div>
              <span className="shrink-0 text-xs font-medium tnum">{formatMoney(g.total, currency)}</span>
            </div>
          )}
          <ol className="relative">
            <span className="absolute left-[7px] top-1 bottom-1 w-px bg-border" aria-hidden />
            {g.items.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.035, duration: 0.32 }}
                className={cn("group relative pl-7", dense ? "py-2.5" : "py-3.5")}
              >
                <span className={cn(
                  "absolute left-0 h-3.5 w-3.5 rounded-full ring-4 ring-card transition-transform group-hover:scale-110",
                  dense ? "top-3" : "top-4",
                  p.status === "paid"    && "bg-status-paid",
                  p.status === "pending" && "bg-status-pending",
                  p.status === "late"    && "bg-status-late",
                )} />
                <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.tenantName}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {fmtDate(p.date)} · {p.method}{p.note ? ` · ${p.note}` : ""}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {(p as any).tenantPhone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp((p as any).tenantWhatsapp || (p as any).tenantPhone, `Hi ${p.tenantName}, confirming ReceiptIndianRupee of your payment for ${formatMoney(p.amount, currency)}.`)}
                          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-border bg-card/70 px-2 text-[11px] font-medium text-[#25D366] opacity-100 transition-opacity hover:bg-[#25D366]/5 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </button>
                      )}
                      <StatusPill status={p.status} />
                    </div>
                    <div className="flex justify-end sm:contents">
                      <span className="shrink-0 text-sm font-semibold tnum tabular-nums">
                        <Money value={p.amount} />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
