import { nivasaApi } from "@/lib/api";
import { Building2, IndianRupee, Home, ReceiptIndianRupee, Users, Plus, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { PaymentTimeline } from "@/components/PaymentTimeline";
import { MagneticButton } from "@/components/MagneticButton";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

function getGreetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return "good_morning";
  if (hour < 17) return "good_afternoon";
  return "good_evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { totalBuildings: 0, totalRooms: 0, occupied: 0, pending: 0, monthlyRevenue: 0 },
    recent: [],
    profitStats: { netProfit: 0 }
  });
  const [addOpen, setAddOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!nivasaApi) return;

      const [stats, recent, profitStats] = await Promise.all([
        nivasaApi.getDashboardStats(),
        nivasaApi.getRecentPayments(8),
        nivasaApi.getProfitStats()
      ]);

      setData({ stats, recent, profitStats });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handler = () => setAddOpen(true);
    const refreshHandler = () => fetchData();
    
    window.addEventListener("nivasa:add-payment", handler);
    window.addEventListener("nivasa:refresh", refreshHandler);
    
    return () => {
      window.removeEventListener("nivasa:add-payment", handler);
      window.removeEventListener("nivasa:refresh", refreshHandler);
    };
  }, []);

  const s = data.stats;
  const recent = data.recent;

  return (
    <div>
      <PageHeader
        title={`${t(getGreetingKey() as any)}, ${user?.fullName || t('user')}`}
        subtitle={t("dashboard_subtitle")}
        action={
          <MagneticButton onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> {t('add_payment')}
          </MagneticButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={t('buildings')}        value={s.totalBuildings} icon={Building2} delta="+1"  trend="up"   delay={0.00} onClick={() => navigate("/app/buildings")} />
        <StatCard label={t('rooms')}            value={s.totalRooms}     icon={Home}      delta="+2"  trend="up"   delay={0.05} onClick={() => navigate("/app/rooms")} />
        <StatCard label={t('occupancy')}         value={s.occupied}       icon={Users}     delta="92%" trend="flat" delay={0.10} onClick={() => navigate("/app/rooms?status=occupied")} />
        <StatCard label={t('pending_payments')} value={s.pending}        icon={ReceiptIndianRupee}   delta="-1"  trend="up"   delay={0.15} onClick={() => navigate("/app/rooms?status=pending")} />
        <StatCard label={t('monthly_revenue')}  value={s.monthlyRevenue} icon={IndianRupee} money delta="+12%" trend="up" delay={0.20} onClick={() => navigate("/app/payments?status=paid")} />
        <StatCard label="Net Profit"  value={data.profitStats?.netProfit || 0} icon={TrendingUp} money delta="+10%" trend="up" delay={0.25} onClick={() => navigate("/app/profit")} />
      </div>

      <div className="mt-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
            <ReceiptIndianRupee className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">{t("ready_for_billing")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("billing_ready_text")}</p>
        </div>
      </div>

      <div className="mt-6 min-w-0 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex min-w-0 items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">{t('recent_payments')}</div>
            <div className="text-xs text-muted-foreground">{t("latest_activity")}</div>
          </div>
        </div>
        <div className="mt-4 min-w-0">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">{t("loading_payments")}</div>
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
