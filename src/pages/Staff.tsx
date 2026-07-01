import { nivasaApi } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Phone, Briefcase, Calendar, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AddStaffModal } from "@/components/AddStaffModal";

import { ErrorBanner } from "@/components/ErrorBanner";

function initials(name: string) {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Staff() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!nivasaApi) return;
      const data = await nivasaApi.getStaff();
      setStaffList(data);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    const handleRefresh = () => fetchStaff();
    window.addEventListener("nivasa:refresh", handleRefresh);
    return () => window.removeEventListener("nivasa:refresh", handleRefresh);
  }, []);

  const roles = useMemo(() => {
    const r = new Set(staffList.map(s => s.role).filter(Boolean));
    return Array.from(r).sort();
  }, [staffList]);

  const filtered = useMemo(() => {
    let result = staffList.filter(s => {
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      if (!q) return true;
      const hay = `${s.name} ${s.role} ${s.phone || ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    return result;
  }, [q, roleFilter, staffList]);

  return (
    <div>
      <PageHeader
        title={"Staff Management"}
        subtitle={"Manage your property staff, maids, security, and monitor their attendance and payments."}
        action={
          <MagneticButton onClick={() => setIsAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add Staff
          </MagneticButton>
        }
      />

      {error && <ErrorBanner error={error} onRetry={fetchStaff} />}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex h-10 flex-1 min-w-[240px] max-w-md items-center gap-2 rounded-xl border border-border bg-card px-3.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={"Search staff by name, role or phone..."}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        
        <select 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand min-w-[140px]"
        >
          <option value="all">All Roles</option>
          {roles.map(r => (
            <option key={r as string} value={r as string}>{r as string}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-secondary/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((staff, i) => (
             <StaffCard key={staff.id} staff={staff} index={i} onClick={() => navigate(`/app/staff/${staff.id}`)} />
          ))}
        </div>
      )}

      <AddStaffModal open={isAddOpen} onClose={() => setIsAddOpen(false)} onSuccess={fetchStaff} />
    </div>
  );
}

function StaffCard({ staff, index, onClick }: { staff: any; index: number; onClick: () => void }) {
  const statusColorClass = staff.status === 'active' 
    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    : "text-red-500 bg-red-500/10 border-red-500/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
      onClick={onClick}
      className="group cursor-pointer relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-md hover:border-brand/30"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-lg font-bold text-white shadow-glow">
          {initials(staff.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base truncate group-hover:text-brand transition-colors">{staff.name}</h3>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Briefcase className="h-3.5 w-3.5" />
            <span className="truncate">{staff.role}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Salary</span>
          <span className="text-sm font-semibold tnum">₹{Number(staff.monthly_salary || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium capitalize", statusColorClass)}>
          {staff.status}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">No staff match your filters</div>
      <div className="mt-1 text-xs text-muted-foreground">Try adjusting your search query or role filter.</div>
    </div>
  );
}
