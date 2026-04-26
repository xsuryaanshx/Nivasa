import { motion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useCurrency } from "@/lib/currency";

interface Props {
  label: string;
  value: number;
  icon: LucideIcon;
  /** When true, value is treated as a USD-base money amount and rendered with the active currency. */
  money?: boolean;
  suffix?: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, money, suffix, delta, trend = "up", delay = 0 }: Props) {
  const { currency } = useCurrency();
  // For money values we pre-apply the rate (so the count-up animation feels natural)
  // and only the symbol/locale formatting happens inside the formatter.
  const animatedValue = money ? value * currency.rate : value;
  const formatter = money
    ? (n: number) => `${currency.symbol}${new Intl.NumberFormat(currency.locale, { maximumFractionDigits: 0 }).format(n)}`
    : undefined;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-elev"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-foreground/80">
          <Icon className="h-4 w-4" />
        </div>
        {delta && (
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            trend === "up"   && "pill-paid",
            trend === "down" && "pill-late",
            trend === "flat" && "pill-info",
          )}>{delta}</span>
        )}
      </div>
      <div className="mt-5">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1.5 text-3xl font-semibold tracking-tight tnum">
          <AnimatedCounter value={animatedValue} suffix={suffix} format={formatter} />
        </div>
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-brand opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20" />
    </motion.div>
  );
}