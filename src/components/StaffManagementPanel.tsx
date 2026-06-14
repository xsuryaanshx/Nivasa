import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { Users, X, Plus, Building2, Trash2, Edit2, ShieldCheck, Check } from "lucide-react";
import { nivasaApi } from "@/lib/api";
import { useLanguage } from "./LanguageProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import type { Staff, Building } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function StaffManagementPanel({ open, onClose }: Props) {
  const { t } = useLanguage();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const { limits } = useSubscriptionData();
  const hasAccess = !!limits.features.staff_management?.enabled;

  const [isAdding, setIsAdding] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Maid");
  const [phone, setPhone] = useState("");
  const [allocatedBuildings, setAllocatedBuildings] = useState<string[]>([]);

  useEffect(() => {
    if (open && hasAccess) {
      fetchData();
    }
  }, [open, hasAccess]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sData, bData] = await Promise.all([
        nivasaApi.getStaff(),
        nivasaApi.getBuildings()
      ]);
      setStaff(sData);
      setBuildings(bData);
    } catch (e) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    try {
      if (editingStaff) {
        await nivasaApi.updateStaff(editingStaff.id, { name, role, phone, allocatedBuildings });
        toast.success("Staff updated");
      } else {
        await nivasaApi.addStaff({ name, role, phone, allocatedBuildings });
        toast.success("Staff added");
      }
      setIsAdding(false);
      setEditingStaff(null);
      setName("");
      setRole("Maid");
      setPhone("");
      setAllocatedBuildings([]);
      fetchData();
    } catch (e) {
      toast.error("Failed to save staff");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    try {
      await nivasaApi.removeStaff(id);
      toast.success("Staff removed");
      fetchData();
    } catch (e) {
      toast.error("Failed to remove staff");
    }
  };

  const toggleBuilding = (bId: string) => {
    setAllocatedBuildings(prev => 
      prev.includes(bId) ? prev.filter(id => id !== bId) : [...prev, bId]
    );
  };

  const openEdit = (s: Staff) => {
    setEditingStaff(s);
    setName(s.name);
    setRole(s.role);
    setPhone(s.phone || "");
    setAllocatedBuildings(s.allocatedBuildings);
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingStaff(null);
    setName("");
    setRole("Maid");
    setPhone("");
    setAllocatedBuildings([]);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                    <Users className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Staff Management</p>
                    <p className="text-xs text-muted-foreground">Manage your property staff</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!hasAccess ? (
                <div className="flex flex-col items-center justify-center p-10 text-center">
                  <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="mb-2 font-semibold">Premium Feature</p>
                  <p className="mb-6 text-sm text-muted-foreground">Upgrade to Pro to manage staff and allocations.</p>
                  <button onClick={onClose} className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:opacity-90">
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6">
                  {isAdding ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                          placeholder="e.g. Ramesh"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Role</label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                        >
                          <option value="Maid">Maid</option>
                          <option value="Security">Security Guard</option>
                          <option value="Manager">Manager</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Phone (Optional)</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                          placeholder="Phone number"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Assigned Buildings</label>
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-border p-2 space-y-1">
                          {buildings.map(b => (
                            <label key={b.id} className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded-lg cursor-pointer" onClick={(e) => {e.preventDefault(); toggleBuilding(b.id);}}>
                              <div className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-md border",
                                allocatedBuildings.includes(b.id) ? "bg-brand border-brand" : "border-muted-foreground/30"
                              )}>
                                {allocatedBuildings.includes(b.id) && <Check className="h-3.5 w-3.5 text-white" />}
                              </div>
                              <span className="text-sm font-medium">{b.name}</span>
                            </label>
                          ))}
                          {buildings.length === 0 && <p className="text-xs text-muted-foreground p-2">No buildings found.</p>}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={closeForm}
                          className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-brand/90"
                        >
                          {editingStaff ? "Update Staff" : "Add Staff"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Your Staff</h3>
                        <button
                          onClick={() => setIsAdding(true)}
                          className="flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add New
                        </button>
                      </div>

                      {loading ? (
                        <div className="flex h-32 items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                        </div>
                      ) : staff.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-center">
                          <Users className="mb-2 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm font-medium text-muted-foreground">No staff added yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {staff.map((s) => (
                            <div key={s.id} className="group relative flex flex-col gap-2 rounded-xl border border-border bg-secondary/30 p-4 transition-all hover:border-brand/30 hover:bg-secondary/60">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold text-foreground flex items-center gap-2">
                                    {s.name}
                                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground border border-border/50">
                                      {s.role}
                                    </span>
                                  </p>
                                  {s.phone && <p className="mt-0.5 text-xs text-muted-foreground">{s.phone}</p>}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button onClick={() => openEdit(s)} className="p-1.5 text-muted-foreground hover:text-foreground">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete(s.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {s.allocatedBuildings.length > 0 ? (
                                  s.allocatedBuildings.map(bid => {
                                    const b = buildings.find(b => b.id === bid);
                                    return b ? (
                                      <span key={bid} className="flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border/50">
                                        <Building2 className="h-2.5 w-2.5" />
                                        {b.name}
                                      </span>
                                    ) : null;
                                  })
                                ) : (
                                  <span className="text-[11px] italic text-muted-foreground">No buildings assigned</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
