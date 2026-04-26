import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, MoreHorizontal, Plus, ArrowLeft, Users, Receipt, Home } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { Money } from "@/components/Money";
import { toast } from "sonner";

import { EditBuildingModal } from "@/components/EditBuildingModal";

export default function BuildingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [isEditingBuilding, setIsEditingBuilding] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: '', rent: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const api = (window as any).estateApi;
      if (!api) return;
      const buildingData = await api.getPropertyDetails(id);
      setData(buildingData);
    } catch (error) {
      console.error("Error fetching building details:", error);
      toast.error("Failed to load property details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddUnit = async () => {
    if (!newUnit.name || !newUnit.rent) return toast.error("Please fill all fields");
    try {
      const api = (window as any).estateApi;
      await api.addUnit({
        building_id: id,
        name: newUnit.name,
        rent_amount: parseFloat(newUnit.rent),
        status: 'vacant',
        user_id: data.user_id
      });
      toast.success("Unit added successfully");
      setIsAddingUnit(false);
      setNewUnit({ name: '', rent: '' });
      fetchData();
    } catch (error) {
      toast.error("Failed to add unit");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading property details...</p>
      </div>
    );
  }

  if (!data) return <div className="text-center py-20">Property not found.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="pb-20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/app/buildings")} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {data.name}
              <button 
                onClick={() => setIsEditingBuilding(true)} 
                className="text-xs font-normal text-muted-foreground hover:text-brand underline underline-offset-4"
              >
                Edit
              </button>
            </h1>
            <p className="text-sm text-muted-foreground">{data.address}</p>
          </div>
        </div>
      </div>

      <EditBuildingModal 
        open={isEditingBuilding} 
        onClose={() => setIsEditingBuilding(false)} 
        onSuccess={fetchData}
        buildingData={{ id: data.id, name: data.name, address: data.address }}
      />

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><Home className="h-3 w-3" /> Total Units</div>
          <div className="mt-1 text-2xl font-bold">{data.units.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><Users className="h-3 w-3" /> Occupancy</div>
          <div className="mt-1 text-2xl font-bold">{Math.round(data.occupancyRate)}%</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft border-brand/20 bg-brand/[0.02]">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-brand/70"><Receipt className="h-3 w-3" /> Potential</div>
          <div className="mt-1 text-2xl font-bold text-brand"><Money value={data.units.reduce((acc: any, u: any) => acc + (u.rent_amount || 0), 0)} /></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><Users className="h-3 w-3" /> Active Tenants</div>
          <div className="mt-1 text-2xl font-bold">{data.tenants.length}</div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Units & Tenants</h2>
          <MagneticButton onClick={() => setIsAddingUnit(!isAddingUnit)} className="h-9 px-4 text-xs">
            <Plus className="h-3.5 w-3.5 mr-2" /> {isAddingUnit ? 'Cancel' : 'Add Unit'}
          </MagneticButton>
        </div>

        <AnimatePresence>
          {isAddingUnit && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 overflow-hidden rounded-2xl border border-brand/20 bg-brand/[0.02] p-6"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Unit Name/Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Flat 101" 
                    value={newUnit.name}
                    onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Monthly Rent</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={newUnit.rent}
                    onChange={(e) => setNewUnit({...newUnit, rent: e.target.value})}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={handleAddUnit}
                    className="h-[38px] w-full rounded-xl bg-brand text-sm font-semibold text-white shadow-glow hover:bg-brand/90"
                  >
                    Create Unit
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/30 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Unit</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Tenant</th>
                <th className="px-6 py-4 font-medium text-right">Rent</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.units.map((unit: any) => (
                <tr key={unit.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-6 py-4 font-semibold">{unit.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${
                      unit.status === 'occupied' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {unit.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {unit.tenant ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">{unit.tenant.name[0]}</div>
                        {unit.tenant.name}
                      </div>
                    ) : (
                      <span className="opacity-30">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-right tabular-nums">
                    <Money value={unit.rent_amount} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data.units.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Home className="h-10 w-10 opacity-10 mb-3" />
                      <p className="text-sm italic">No units have been added to this property yet.</p>
                      <button onClick={() => setIsAddingUnit(true)} className="mt-3 text-xs text-brand hover:underline">Add your first unit</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
