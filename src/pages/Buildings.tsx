import { nivasaApi } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Building2, MoreHorizontal, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { Money } from "@/components/Money";
import { showUndoToast } from "@/components/UndoToast";
import { useNavigate } from "react-router-dom";
import { AddBuildingModal } from "@/components/AddBuildingModal";
import { EditBuildingModal } from "@/components/EditBuildingModal";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ConfirmModal } from "@/components/ConfirmModal";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Buildings() {
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [buildingToDelete, setBuildingToDelete] = useState<string | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const activeMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!nivasaApi) return;
      const data = await nivasaApi.getBuildings();
      setBuildingsList(data);
    } catch (err) {
      console.error("Error fetching buildings:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
    const refreshHandler = () => fetchBuildings();
    window.addEventListener("nivasa:refresh", refreshHandler);

    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenuRef.current && !activeMenuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("nivasa:refresh", refreshHandler);
    };
  }, [activeMenuId]);

  const handleDeleteClick = async (id: string) => {
    try {
      const canDelete = await nivasaApi.canDeleteBuilding(id);
      if (!canDelete) {
        toast.error("Cannot delete building: It contains rooms that are not vacant. Please vacate all rooms first.");
        return;
      }
      setBuildingToDelete(id);
      setActiveMenuId(null);
    } catch (error: any) {
      console.error("Error checking building deletion:", error);
      toast.error(error.message || t("building_delete_failed"));
    }
  };

  const confirmDelete = async () => {
    if (!buildingToDelete) return;
    try {
      await nivasaApi.deleteBuilding(buildingToDelete);
      toast.success(t("building_deleted"));
      fetchBuildings();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (error: any) {
      console.error("Error deleting building:", error);
      toast.error(error.message || t("building_delete_failed"));
      fetchBuildings();
    } finally {
      setBuildingToDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('buildings')}
        subtitle={t("buildings_subtitle")}
        action={
          <MagneticButton onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4" /> {t('add_building')}
          </MagneticButton>
        }
      />

      <AddBuildingModal 
        open={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchBuildings}
      />

      {editingBuilding && (
        <EditBuildingModal
          open={!!editingBuilding}
          onClose={() => setEditingBuilding(null)}
          onSuccess={fetchBuildings}
          buildingData={editingBuilding}
        />
        />
      )}

      <ConfirmModal
        open={!!buildingToDelete}
        onClose={() => setBuildingToDelete(null)}
        onConfirm={confirmDelete}
        title={t('delete_building')}
        description="Are you sure you want to delete this property? This action cannot be undone."
      />

      {error && <ErrorBanner error={error} onRetry={fetchBuildings} />}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/50" />
          ))}
        </div>
      ) : !error && buildingsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 mt-8 text-center border rounded-2xl bg-card border-dashed">
          <div className="h-16 w-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold">You haven't added any properties yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Get started by adding your first building, PG, or property to manage your rooms and tenants.
          </p>
          <MagneticButton className="mt-6" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Your First Property
          </MagneticButton>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {buildingsList.map((b, i) => {
            const occ = b.occupancyRate || 0;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
                onClick={() => navigate(`/app/buildings/${b.id}`)}
                className="group relative overflow-hidden cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:border-brand/30 hover:shadow-elev"
              >
                {/* Permanent Tap/Hover Glow */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_70%)]" />

                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary focus:outline-none"
                          aria-label="Toggle menu"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/buildings/${b.id}`);
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-brand" /> {t('view_building')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBuilding(b);
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5 text-brand" /> {t('edit_building')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(b.id);
                          }}
                          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t('delete_building')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-base font-semibold tracking-tight">{b.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{b.address}</div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Metric label={t("rooms_label")} value={b.rooms.toString()} />
                  <Metric label={t("occupied")} value={`${b.occupied}/${b.rooms}`} />
                  <Metric label={t("revenue")} value={<Money value={b.monthlyRevenue} compact />} />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{t("occupancy")}</span>
                    <span className="tnum">{occ}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${occ}%` }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
                      className="h-full rounded-full bg-gradient-brand"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold tnum">{value}</div>
    </div>
  );
}
