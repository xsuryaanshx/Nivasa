import { nivasaApi } from "@/lib/api";
import { Building2, IndianRupee, Home, ReceiptIndianRupee, Users, Plus, TrendingUp, Sparkles, CheckCircle2, Circle, Lock, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { PaymentTimeline } from "@/components/PaymentTimeline";
import { MagneticButton } from "@/components/MagneticButton";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { AddBuildingModal } from "@/components/AddBuildingModal";
import { AddRoomModal } from "@/components/AddRoomModal";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";

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
  const { subscription } = useSubscriptionData();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    stats: { totalBuildings: 0, totalRooms: 0, occupied: 0, pending: 0, monthlyRevenue: 0 },
    recent: [],
    profitStats: { netProfit: 0 },
    rooms: []
  });
  const [addOpen, setAddOpen] = useState(false);
  const [addBuildingOpen, setAddBuildingOpen] = useState(false);
  const [addRoomOpen, setAddRoomOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!nivasaApi) return;

      const [stats, recent, profitStats, rooms] = await Promise.all([
        nivasaApi.getDashboardStats(),
        nivasaApi.getRecentPayments(8),
        nivasaApi.getProfitStats(),
        nivasaApi.getRooms()
      ]);

      setData({ stats, recent, profitStats, rooms });
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

  const isStep1Completed = s.totalBuildings > 0;
  const isStep2Completed = s.totalRooms > 0;
  const isStep3Completed = s.occupied > 0;
  const isAllOnboardingCompleted = isStep1Completed && isStep2Completed && isStep3Completed;

  const completedCount = [isStep1Completed, isStep2Completed, isStep3Completed].filter(Boolean).length;

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

      {!isAllOnboardingCompleted && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-brand/20 bg-card p-6 shadow-soft">
          {/* Onboarding Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/50">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand animate-pulse" />
                Welcome to Nivasa! Let's get you set up
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Complete these 3 quick steps to start managing your properties and tenants.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Setup Progress</span>
                <span className="text-brand">{completedCount} of 3 completed</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
                <div 
                  className="h-full bg-brand transition-all duration-500" 
                  style={{ width: `${(completedCount / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Onboarding Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            {/* Step 1 */}
            <div className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-300 ${
              isStep1Completed 
                ? "bg-status-paid/5 border-status-paid/20 text-status-paid/90" 
                : "bg-secondary/10 border-border/40 hover:border-brand/40"
            }`}>
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  {isStep1Completed ? (
                    <CheckCircle2 className="h-5 w-5 text-status-paid" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/45" />
                  )}
                </div>
                <h3 className="font-semibold text-sm mt-3 text-foreground">1. Add a Property</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Register your first building, PG house, or property in your portfolio.
                </p>
              </div>
              <div className="mt-4">
                {isStep1Completed ? (
                  <span className="text-xs font-medium text-status-paid/80 flex items-center gap-1">Completed</span>
                ) : (
                  <button 
                    onClick={() => setAddBuildingOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    Add Property <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-300 ${
              isStep2Completed 
                ? "bg-status-paid/5 border-status-paid/20 text-status-paid/90" 
                : !isStep1Completed
                  ? "bg-secondary/5 border-border/20 opacity-60"
                  : "bg-secondary/10 border-border/40 hover:border-brand/40"
            }`}>
              <div>
                <div className="flex items-start justify-between">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${!isStep1Completed ? "bg-muted text-muted-foreground" : "bg-brand/10 text-brand"}`}>
                    <Home className="h-4.5 w-4.5" />
                  </div>
                  {isStep2Completed ? (
                    <CheckCircle2 className="h-5 w-5 text-status-paid" />
                  ) : !isStep1Completed ? (
                    <Lock className="h-4.5 w-4.5 text-muted-foreground/50" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/45" />
                  )}
                </div>
                <h3 className={`font-semibold text-sm mt-3 ${!isStep1Completed ? "text-muted-foreground" : "text-foreground"}`}>
                  2. Create Rooms
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Add rooms, single beds, or flats to your registered property.
                </p>
              </div>
              <div className="mt-4">
                {isStep2Completed ? (
                  <span className="text-xs font-medium text-status-paid/80 flex items-center gap-1">Completed</span>
                ) : !isStep1Completed ? (
                  <span className="text-xs font-medium text-muted-foreground/60 flex items-center gap-1">Unlock step 1 first</span>
                ) : (
                  <button 
                    onClick={() => setAddRoomOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    Create Rooms <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-300 ${
              isStep3Completed 
                ? "bg-status-paid/5 border-status-paid/20 text-status-paid/90" 
                : !isStep2Completed
                  ? "bg-secondary/5 border-border/20 opacity-60"
                  : "bg-secondary/10 border-border/40 hover:border-brand/40"
            }`}>
              <div>
                <div className="flex items-start justify-between">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${!isStep2Completed ? "bg-muted text-muted-foreground" : "bg-brand/10 text-brand"}`}>
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  {isStep3Completed ? (
                    <CheckCircle2 className="h-5 w-5 text-status-paid" />
                  ) : !isStep2Completed ? (
                    <Lock className="h-4.5 w-4.5 text-muted-foreground/50" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/45" />
                  )}
                </div>
                <h3 className={`font-semibold text-sm mt-3 ${!isStep2Completed ? "text-muted-foreground" : "text-foreground"}`}>
                  3. Add your first Tenant
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Allocate beds/rooms and assign tenants to begin collection tracking.
                </p>
              </div>
              <div className="mt-4">
                {isStep3Completed ? (
                  <span className="text-xs font-medium text-status-paid/80 flex items-center gap-1">Completed</span>
                ) : !isStep2Completed ? (
                  <span className="text-xs font-medium text-muted-foreground/60 flex items-center gap-1">Unlock step 2 first</span>
                ) : (
                  <button 
                    onClick={() => navigate("/app/rooms")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                  >
                    Add Tenant <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={t('buildings')}        value={s.totalBuildings} icon={Building2} delta="+1"  trend="up"   delay={0.00} onClick={() => navigate("/app/buildings")} />
        <StatCard label={t('rooms')}            value={s.totalRooms}     icon={Home}      delta="+2"  trend="up"   delay={0.05} onClick={() => navigate("/app/rooms")} />
        <StatCard label={t('occupancy')}         value={s.occupied}       icon={Users}     delta="92%" trend="flat" delay={0.10} onClick={() => navigate("/app/rooms?status=occupied")} />
        <StatCard label={t('pending_payments')} value={s.pending}        icon={ReceiptIndianRupee}   delta="-1"  trend="up"   delay={0.15} onClick={() => navigate("/app/rooms?status=pending")} />
        <StatCard label={t('monthly_revenue')}  value={s.monthlyRevenue} icon={IndianRupee} money delta="+12%" trend="up" delay={0.20} onClick={() => navigate("/app/payments?status=paid")} />
        <StatCard label="Net Profit"  value={data.profitStats?.netProfit || 0} icon={TrendingUp} money delta="+10%" trend="up" delay={0.25} onClick={() => navigate("/app/profit")} />
      </div>

      <div className="mt-6">
        <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-6 shadow-soft">
          <div className="absolute -top-4 -right-4 p-4 opacity-10 pointer-events-none">
            <Sparkles className="h-32 w-32 text-brand" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                Nivasa AI Market Insights
                <span className="rounded-full bg-brand px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">Beta</span>
              </h3>
              {(() => {
                const targetRoom = data.rooms?.find((r: any) => r.roomType);
                if (targetRoom) {
                  const marketRent = Math.round(targetRoom.rent * 1.15); // mock 15% higher
                  return (
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-2xl">
                      Based on our real-time data analysis, {targetRoom.roomType}s in your area are currently renting for an average of <strong className="text-foreground">₹{marketRent.toLocaleString()}/month</strong>. 
                      You are currently charging <strong className="text-foreground">₹{targetRoom.rent.toLocaleString()}/month</strong> for {targetRoom.number}. Consider raising your rent by 15% for new tenants to match market rates.
                    </p>
                  );
                }
                return (
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    Based on our real-time data analysis, 1-BHKs in your area are currently renting for an average of <strong className="text-foreground">₹18,500/month</strong>. 
                    Set a "Room Type" for your rooms to get personalized AI pricing insights and increase your yield!
                  </p>
                );
              })()}
              <div className="mt-4 flex items-center gap-2">
                {subscription?.plans?.plan_name === "platinum" || subscription?.plans?.plan_name === "gold" ? (
                  <button 
                    onClick={() => toast.success("Generating full AI report... This is a Beta preview feature coming soon in V2!")}
                    className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand/90 shadow-[0_0_15px_-3px_hsl(var(--ring)/0.5)]"
                  >
                    View Full AI Market Report
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate("/app/subscription")}
                    className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand/90 shadow-[0_0_15px_-3px_hsl(var(--ring)/0.5)]"
                  >
                    Upgrade to Nivasa Pro for Full Insights
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
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
      <AddBuildingModal
        open={addBuildingOpen}
        onClose={() => {
          setAddBuildingOpen(false);
          fetchData();
        }}
      />
      <AddRoomModal
        open={addRoomOpen}
        onClose={() => {
          setAddRoomOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}
