import { useState, useEffect } from "react";
import { X, UserPlus, Phone, Briefcase, IndianRupee, Calendar } from "lucide-react";
import { nivasaApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddStaffModal({ open, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "Maid",
    phone: "",
    monthly_salary: "",
    join_date: new Date().toISOString().split("T")[0],
    status: "active",
    building_ids: [] as string[],
  });

  const { data: buildings } = useQuery({
    queryKey: ["buildings"],
    queryFn: nivasaApi.getBuildings,
  });

  // Handle custom event listener
  useEffect(() => {
    const handleAddStaffEvent = () => {
      // Used if we want to open it externally
    };
    window.addEventListener("nivasa:add-staff", handleAddStaffEvent);
    return () => window.removeEventListener("nivasa:add-staff", handleAddStaffEvent);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Staff name is required");
    if (!formData.role.trim()) return toast.error("Role is required");
    
    const salary = parseFloat(formData.monthly_salary);
    if (isNaN(salary) || salary < 0) return toast.error("Valid monthly salary is required");
    if (formData.building_ids.length === 0) return toast.error("Please assign at least one building");

    try {
      setSubmitting(true);
      await nivasaApi.addStaff({
        ...formData,
        monthly_salary: salary,
        allocatedBuildings: formData.building_ids,
      });
      toast.success("Staff member added successfully");
      if (onSuccess) onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: "",
        role: "Maid",
        phone: "",
        monthly_salary: "",
        join_date: new Date().toISOString().split("T")[0],
        status: "active",
        building_ids: [],
      });
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (error: any) {
      toast.error(error.message || "Failed to add staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBuilding = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      building_ids: prev.building_ids.includes(id)
        ? prev.building_ids.filter((bid) => bid !== id)
        : [...prev.building_ids, id],
    }));
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-card shadow-2xl"
        >
          {/* Header */}
          <div className="relative bg-gradient-brand px-6 py-8 text-white">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/80 transition-colors hover:bg-black/40 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-md">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Add Staff Member</h2>
            <p className="mt-1 text-sm text-white/80">Add a new maid, security guard, or property manager.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder="e.g. Ramesh Kumar"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder="e.g. Maid, Security"
                    list="staff-roles"
                  />
                  <datalist id="staff-roles">
                    <option value="Maid" />
                    <option value="Security Guard" />
                    <option value="Cleaner" />
                    <option value="Property Manager" />
                    <option value="Electrician" />
                    <option value="Plumber" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Monthly Salary</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    name="monthly_salary"
                    required
                    min="0"
                    step="500"
                    value={formData.monthly_salary}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder="5000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Joined At</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    name="join_date"
                    value={formData.join_date}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Assign Buildings</label>
                <div className="relative border border-border rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                  {(buildings || []).length === 0 && (
                    <div className="text-sm text-muted-foreground p-2">No buildings found</div>
                  )}
                  {(buildings || []).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded-lg cursor-pointer"
                      onClick={() => toggleBuilding(b.id)}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md border",
                          formData.building_ids.includes(b.id)
                            ? "bg-brand border-brand"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {formData.building_ids.includes(b.id) && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand/90 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Staff"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
