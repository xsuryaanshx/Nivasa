import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { nivasaApi } from "@/lib/api";
import { Check, X, ShieldAlert, Image as ImageIcon, Calendar, IndianRupee, Hash, Loader2 } from "lucide-react";
import { useCurrency, formatMoney } from "@/lib/currency";

interface Props {
  open: boolean;
  onClose: () => void;
  payment: any;
  onSuccess: () => void;
}

export function VerifyPaymentModal({ open, onClose, payment, onSuccess }: Props) {
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (open) {
      setImgError(false);
    }
  }, [open, payment]);

  if (!payment) return null;

  const extractReceiptUrl = (note?: string) => {
    if (!note) return null;
    const match = note.match(/(https?:\/\/[^\s]+)/);
    return match ? match[0] : null;
  };

  const getFraudWarning = (note?: string) => {
    if (!note) return null;
    const match = note.match(/\[⚠️ (FRAUD WARNING:[^\]]+)\]/);
    return match ? match[1] : null;
  };

  const receiptUrl = extractReceiptUrl(payment.note);
  const fraudWarning = getFraudWarning(payment.note);

  // Clean the display note (remove the warning brackets and direct URL for a clean display note)
  const getCleanNote = (note?: string) => {
    if (!note) return "";
    let clean = note;
    clean = clean.replace(/\[⚠️ FRAUD WARNING:[^\]]+\]\s*/, "");
    clean = clean.replace(/Receipt:\s*https?:\/\/[^\s]+/, "");
    return clean.trim();
  };

  const cleanNote = getCleanNote(payment.note);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await nivasaApi.updatePaymentStatus(payment.id, "paid");
      toast.success("Payment receipt verified and approved!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Approve failed:", error);
      toast.error("Failed to approve payment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const confirmReject = window.confirm(
      "Are you sure you want to reject and delete this payment record? The tenant will be notified that their rent is still unpaid."
    );
    if (!confirmReject) return;

    setLoading(true);
    try {
      await nivasaApi.deletePayment(payment.id);
      toast.success("Payment receipt rejected and record deleted.");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Reject failed:", error);
      toast.error("Failed to delete record: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden flex flex-col max-h-[90vh] p-0 rounded-2xl border border-border bg-card shadow-float">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            Verify Tenant Payment
            {payment.status === "pending" ? (
              <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-amber-500/20 rounded-full text-[10px] font-semibold py-0.5">
                Pending Verification
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border-emerald-500/20 rounded-full text-[10px] font-semibold py-0.5">
                Verified
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Fraud warning block */}
          {fraudWarning && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-destructive font-semibold shadow-sm animate-pulse">
              <ShieldAlert className="h-4.5 w-4.5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">Caution: Manual Modification Detected</p>
                <p className="mt-0.5 opacity-90">{fraudWarning}</p>
              </div>
            </div>
          )}

          {/* Payment metadata grid */}
          <div className="grid grid-cols-2 gap-3.5 bg-secondary/20 p-4 rounded-xl border">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Tenant</span>
              <span className="text-sm font-bold text-foreground">{payment.tenantName}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Room</span>
              <span className="text-sm font-bold text-foreground">Room {payment.roomNumber || "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Amount Claimed</span>
              <span className="text-sm font-extrabold text-foreground flex items-center gap-0.5">
                {formatMoney(payment.amount, currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Payment Date</span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {payment.date ? payment.date.split("T")[0] : "N/A"}
              </span>
            </div>
            {payment.reference && (
              <div className="col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Transaction Reference / UTR</span>
                <span className="text-xs font-bold text-foreground flex items-center gap-1 select-all font-mono bg-card px-2 py-1 rounded border mt-0.5 w-fit">
                  <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                  {payment.reference}
                </span>
              </div>
            )}
            {cleanNote && (
              <div className="col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Note</span>
                <span className="text-xs text-muted-foreground block mt-0.5 italic">"{cleanNote}"</span>
              </div>
            )}
          </div>

          {/* Receipt Screenshot Viewer */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Uploaded Receipt Screenshot</span>
            {receiptUrl ? (
              imgError ? (
                <div className="h-44 rounded-xl border border-dashed flex flex-col items-center justify-center text-center p-6 text-muted-foreground bg-secondary/10">
                  <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-xs font-semibold">Image failed to load</p>
                  <p className="text-[10px] mt-0.5">You can view it directly: <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline">Open Image Link</a></p>
                </div>
              ) : (
                <div className="relative rounded-xl border overflow-hidden bg-black/5 hover:bg-black/10 transition-colors flex items-center justify-center min-h-[220px]">
                  <img
                    src={receiptUrl}
                    alt="Payment Receipt Screenshot"
                    className="max-h-[300px] w-auto max-w-full object-contain mx-auto transition-transform duration-300 hover:scale-105"
                    onError={() => setImgError(true)}
                  />
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 bg-black/75 hover:bg-black text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm"
                  >
                    Open Full Image
                  </a>
                </div>
              )
            ) : (
              <div className="h-32 rounded-xl border border-dashed flex flex-col items-center justify-center text-center p-6 text-muted-foreground bg-secondary/10">
                <ImageIcon className="h-8 w-8 mb-1.5 opacity-50" />
                <p className="text-xs font-medium">No receipt image uploaded for this cash/bank payment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Verification Action Buttons */}
        {payment.status === "pending" && (
          <div className="p-4 border-t bg-secondary/20 flex gap-2 shrink-0">
            <Button
              onClick={handleReject}
              disabled={loading}
              variant="destructive"
              className="flex-1 rounded-xl h-11 font-bold text-xs gap-1.5"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Reject & Delete
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-bold text-xs gap-1.5 shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Approve Payment
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
