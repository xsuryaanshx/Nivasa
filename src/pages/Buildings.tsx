import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Building2, MoreHorizontal, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { Money } from "@/components/Money";
import { useNavigate } from "react-router-dom";
import { AddBuildingModal } from "@/components/AddBuildingModal";
import { EditBuildingModal } from "@/components/EditBuildingModal";
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const activeMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const api = (window as any).estateApi;
      if (!api) return;
      const data = await api.getBuildings();
      setBuildingsList(data);
    } catch (error) {
      console.error("Error fetching buildings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();

    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenuRef.current && !activeMenuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenuId]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("delete_confirm_building"))) return;
    
    try {
      const api = (window as any).estateApi;
      await api.deleteBuilding(id);
      toast.success(t("building_deleted"));
      fetchBuildings();
    } catch (error) {
      console.error("Error deleting building:", error);
      toast.error(t("building_delete_failed"));
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
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/50" />
          ))}
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
                className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:border-brand/40 hover:shadow-glow"
              >
                <div className="flex items-start justify-between">
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
                            handleDelete(b.id);
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
