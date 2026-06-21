import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="mb-7 flex flex-col gap-4 w-full max-w-full overflow-hidden sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground break-words">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  );
}