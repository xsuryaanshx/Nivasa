import { nivasaApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { Loader2, FileText, Download, X } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { formatMoney } from "@/lib/currency";
import { useCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { type Invoice } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId?: string;
  roomId?: string;
}

export function PastInvoicesModal({ open, onClose, tenantId, roomId }: Props) {
  const { currency } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchInvoices = async () => {
        try {
          setLoading(true);
          const data = await nivasaApi.getInvoices({ tenantId, roomId });
          setInvoices(data);
        } catch (error) {
          toast.error("Failed to load past invoices");
        } finally {
          setLoading(false);
        }
      };
      fetchInvoices();
    }
  }, [open, tenantId, roomId]);

  return (
    <GlassModal open={open} onClose={onClose} title="Past Invoices">
      <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No past invoices found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-4 rounded-xl border border-border bg-background/50 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="font-medium">{inv.month_year}</div>
                  <div className="text-brand font-bold">{formatMoney(inv.total_due, currency)}</div>
                </div>
                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                  <div>Base Rent: {formatMoney(inv.base_rent, currency)}</div>
                  <div>Electricity: {formatMoney(inv.electricity_cost, currency)}</div>
                  {inv.previous_dues > 0 && <div>Previous Dues: {formatMoney(inv.previous_dues, currency)}</div>}
                  {inv.add_ons && inv.add_ons.length > 0 && (
                    <div className="col-span-2 mt-1">
                      Add-ons: {inv.add_ons.map((a: any) => `${a.name} (${formatMoney(a.cost, currency)})`).join(", ")}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
                  Generated on {new Date(inv.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
