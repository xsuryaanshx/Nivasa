import { Building2, DollarSign, Home, Receipt, Users, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { InsightsPanel } from "@/components/InsightsPanel";
import { RevenueChart } from "@/components/RevenueChart";
import { PaymentTimeline } from "@/components/PaymentTimeline";
import { MagneticButton } from "@/components/MagneticButton";
import { AddPaymentModal } from "@/components/AddPaymentModal";

export default function Dashboard() {
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
        title="Good morning, Jordan"
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
        <div className="lg:col-span-2"><RevenueChart /></div>
        <InsightsPanel />
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
          fetchData(); // Refresh data after adding payment
        }} 
      />
    </div>
  );
}
