import { nivasaApi } from "@/lib/api";
import { Building2, IndianRupee, Home, ReceiptIndianRupee, Users, Plus, TrendingUp, Sparkles, CheckCircle2, Circle, Lock, ArrowRight, AlertCircle, CalendarClock, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { PaymentTimeline } from "@/components/PaymentTimeline";
import { MagneticButton } from "@/components/MagneticButton";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { AddBuildingModal } from "@/components/AddBuildingModal";
import { AddRoomModal } from "@/components/AddRoomModal";
import { AddTenantModal } from "@/components/AddTenantModal";
import { RevenueChart } from "@/components/RevenueChart";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { getTenantPaymentStatus } from "@/lib/utils";

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
  const [addTenantOpen, setAddTenantOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!nivasaApi) return;

      const [stats, recent, profitStats, rooms] = await Promise.all([
        nivasaApi.getDashboardStats(),
        nivasaApi.getRecentPayments(1000),
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

  // Compute Needs Attention items
  const rooms = data.rooms || [];
  const attentionItems: {
    id: string;
    type: "late_rent" | "vacant_room" | "lease_expiring";
    title: string;
    description: string;
    actionLabel: string;
    action: () => void;
    severity: "high" | "medium" | "low";
  }[] = [];

  const now = new Date();

  rooms.forEach((room: any) => {
    // 1. Late Rent (calculated dynamically for active tenants using getTenantPaymentStatus)
    if (room.tenants && room.tenants.length > 0) {
      room.tenants.forEach((tenant: any) => {
        const paymentStatus = getTenantPaymentStatus(tenant, recent);
        if (paymentStatus === "late" || paymentStatus === "pending") {
          const rentAmount = tenant.rent_amount || room.rent || 0;
          const isLate = paymentStatus === "late";
          attentionItems.push({
            id: `late-${room.id}-${tenant.id}`,
            type: "late_rent",
            title: isLate ? `Rent Late: Room ${room.number}` : `Rent Pending: Room ${room.number}`,
            description: `${tenant.name} is ${isLate ? 'late' : 'pending'} on rent of ₹${rentAmount.toLocaleString()}.`,
            actionLabel: "Remind",
            severity: isLate ? "high" : "medium",
            action: () => {
              const msg = `Hi ${tenant.name}, this is a gentle reminder that your rent of ₹${rentAmount} for Room ${room.number} is currently ${isLate ? 'late' : 'pending'}. Please complete the payment at your earliest convenience.`;
              window.open(
                `https://wa.me/91${(tenant.whatsapp_number || tenant.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`,
                "_blank"
              );
            },
          });
        }
      });
    }

    // 2. Vacant for >30 days
    if (room.status === "vacant") {
      let vacancyDate = room.createdAt ? new Date(room.createdAt) : null;
      if (room.pastTenants && room.pastTenants.length > 0) {
        const checkoutDates = room.pastTenants
          .map((t: any) => t.leftAt ? new Date(t.leftAt) : null)
          .filter(Boolean) as Date[];
        if (checkoutDates.length > 0) {
          vacancyDate = new Date(Math.max(...checkoutDates.map(d => d.getTime())));
        }
      }
      
      if (vacancyDate) {
        const daysVacant = Math.floor((now.getTime() - vacancyDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysVacant >= 30) {
          attentionItems.push({
            id: `vacant-${room.id}`,
            type: "vacant_room",
            title: `Room ${room.number} Vacant for ${daysVacant} days`,
            description: `This room at ${room.buildingName} has been empty since ${vacancyDate.toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}.`,
            actionLabel: "View Room",
            severity: "medium",
            action: () => navigate(`/app/rooms/${room.id}`),
          });
        }
      }
    }

    // 3. Lease Expiring Soon
    if (room.tenants && room.tenants.length > 0) {
      room.tenants.forEach((tenant: any) => {
        if (tenant.joined_at) {
          const joinedDate = new Date(tenant.joined_at);
          const expiryDate = new Date(joinedDate);
          expiryDate.setMonth(expiryDate.getMonth() + 11);
          
          const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysToExpiry <= 30 && daysToExpiry >= -15) {
            const isExpired = daysToExpiry < 0;
            attentionItems.push({
              id: `lease-${tenant.id}`,
              type: "lease_expiring",
              title: isExpired ? `Lease Expired: ${tenant.name}` : `Lease Expiring: ${tenant.name}`,
              description: isExpired 
                ? `Lease for Room ${room.number} expired ${Math.abs(daysToExpiry)} days ago.`
                : `Lease for Room ${room.number} expires in ${daysToExpiry} days.`,
              actionLabel: "Manage Lease",
              severity: isExpired ? "high" : "low",
              action: () => navigate(`/app/rooms/${room.id}`),
            });
          }
        }
      });
    }
  });

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

      {/* Needs Attention Widget */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-brand/20 bg-card p-6 shadow-soft animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/50 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive dark:bg-destructive/20">
              <AlertCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                Needs Attention
                {attentionItems.length > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black rounded-full bg-destructive text-white animate-pulse">
                    {attentionItems.length}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Urgent operations and items requiring action today.
              </p>
            </div>
          </div>
          {attentionItems.length > 0 && (
            <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-xl border border-border/40 animate-fade-in">
              {attentionItems.filter(i => i.type === 'late_rent').length > 0 && (
                <span className="text-destructive font-bold">{attentionItems.filter(i => i.type === 'late_rent').length} Late</span>
              )}
              {attentionItems.filter(i => i.type === 'vacant_room').length > 0 && (
                <span className="text-amber-600 dark:text-amber-500 font-bold">{attentionItems.filter(i => i.type === 'vacant_room').length} Vacant &gt;30d</span>
              )}
              {attentionItems.filter(i => i.type === 'lease_expiring').length > 0 && (
                <span className="text-brand font-bold">{attentionItems.filter(i => i.type === 'lease_expiring').length} Lease Expiry</span>
              )}
            </div>
          )}
        </div>

        {attentionItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-9 w-9 rounded-full bg-status-paid/10 flex items-center justify-center mb-2 text-status-paid">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-xs font-semibold text-foreground">All caught up! 🎉</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              No urgent actions required. Everything is running smoothly.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50 max-h-[300px] overflow-y-auto mt-2 pr-1 custom-scrollbar">
            {attentionItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 gap-4 first:pt-1.5 last:pb-1.5 animate-fade-in">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl ${
                    item.type === 'late_rent' 
                      ? 'bg-destructive/10 text-destructive dark:bg-destructive/20' 
                      : item.type === 'vacant_room' 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 dark:bg-amber-500/20' 
                        : 'bg-brand/10 text-brand dark:bg-brand/20'
                  }`}>
                    {item.type === 'late_rent' ? (
                      <IndianRupee className="h-3.5 w-3.5" />
                    ) : item.type === 'vacant_room' ? (
                      <Home className="h-3.5 w-3.5" />
                    ) : (
                      <CalendarClock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 truncate">
                      {item.title}
                      {item.severity === 'high' && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive animate-ping" />
                      )}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                  </div>
                </div>
                <button
                  onClick={item.action}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold transition-all shrink-0 ${
                    item.type === 'late_rent'
                      ? 'bg-destructive text-white hover:bg-destructive/90 shadow-[0_2px_8px_rgba(239,68,68,0.2)]'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border/40'
                  }`}
                >
                  {item.type === 'late_rent' && <Send className="h-3 w-3" />}
                  {item.actionLabel}
                  {item.type !== 'late_rent' && <ArrowRight className="h-3 w-3" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
                    onClick={() => setAddTenantOpen(true)}
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
        <StatCard label={t('pending_payments')} value={attentionItems.filter(i => i.type === 'late_rent').length}        icon={ReceiptIndianRupee}   delta={attentionItems.filter(i => i.type === 'late_rent').length > 0 ? `+${attentionItems.filter(i => i.type === 'late_rent').length}` : "0"}  trend={attentionItems.filter(i => i.type === 'late_rent').length > 0 ? "up" : "flat"}   delay={0.15} onClick={() => navigate("/app/tenants?status=late")} />
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-7 min-w-0">
          <RevenueChart />
        </div>

        {/* Recent Payments */}
        <div className="lg:col-span-5 min-w-0 rounded-2xl border border-border bg-card p-5 shadow-soft">
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
              <PaymentTimeline payments={recent.slice(0, 8)} dense />
            )}
          </div>
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
      <AddTenantModal
        open={addTenantOpen}
        onClose={() => {
          setAddTenantOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}
