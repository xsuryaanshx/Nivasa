import { nivasaApi } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, UserPlus, Building2, MapPin, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { type PaymentStatus } from "@/lib/types";
import { cn, getTenantPaymentStatus } from "@/lib/utils";
import { StatusPill } from "@/components/StatusPill";
import { motion } from "framer-motion";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { downloadExcel } from "@/lib/export";
import { FileSpreadsheet } from "lucide-react";

const getFilters = (t: any): ({ key: PaymentStatus | "all"; label: string })[] => [
  { key: "all",     label: t('all') || "All" },
  { key: "paid",    label: t('paid') || "Paid" },
  { key: "pending", label: t('pending') || "Pending" },
  { key: "late",    label: t('late') || "Delayed" },
];

function initials(name: string) {
  if (!name) return "??";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function Tenants() {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const { canAccessFeature } = useSubscriptionData();
  const canExport = canAccessFeature("excel_exports");
  
  const statusParam = searchParams.get("status") as PaymentStatus | "all" | null;
  const [status, setStatus] = useState<PaymentStatus | "all">(statusParam || "all");

  const buildingParam = searchParams.get("building") as string | null;
  const [selectedBuilding, setSelectedBuilding] = useState<string | "all">(buildingParam || "all");

  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      if (!nivasaApi) return;
      const [data, payments] = await Promise.all([
        nivasaApi.getTenants(),
        nivasaApi.getRecentPayments(1000)
      ]);
      setTenantsList(data);
      setPaymentsList(payments);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    const handler = () => fetchTenants();
    window.addEventListener("nivasa:refresh", handler);
    return () => window.removeEventListener("nivasa:refresh", handler);
  }, []);

  const handleSetStatus = (s: PaymentStatus | "all") => {
    setStatus(s);
    const newParams = new URLSearchParams(searchParams);
    if (s === "all") newParams.delete("status");
    else newParams.set("status", s);
    setSearchParams(newParams);
  };

  const handleSetBuilding = (b: string | "all") => {
    setSelectedBuilding(b);
    const newParams = new URLSearchParams(searchParams);
    if (b === "all") newParams.delete("building");
    else newParams.set("building", b);
    setSearchParams(newParams);
  };

  const buildingsList = useMemo(() => {
    const b = new Set(tenantsList.map(t => t.buildingName).filter(Boolean));
    return Array.from(b).sort();
  }, [tenantsList]);

  // Compute payment status for each tenant up front
  const tenantsWithStatus = useMemo(() => {
    return tenantsList.map(tenant => ({
      ...tenant,
      paymentStatus: getTenantPaymentStatus(tenant, paymentsList)
    }));
  }, [tenantsList, paymentsList]);

  const filtered = useMemo(() => {
    let result = tenantsWithStatus.filter(t => {
      if (status !== "all" && t.paymentStatus !== status) return false;
      if (selectedBuilding !== "all" && t.buildingName !== selectedBuilding) return false;
      if (!q) return true;
      const hay = `${t.name} ${t.roomNumber} ${t.buildingName} ${t.phone || ""} ${t.whatsapp_number || ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    result.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return collator.compare(nameA, nameB);
    });

    return result;
  }, [q, status, selectedBuilding, tenantsWithStatus]);

  const handleExport = () => {
    if (!canExport) return;
    const dataToExport = filtered.map(t => ({
      "Tenant Name": t.name,
      "Building": t.buildingName,
      "Room Number": t.roomNumber,
      "Phone": t.phone || "",
      "Rent Amount": t.roomRent,
      "Payment Status": t.paymentStatus,
      "Join Date": t.joinDate || ""
    }));
    downloadExcel(dataToExport, "tenants_export.xlsx");
  };

  return (
    <div>
      <PageHeader
        title={t('tenants') || "Tenants"}
        subtitle={"Manage all your property tenants and monitor their payment status"}
        action={
          <div className="flex items-center gap-2">
            {canExport && (
              <MagneticButton onClick={handleExport} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Export Excel
              </MagneticButton>
            )}
            <MagneticButton onClick={() => window.dispatchEvent(new CustomEvent("nivasa:add-tenant"))}>
              <UserPlus className="h-4 w-4" /> Add tenant
            </MagneticButton>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex h-10 flex-1 min-w-[240px] max-w-md items-center gap-2 rounded-xl border border-border bg-card px-3.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={"Search tenants by name, phone, or room..."}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        
        <select 
          value={selectedBuilding} 
          onChange={(e) => handleSetBuilding(e.target.value)}
          className="h-10 rounded-xl border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand min-w-[140px]"
        >
          <option value="all">All Buildings</option>
          {buildingsList.map(b => (
            <option key={b as string} value={b as string}>{b as string}</option>
          ))}
        </select>

        <select 
          value={status} 
          onChange={(e) => handleSetStatus(e.target.value as any)}
          className="h-10 rounded-xl border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand min-w-[140px]"
        >
          {getFilters(t).map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
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
          {filtered.map((tenant, i) => (
             <TenantCard key={tenant.id} tenant={tenant} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function TenantCard({ tenant, index }: { tenant: any; index: number }) {
  let statusIcon = <Clock className="h-3.5 w-3.5 text-orange-500" />;
  let statusText = "Pending";
  let statusColorClass = "text-orange-500 bg-orange-500/10 border-orange-500/20";

  if (tenant.paymentStatus === "paid") {
    statusIcon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    statusText = "Paid";
    statusColorClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  } else if (tenant.paymentStatus === "late") {
    statusIcon = <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    statusText = "Delayed";
    statusColorClass = "text-red-500 bg-red-500/10 border-red-500/20";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-lg font-bold text-white shadow-glow">
          {initials(tenant.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base truncate">{tenant.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{tenant.buildingName} &bull; Room {tenant.roomNumber}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Rent Amount</span>
          <span className="text-sm font-semibold tnum">₹{tenant.roomRent}</span>
        </div>
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", statusColorClass)}>
          {statusIcon}
          {statusText}
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
      <div className="text-sm font-medium">No tenants match your filters</div>
      <div className="mt-1 text-xs text-muted-foreground">Try adjusting your search query, building, or status filter.</div>
    </div>
  );
}
