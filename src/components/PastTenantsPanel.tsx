import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Users, Download, FileSpreadsheet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { nivasaApi } from "@/lib/api";
import { downloadExcel } from "@/lib/export";
import { toast } from "sonner";
import { format } from "date-fns";
import { showUndoToast } from "@/components/UndoToast";

export function PastTenantsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadPastTenants();
    }
  }, [open]);

  const loadPastTenants = async () => {
    try {
      setLoading(true);
      const data = await nivasaApi.getPastTenants();
      setTenants(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load past tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (tenant: any) => {
    try {
      await nivasaApi.restoreTenant(tenant.roomId, tenant.id);
      toast.success(`${tenant.name} has been restored to Room ${tenant.roomNumber}`);
      loadPastTenants();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to restore tenant");
    }
  };

  const handleDelete = (tenant: any) => {
    setOptimisticDeletedIds(prev => new Set([...prev, tenant.id]));
    showUndoToast(
      `Deleted ${tenant.name}`,
      () => {
        setOptimisticDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(tenant.id);
          return next;
        });
      },
      async () => {
        try {
          await nivasaApi.hardDeleteTenant(tenant.id);
          toast.success("Tenant permanently deleted");
          loadPastTenants();
        } catch (err: any) {
          console.error(err);
          toast.error("Failed to delete tenant");
          setOptimisticDeletedIds(prev => {
            const next = new Set(prev);
            next.delete(tenant.id);
            return next;
          });
        }
      }
    );
  };

  const filteredTenants = tenants.filter((tenant) => {
    if (optimisticDeletedIds.has(tenant.id)) return false;
    const query = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(query) ||
      (tenant.phone && tenant.phone.toLowerCase().includes(query)) ||
      (tenant.buildingName && tenant.buildingName.toLowerCase().includes(query)) ||
      (tenant.roomNumber && tenant.roomNumber.toLowerCase().includes(query))
    );
  });

  const handleExport = () => {
    if (filteredTenants.length === 0) {
      toast.error("No tenants to export");
      return;
    }
    
    setExporting(true);
    try {
      const data = filteredTenants.map((t: any) => ({
        TenantID: t.id,
        Name: t.name,
        Phone: t.phone,
        WhatsApp: t.whatsapp || "",
        AadharNumber: t.aadharNumber || "",
        Status: t.status,
        BuildingName: t.buildingName,
        RoomNumber: t.roomNumber,
        JoinedAt: t.joinedAt,
        LeftAt: t.leftAt || "",
        DepositAmount: t.depositAmount || 0,
        RentAmount: t.roomRent || 0
      }));
      
      downloadExcel(data, "Past_Tenants_Export");
      toast.success(`Exported ${data.length} past tenants`);
    } catch (error) {
      console.error("Export error", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border/50 bg-background shadow-2xl"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Past Tenants</h2>
                  <p className="text-sm text-muted-foreground">View and export vacated tenants</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 transition-colors hover:bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="border-b border-border/50 p-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or building..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border/50 bg-secondary/50 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/50 focus:bg-background"
                  />
                </div>
                
                <button
                  onClick={handleExport}
                  disabled={exporting || filteredTenants.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {exporting ? (
                    <span>Exporting...</span>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Export to Excel ({filteredTenants.length})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : filteredTenants.length === 0 ? (
                  <div className="flex h-60 flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No past tenants found</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {searchQuery ? "Try adjusting your search criteria" : "Vacated tenants will appear here"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTenants.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{t.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-500">
                              Vacated
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="block font-medium text-foreground">Phone</span>
                            {t.phone || "N/A"}
                          </div>
                          <div>
                            <span className="block font-medium text-foreground">Location</span>
                            {t.buildingName} - {t.roomNumber}
                          </div>
                          <div>
                            <span className="block font-medium text-foreground">Joined</span>
                            {t.joinedAt ? format(new Date(t.joinedAt), "MMM d, yyyy") : "N/A"}
                          </div>
                          <div>
                            <span className="block font-medium text-foreground">Left</span>
                            {t.leftAt ? format(new Date(t.leftAt), "MMM d, yyyy") : "N/A"}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                          <button
                            onClick={() => handleRestore(t)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
