import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
const insights: string[] = [
  "3 tenants have pending payments for 5+ days",
  "Room B-11 at Gokuldham Society has the highest electricity usage this month",
  "Revenue increased by 12% compared to last quarter",
  "Sunshine Apartments is 88% occupied — consider new listings",
  "Average payment delay dropped to 1.4 days",
];

export function InsightsPanel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(p => (p + 1) % insights.length), 4200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border glass p-5 shadow-soft">
      <div className="absolute inset-0 bg-gradient-aurora opacity-30" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/90 text-background">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-tight">Smart insights</span>
          <span className="ml-auto inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-status-info" />
        </div>
        <div className="mt-4 h-14 relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-base font-medium leading-snug tracking-tight"
            >
              {insights[i]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-3 flex gap-1.5">
          {insights.map((_, idx) => (
            <span key={idx}
              className={`h-1 rounded-full transition-all duration-500 ${idx === i ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/30"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}