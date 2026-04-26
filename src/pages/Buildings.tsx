import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, MoreHorizontal, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { Money } from "@/components/Money";
import { toast } from "sonner";

export default function Buildings() {
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  return (
    <div>
      <PageHeader
        title="Buildings"
        subtitle="A clear view of every property in your portfolio."
        action={
          <MagneticButton onClick={() => toast.success("New building", { description: "Form would open here." })}>
            <Plus className="h-4 w-4" /> Add building
          </MagneticButton>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/50" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {buildingsList.map((b, i) => {
            const occ = b.rooms > 0 ? Math.round((b.occupied / b.rooms) * 100) : 0;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
                className="group tilt rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-secondary">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5">
                  <div className="text-base font-semibold tracking-tight">{b.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{b.address}</div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Metric label="Rooms"    value={b.rooms.toString()} />
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