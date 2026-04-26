import { useEffect, useState } from "react";
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

export default function Buildings() {
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const navigate = useNavigate();

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

    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this building? All associated units will be removed.")) return;
    
    try {
      const api = (window as any).estateApi;
      await api.deleteBuilding(id);
      toast.success("Building deleted successfully");
      fetchBuildings();
    } catch (error) {
      console.error("Error deleting building:", error);
      toast.error("Failed to delete building");
    }
  };

  return (
    <div>
      <PageHeader
        title="Buildings"
        subtitle="A clear view of every property in your portfolio."
        action={
          <MagneticButton onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add building
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
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === b.id ? null : b.id);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-secondary"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    <AnimatePresence>
                      {activeMenuId === b.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => navigate(`/app/buildings/${b.id}`)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"
                          >
                            <Eye className="h-3.5 w-3.5 text-brand" /> View Building
                          </button>
                          <button
                            onClick={() => {
                              setEditingBuilding(b);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"
                          >
                            <Edit className="h-3.5 w-3.5 text-brand" /> Edit Building
                          </button>
                          <div className="my-1 h-px bg-border" />
                          <button
                            onClick={() => {
                              handleDelete(b.id);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Building
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-base font-semibold tracking-tight">{b.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{b.address}</div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Metric label="Units"    value={b.rooms.toString()} />
                  <Metric label="Occupied" value={`${b.occupied}/${b.rooms}`} />
                  <Metric label="Revenue"  value={<Money value={b.monthlyRevenue} compact />} />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Occupancy</span>
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