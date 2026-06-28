import { nivasaApi } from "@/lib/api";
import { useEffect, useMemo, useState, memo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, UserPlus, Building2, MapPin, CheckCircle2, AlertCircle, Clock, MessageCircle, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { useAnimation, useMotionValue, useTransform } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { type PaymentStatus } from "@/lib/types";
import { cn, getTenantPaymentStatus } from "@/lib/utils";
import { StatusPill } from "@/components/StatusPill";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { downloadExcel } from "@/lib/export";
import { FileSpreadsheet } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";
import { EditTenantModal } from "@/components/EditTenantModal";

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
  const [tenantInvoicesList, setTenantInvoicesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});
  const [editingTenant, setEditingTenant] = useState<any | null>(null);

  const fetchTenants = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (!nivasaApi) return;
      const [data, payments, tenantInvoices] = await Promise.all([
        nivasaApi.getTenants(),
        nivasaApi.getRecentPayments(1000),
        nivasaApi.getTenantInvoices()
      ]);
      setTenantsList(data);
      setPaymentsList(payments);
      setTenantInvoicesList(tenantInvoices);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    const handler = () => fetchTenants();
    const silentHandler = () => fetchTenants(true);
    window.addEventListener("nivasa:refresh", handler);
    window.addEventListener("nivasa:refresh-silent", silentHandler);
    return () => {
      window.removeEventListener("nivasa:refresh", handler);
      window.removeEventListener("nivasa:refresh-silent", silentHandler);
    };
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
      paymentStatus: getTenantPaymentStatus(tenant, paymentsList, tenantInvoicesList)
    }));
  }, [tenantsList, paymentsList, tenantInvoicesList]);

  const filtered = useMemo(() => {
    const qClean = q.trim().toLowerCase();
    const qDigits = qClean.replace(/\D/g, ""); // strip non-digits for phone/aadhar matching

    let result = tenantsWithStatus.filter(t => {
      if (status !== "all" && t.paymentStatus !== status) return false;
      if (selectedBuilding !== "all" && t.buildingName !== selectedBuilding) return false;
      if (!qClean) return true;

      // Text haystack: name, room number, building
      const textHay = `${t.name ?? ""} ${t.roomNumber ?? ""} ${t.buildingName ?? ""}`.toLowerCase();
      if (textHay.includes(qClean)) return true;

      // Phone number search (strip non-digits for fuzzy matching)
      const phoneDigits = (t.phone || "").replace(/\D/g, "");
      const waDigits   = (t.whatsapp_number || "").replace(/\D/g, "");
      if (qDigits.length >= 4 && (phoneDigits.includes(qDigits) || waDigits.includes(qDigits))) return true;

      // Aadhar search (strip spaces for matching)
      const aadharDigits = (t.aadhar || "").replace(/\D/g, "");
      if (qDigits.length >= 4 && aadharDigits.includes(qDigits)) return true;

      return false;
    });

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    result.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return collator.compare(nameA, nameB);
    });

    return result;
  }, [q, status, selectedBuilding, tenantsWithStatus]);

  const selectedTenantsData = useMemo(() => {
    return filtered.filter(t => selectedTenantIds.includes(t.id));
  }, [filtered, selectedTenantIds]);

  const handleOpenRemindersModal = () => {
    setSentStatus({});
    setRemindersOpen(true);
  };

  const getReminderUrl = (tenant: any) => {
    const phone = tenant.whatsapp_number || tenant.phone;
    if (!phone) return "";
    const msg = encodeURIComponent(`Hi ${tenant.name}, this is a gentle reminder that your rent of ₹${tenant.roomRent} is currently pending. Please complete the payment at your earliest convenience.`);
    return `https://wa.me/91${phone.replace(/\D/g, '')}?text=${msg}`;
  };

  const triggerSingleReminder = (tenant: any) => {
    const url = getReminderUrl(tenant);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setSentStatus(prev => ({ ...prev, [tenant.id]: true }));
    } else {
      toast.error(`No phone number for ${tenant.name}`);
    }
  };

  const triggerNextSequential = () => {
    const nextTenant = selectedTenantsData.find(t => !sentStatus[t.id]);
    if (nextTenant) {
      triggerSingleReminder(nextTenant);
    } else {
      toast.success("All selected reminders have been opened!");
    }
  };

  const allSent = selectedTenantsData.every(t => sentStatus[t.id]);
  const unsentCount = selectedTenantsData.filter(t => !sentStatus[t.id]).length;

  const lateTenantsCount = useMemo(() => {
    return filtered.filter(t => t.paymentStatus === 'late').length;
  }, [filtered]);

  const handleSelectAll = () => {
    setSelectedTenantIds(filtered.map(t => t.id));
  };

  const handleSelectAllLate = () => {
    const lateIds = filtered.filter(t => t.paymentStatus === 'late').map(t => t.id);
    setSelectedTenantIds(lateIds);
    toast.success(`Selected all ${lateIds.length} late tenants`);
  };

  const handleBulkMarkPaid = async () => {
    try {
      setActionLoading(true);
      const paymentsToMark = filtered
        .filter(t => selectedTenantIds.includes(t.id) && t.paymentStatus !== "paid")
        .map(t => ({
          buildingId: t.buildingId,
          roomId: t.roomId,
          tenantId: t.id,
          amount: t.roomRent,
          method: "Cash",
          date: new Date().toISOString(),
          status: "paid"
        }));

      if (paymentsToMark.length === 0) {
        toast.info("Selected tenants are already marked as Paid");
        setSelectedTenantIds([]);
        return;
      }

      await nivasaApi.addPaymentsBulk(paymentsToMark);
      toast.success(`Successfully marked ${paymentsToMark.length} payments as paid!`);
      setSelectedTenantIds([]);
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (err) {
      toast.error("Failed to mark payments as paid");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMarkUnpaid = async () => {
    try {
      if (selectedTenantIds.length !== 1) return;
      setActionLoading(true);
      await nivasaApi.revertLastPayment(selectedTenantIds[0]);
      toast.success("Successfully reverted to unpaid status!");
      setSelectedTenantIds([]);
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (err) {
      toast.error("Failed to mark as unpaid");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

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

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex h-12 flex-1 min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 transition-all">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder={"Search by name, phone, or Aadhar…"}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0 h-full"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <select 
              value={selectedBuilding} 
              onChange={(e) => handleSetBuilding(e.target.value)}
              className="h-12 flex-1 rounded-xl border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
            >
              <option value="all">All Buildings</option>
              {buildingsList.map(b => (
                <option key={b as string} value={b as string}>{b as string}</option>
              ))}
            </select>

            <select 
              value={status} 
              onChange={(e) => handleSetStatus(e.target.value as any)}
              className="h-12 flex-1 rounded-xl border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
            >
              {getFilters(t).map(f => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center gap-2">
            {lateTenantsCount > 0 && (
              <button
                onClick={handleSelectAllLate}
                className="h-9 px-3 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Select All Late </span>({lateTenantsCount})
              </button>
            )}
            <button
              onClick={selectedTenantIds.length === filtered.length ? () => setSelectedTenantIds([]) : handleSelectAll}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-all"
            >
              {selectedTenantIds.length === filtered.length ? "Deselect" : "Select All"}
            </button>
          </div>
        )}
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
             <TenantCard 
               key={tenant.id} 
               tenant={tenant} 
               index={i} 
               isSelected={selectedTenantIds.includes(tenant.id)}
               isSelectionMode={selectedTenantIds.length > 0}
               onToggleSelect={(id) => {
                 setSelectedTenantIds(prev => 
                   prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                 );
               }}
               onEdit={() => setEditingTenant(tenant)}
             />
          ))}
        </div>
      )}

      {/* Glassmorphic Floating Action Bar */}
      <AnimatePresence>
        {selectedTenantIds.length > 0 && (
          <div className="fixed bottom-28 lg:bottom-6 left-0 right-0 z-[60] flex justify-center pointer-events-none px-4">
            {(() => {
              const isSingleSelected = selectedTenantIds.length === 1;
              const singleSelectedTenant = isSingleSelected ? tenantsList.find(t => t.id === selectedTenantIds[0]) : null;
              const isSingleSelectedPaid = singleSelectedTenant ? singleSelectedTenant.paymentStatus === 'paid' : false;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 100 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="pointer-events-auto flex items-center justify-between gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-6 sm:py-4 rounded-2xl bg-card/85 border border-border/80 backdrop-blur-lg shadow-2xl w-full max-w-lg"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-brand text-white shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{selectedTenantIds.length} Selected</p>
                      <p className="text-[10px] text-muted-foreground hidden sm:block">Perform bulk actions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      onClick={isSingleSelectedPaid ? handleBulkMarkUnpaid : handleBulkMarkPaid}
                      disabled={actionLoading}
                      className={cn(
                        "h-9 px-3 sm:px-4 xs-px-2 rounded-xl text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50",
                        isSingleSelectedPaid 
                          ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" 
                          : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                      )}
                    >
                      {isSingleSelectedPaid ? (
                        <>
                          <Clock className="h-3.5 w-3.5 sm:hidden" />
                          <span className="hidden sm:inline">Mark Unpaid</span>
                          <span className="sm:hidden xs-hide-text">Unpaid</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 sm:hidden" />
                          <span className="hidden sm:inline">Mark Paid</span>
                          <span className="sm:hidden xs-hide-text">Paid</span>
                        </>
                      )}
                    </button>
                
                <button
                  onClick={handleOpenRemindersModal}
                  className="h-9 px-3 sm:px-4 xs-px-2 rounded-xl text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors flex items-center gap-1.5 shadow-md shadow-brand/20"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reminders</span>
                  <span className="sm:hidden xs-hide-text">Remind</span>
                </button>
                
                    <button
                      onClick={() => setSelectedTenantIds([])}
                      className="h-9 w-9 rounded-xl border border-border bg-secondary hover:bg-secondary/80 transition-colors flex items-center justify-center text-muted-foreground shrink-0"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

      {/* Reminders Modal */}
      {remindersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-brand" />
                  Bulk WhatsApp Reminders
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send reminders to {selectedTenantsData.length} selected tenants
                </p>
              </div>
              <button
                onClick={() => setRemindersOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 bg-secondary/30 border-b border-border/30 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {allSent ? (
                  <span className="text-emerald-500 font-medium">All reminders opened</span>
                ) : (
                  <span>{unsentCount} of {selectedTenantsData.length} remaining</span>
                )}
              </div>
              {!allSent && (
                <button
                  onClick={triggerNextSequential}
                  className="h-8 px-3 rounded-lg text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors flex items-center gap-1.5"
                >
                  Send Next Reminder
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedTenantsData.map((tenant) => {
                const isSent = sentStatus[tenant.id];
                const phone = tenant.whatsapp_number || tenant.phone;
                return (
                  <div key={tenant.id} className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-colors",
                    isSent ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card"
                  )}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Room {tenant.roomNumber} &bull; {phone || "No phone"}
                      </p>
                    </div>
                    <div>
                      {isSent ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Opened
                        </div>
                      ) : (
                        <button
                          onClick={() => triggerSingleReminder(tenant)}
                          disabled={!phone}
                          className="h-8 px-3 rounded-lg text-xs font-medium border border-brand bg-brand/5 text-brand hover:bg-brand hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Send
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-border/50 bg-secondary/10 flex items-center justify-end">
              <button
                onClick={() => {
                  setRemindersOpen(false);
                  setSelectedTenantIds([]);
                }}
                className="h-9 px-4 rounded-xl text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <EditTenantModal 
        open={!!editingTenant} 
        tenant={editingTenant} 
        onClose={() => setEditingTenant(null)} 
        onUpdated={fetchTenants} 
      />
    </div>
  );
}

const TenantCard = memo(function TenantCard({ 
  tenant, 
  index,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  onEdit
}: { 
  tenant: any; 
  index: number;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);

  // Background opacities based on swipe distance
  const paidOpacity = useTransform(x, [0, 80], [0, 1]);
  const reminderOpacity = useTransform(x, [0, -80], [0, 1]);

  let statusIcon = <Clock className="h-3.5 w-3.5 text-orange-500" />;
  let statusText = "Pending";
  let statusColorClass = "text-orange-500 bg-orange-500/10 border-orange-500/20";

  const [optimisticStatus, setOptimisticStatus] = useState<any>(undefined);
  
  const currentStatus = optimisticStatus || tenant.paymentStatus;

  if (currentStatus === "paid") {
    statusIcon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    statusText = "Paid";
    statusColorClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  } else if (currentStatus === "late") {
    statusIcon = <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    statusText = "Delayed";
    statusColorClass = "text-red-500 bg-red-500/10 border-red-500/20";
  }

  const handleMarkPaid = async () => {
    try {
      setSubmitting(true);
      await nivasaApi.addPayment({
        building_id: tenant.buildingId,
        room_id: tenant.roomId,
        tenant_id: tenant.id,
        amount: tenant.roomRent,
        method: "Cash",
        date: new Date().toISOString(),
        status: "paid"
      });
      setOptimisticStatus("paid");
      toast.success("Rent marked as paid!");
      window.dispatchEvent(new CustomEvent("nivasa:refresh-silent"));
    } catch (err) {
      toast.error("Failed to mark as paid");
    } finally {
      setSubmitting(false);
      controls.start({ x: 0 });
    }
  };

  const handleMarkUnpaid = async () => {
    try {
      setSubmitting(true);
      await nivasaApi.revertLastPayment(tenant.id);
      setOptimisticStatus("pending");
      toast.success("Reverted to unpaid status");
      window.dispatchEvent(new CustomEvent("nivasa:refresh-silent"));
    } catch (err) {
      toast.error("Failed to revert payment");
    } finally {
      setSubmitting(false);
      controls.start({ x: 0 });
    }
  };

  const handleSendReminder = () => {
    const phone = tenant.whatsapp_number || tenant.phone;
    if (!phone) {
      toast.error("No phone number found for this tenant");
      controls.start({ x: 0 });
      return;
    }
    const msg = encodeURIComponent(`Hi ${tenant.name}, this is a gentle reminder that your rent of ₹${tenant.roomRent} is currently pending. Please complete the payment at your earliest convenience.`);
    nivasaApi.logFeatureUsage("whatsapp_reminders", "send_reminder", { tenantName: tenant.name, status: "pending" });
    openWhatsApp(phone, msg);
    controls.start({ x: 0 });
  };

  const handleSendInvite = () => {
    const phone = tenant.whatsapp_number || tenant.phone;
    if (!phone) {
      toast.error("No phone number found for this tenant");
      return;
    }
    const signupUrl = `${window.location.origin}/register`;
    const msg = encodeURIComponent(
      `Hi ${tenant.name},\n\nWelcome to Nivasa! Your landlord has added you to the system. You can now register and set up your login credentials to view your room details, invoices, and pay rent directly.\n\n👉 Sign up here: ${signupUrl}\n\n*Important:* Please register using your phone number (${phone}) as it is linked to your profile.\n\nThank you!`
    );
    nivasaApi.logFeatureUsage("whatsapp_reminders", "send_invite", { tenantName: tenant.name });
    openWhatsApp(phone, msg);
    toast.success("Opening WhatsApp invite...");
  };

  const handleDragEnd = (e: any, info: any) => {
    if (submitting || isSelectionMode) return;
    const offset = info.offset.x;
    if (offset > 80) {
      if (currentStatus === "paid") {
        handleMarkUnpaid();
      } else {
        handleMarkPaid();
      }
    } else if (offset < -80) {
      handleSendReminder();
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-200 bg-card shadow-soft group",
        isSelected ? "border-brand shadow-glow-sm" : "border-border"
      )}
    >
      {/* Checkbox overlay */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(tenant.id);
        }}
        className={cn(
          "absolute top-4 right-4 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md transition-all duration-200 border-2",
          isSelected 
            ? "bg-brand border-brand text-white scale-110 opacity-100" 
            : "border-border bg-card/80 hover:border-brand/50 opacity-100 shadow-sm",
          isSelectionMode && "opacity-100"
        )}
      >
        {isSelected && (
          <svg className="h-3.5 w-3.5 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Background Swipe Actions Layer */}
      {!isSelectionMode && (
        <div className="absolute inset-0 z-0 flex select-none items-center justify-between px-6 font-semibold">
          <motion.div 
            style={{ opacity: paidOpacity }} 
            className={cn("flex h-full w-1/2 items-center justify-start", currentStatus === "paid" ? "text-amber-500" : "text-emerald-500")}
          >
            <div className="flex flex-col items-start gap-1">
              {currentStatus === "paid" ? (
                <>
                  <Clock className="h-6 w-6" />
                  <span className="text-[10px] uppercase tracking-wider">Mark Unpaid</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="text-[10px] uppercase tracking-wider">Mark Paid</span>
                </>
              )}
            </div>
          </motion.div>
          
          <motion.div 
            style={{ opacity: reminderOpacity }} 
            className="flex h-full w-1/2 items-center justify-end text-brand"
          >
            <div className="flex flex-col items-end gap-1">
              <MessageCircle className="h-6 w-6" />
              <span className="text-[10px] uppercase tracking-wider">Reminder</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Draggable Foreground Card */}
      <motion.div
        drag={isSelectionMode ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        onClick={() => {
          if (isSelectionMode) {
            onToggleSelect(tenant.id);
          } else {
            onEdit();
          }
        }}
        className={cn(
          "relative z-10 flex h-full w-full flex-col justify-between bg-card p-5 transition-shadow",
          isSelectionMode ? "cursor-pointer select-none" : "cursor-grab active:cursor-grabbing",
          !isSelectionMode && "hover:shadow-md",
          isSelected && "bg-brand/[0.02]"
        )}
        whileTap={{ scale: 0.94, boxShadow: "inset 0px 0px 60px rgba(59, 130, 246, 0.4)", borderColor: "rgba(59, 130, 246, 0.8)", filter: "brightness(1.05)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-lg font-bold text-white shadow-glow">
          {initials(tenant.name)}
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base truncate">{tenant.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{tenant.buildingName} &bull; Room {tenant.roomNumber}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-border/50 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Rent Amount</span>
            <span className="text-sm font-semibold tnum">₹{tenant.roomRent}</span>
          </div>
          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", statusColorClass)}>
            {statusIcon}
            {statusText}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSendInvite();
          }}
          className="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl border border-brand/20 bg-brand/5 text-[11px] font-semibold text-brand hover:bg-brand hover:text-white transition-all duration-200"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite to Portal
        </button>
      </div>
      </motion.div>
    </motion.div>
  );
});

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
