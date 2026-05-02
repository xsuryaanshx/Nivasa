import { Building2, DollarSign, Home, Receipt, Users, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { PaymentTimeline } from "@/components/PaymentTimeline";
import { MagneticButton } from "@/components/MagneticButton";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { totalBuildings: 0, totalRooms: 0, occupied: 0, pending: 0, monthlyRevenue: 0 },
    recent: []
  });
  const [addOpen, setAddOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const api = (window as any).estateApi;
      if (!api) return;

      const [stats, recent] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentPayments(8)
      ]);

      setData({ stats, recent });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handler = () => setAddOpen(true);
    window.addEventListener("estate:add-payment", handler);
    return () => window.removeEventListener("estate:add-payment", handler);
  }, []);

  const s = data.stats;
  const recent = data.recent;

  return (
    <div>
      <PageHeader
        title={`${getGreeting()}, ${user?.firstName || "there"}`}
        subtitle="Here's what's happening across your properties today."
        action={
          <MagneticButton onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add payment
          </MagneticButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Buildings"        value={s.totalBuildings} icon={Building2} delta="+1"  trend="up"   delay={0.00} />
        <StatCard label="Rooms"            value={s.totalRooms}     icon={Home}      delta="+2"  trend="up"   delay={0.05} />
        <StatCard label="Occupied"         value={s.occupied}       icon={Users}     delta="92%" trend="flat" delay={0.10} />
        <StatCard label="Pending payments" value={s.pending}        icon={Receipt}   delta="-1"  trend="up"   delay={0.15} />
        <StatCard label="Monthly revenue"  value={s.monthlyRevenue} icon={DollarSign} money delta="+12%" trend="up" delay={0.20} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft h-full">
            <h3 className="text-sm font-semibold mb-4">Global Settings</h3>
            <div className="space-y-4 max-w-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Electricity Rate (per unit)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.18"
                    id="elec-rate-input"
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                  <button
                    onClick={async () => {
                      const val = (document.getElementById('elec-rate-input') as HTMLInputElement).value;
                      if (!val) return;
                      try {
                        const api = (window as any).estateApi;
                        await api.updateElectricityRate(parseFloat(val));
                        toast.success("Global electricity rate updated");
                      } catch (e) {
                        toast.error("Failed to update rate");
                      }
                    }}
                    className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-brand/90"
                  >
                    Save
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">This rate will be used for all new meter readings.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
            <Receipt className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">Ready for Billing</h3>
          <p className="text-xs text-muted-foreground mt-1">All rooms are up to date with their latest readings.</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold tracking-tight">Recent payments</div>
            <div className="text-xs text-muted-foreground">Latest activity across all properties</div>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">Loading payments...</div>
          ) : (
            <PaymentTimeline payments={recent} dense />
          )}
        </div>
      </div>

      <AddPaymentModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}
