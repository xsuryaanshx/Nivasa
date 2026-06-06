import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { type Room } from "@/lib/mockData";

interface MarkPaidModalProps {
  open: boolean;
  onClose: () => void;
  room: Room | null;
}

export function MarkPaidModal({ open, onClose, room }: MarkPaidModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  
  useEffect(() => {
    if (open) setSelected([]);
  }, [open, room]);

  const handleConfirm = () => {
    if (selected.length === 0) {
      toast.error("Please select at least one tenant");
      return;
    }
    
    // In a real app, this would call the API to add a payment.
    // For now, simulate marking the selected tenants as paid.
    toast.success("Marked as paid for selected tenants");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && room && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-[60] mx-auto w-full max-w-sm px-4 pb-6 select-none"
          >
            <div className="overflow-hidden rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-elev">
              <div className="px-5 py-4 border-b border-border/50 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground">Select Tenants</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-2 max-h-[50vh] overflow-y-auto flex flex-col gap-1">
                {room.tenants?.map(t => (
                  <label key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors group">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-secondary/50 transition-colors group-hover:border-brand/50">
                       {selected.includes(t.id) && <Check className="h-3.5 w-3.5 text-brand" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selected.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(p => [...p, t.id]);
                        else setSelected(p => p.filter(id => id !== t.id));
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                  </label>
                ))}
              </div>
              <div className="p-4 border-t border-border/50">
                <button
                  onClick={handleConfirm}
                  disabled={selected.length === 0}
                  className="w-full h-10 rounded-xl bg-brand text-xs font-semibold text-white shadow-soft transition-opacity hover:opacity-90 disabled:opacity-55"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
