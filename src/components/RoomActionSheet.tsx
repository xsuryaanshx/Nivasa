import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2, X, AlertTriangle, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "./LanguageProvider";
import { type Room } from "@/lib/mockData";
import { nivasaApi } from "@/lib/api";

interface RoomActionSheetProps {
  open: boolean;
  onClose: () => void;
  room: Room;
  onSuccess?: () => void;
}

type ViewState = "menu" | "edit" | "delete_confirm";

export function RoomActionSheet({ open, onClose, room, onSuccess }: RoomActionSheetProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<ViewState>("menu");
  const [editName, setEditName] = useState(room.number);
  const [editRent, setEditRent] = useState(String(room.rent));
  const [submitting, setSubmitting] = useState(false);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Room number/name is required");
      return;
    }
    const rentAmount = parseFloat(editRent);
    if (isNaN(rentAmount) || rentAmount < 0) {
      toast.error("Valid rent amount is required");
      return;
    }

    try {
      setSubmitting(true);

      await nivasaApi.updateRoom(room.id, {
        number: editName.trim(),
        rent_amount: rentAmount,
      });

      toast.success(t("room_updated"));
      onSuccess?.();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update room");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);

      await nivasaApi.deleteRoom(room.id);

      toast.success(t("room_deleted"));
      onSuccess?.();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete room");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setView("menu");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm cursor-pointer"
          />

          {/* Action Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-sm px-4 pb-6 select-none"
          >
            <div className="space-y-3">
              {/* Group 1: Details & Actions */}
              <div className="overflow-hidden rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-elev">
                
                {/* Header */}
                <div className="px-5 py-4 text-center border-b border-border/50">
                  <h3 className="text-sm font-semibold text-foreground">{room.number}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{room.buildingName}</p>
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${
                      room.status === "occupied"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}>
                      {room.status}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-medium text-foreground">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(room.rent)}/mo
                    </span>
                  </div>
                </div>

                {/* View switcher */}
                <AnimatePresence mode="wait">
                  {view === "menu" && (
                    <motion.div
                      key="menu"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="divide-y divide-border/50"
                    >
                      <button
                        onClick={() => setView("edit")}
                        className="flex w-full items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-secondary/40 active:bg-secondary/60 transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                        {t("edit_room")}
                      </button>
                      <button
                        onClick={() => setView("delete_confirm")}
                        className="flex w-full items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        {t("delete_room")}
                      </button>
                    </motion.div>
                  )}

                  {view === "edit" && (
                    <motion.form
                      key="edit"
                      onSubmit={handleEditSubmit}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between pb-1">
                        <button
                          type="button"
                          onClick={() => setView("menu")}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </button>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Edit Details</span>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Room Number / Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-10 w-full rounded-xl border border-border bg-secondary/30 px-3.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Rent</label>
                          <input
                            type="number"
                            value={editRent}
                            onChange={(e) => setEditRent(e.target.value)}
                            className="h-10 w-full rounded-xl border border-border bg-secondary/30 px-3.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setView("menu")}
                          className="h-10 flex-1 rounded-xl border border-border bg-card text-xs font-medium transition-colors hover:bg-secondary/40 active:bg-secondary/60"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="h-10 flex-1 rounded-xl bg-brand text-xs font-semibold text-white shadow-soft transition-opacity hover:opacity-90 disabled:opacity-55 flex items-center justify-center gap-1.5"
                        >
                          <Save className="h-3.5 w-3.5" /> Save
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {view === "delete_confirm" && (
                    <motion.div
                      key="delete"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="p-5 space-y-4 text-center"
                    >
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">Delete Room {room.number}?</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t("delete_confirm_room")}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setView("menu")}
                          className="h-10 flex-1 rounded-xl border border-border bg-card text-xs font-medium transition-colors hover:bg-secondary/40 active:bg-secondary/60"
                        >
                          Go Back
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={submitting}
                          className="h-10 flex-1 rounded-xl bg-destructive text-xs font-semibold text-white shadow-soft transition-opacity hover:opacity-90 disabled:opacity-55"
                        >
                          {submitting ? "Deleting..." : "Delete Room"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Group 2: Cancel */}
              <button
                onClick={handleClose}
                className="flex w-full items-center justify-center rounded-2xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-elev py-3.5 text-sm font-semibold text-brand hover:bg-secondary/40 active:bg-secondary/60 transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
