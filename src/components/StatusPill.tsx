import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";

const labels: Record<PaymentStatus, string> = { paid: "Paid", pending: "Pending", late: "Late" };

export function StatusPill({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status === "paid"    && "pill-paid",
        status === "pending" && "pill-pending",
        status === "late"    && "pill-late",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full",
        status === "paid"    && "bg-status-paid",
        status === "pending" && "bg-status-pending",
        status === "late"    && "bg-status-late",
      )} />
      {labels[status]}
    </span>
  );
}