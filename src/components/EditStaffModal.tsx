import { useState, useEffect } from "react";
import { X, User, Phone, Briefcase, IndianRupee, Calendar, CheckCircle2, Building2 } from "lucide-react";
import { nivasaApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  staff: any;
  onSuccess?: () => void;
}

export function EditStaffModal({ open, onClose, staff, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    monthly_salary: "",
    join_date: "",
    status: "",
    building_id: "",
  });

  const { data: buildings } = useQuery({
    queryKey: ["buildings"],
    queryFn: nivasaApi.getBuildings,
  });

  useEffect(() => {
    if (staff && open) {
      setFormData({
        name: staff.name || "",
        role: staff.role || "Maid",
        phone: staff.phone || "",
        monthly_salary: staff.monthly_salary ? staff.monthly_salary.toString() : "",
        join_date: staff.join_date ? new Date(staff.join_date).toISOString().split("T")[0] : "",
        status: staff.status || "active",
        building_id: staff.allocatedBuildings && staff.allocatedBuildings.length > 0 ? staff.allocatedBuildings[0] : "",
      });
    }
  }, [staff, open]);

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

    if (!formData.building_id) return toast.error("Please assign at least one building");

    try {
      setSubmitting(true);
      await nivasaApi.updateStaff(staff.id, {
        ...formData,
        monthly_salary: salary,
        allocatedBuildings: [formData.building_id],
      });
      toast.success("Staff member updated successfully");
      if (onSuccess) onSuccess();
      onClose();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (error: any) {
      toast.error(error.message || "Failed to update staff member");
    } finally {
      setSubmitting(false);
    }
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
              <User className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Edit Staff Member</h2>
            <p className="mt-1 text-sm text-white/80">Update the details for this staff member.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    name="status"
                    required
                    value={formData.status}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Assign Building</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    name="building_id"
                    required
                    value={formData.building_id}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    <option value="" disabled>Select Building</option>
                    {(buildings || []).map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
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
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
