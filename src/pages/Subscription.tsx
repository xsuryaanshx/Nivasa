import { PageHeader } from "@/components/PageHeader";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ShieldAlert, Sparkles, Building, User, LayoutGrid, Coins } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { subscription, usage, limits, refetch, isLoading } = useSubscriptionData();

  const handleSelectPlan = async (planKey: string) => {
    if (!user) return;

    let targetPlanId = "";
    if (planKey === "silver") targetPlanId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
    else if (planKey === "gold") targetPlanId = "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e";
    else if (planKey === "platinum") targetPlanId = "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f";

    try {
      // Future checkout session generation or manual upgrade
      // Since payments are not yet integrated, we perform a direct status/plan update on Supabase
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_id: targetPlanId,
          status: "active",
          updated_at: new Date().toISOString(),
          expiry_date: planKey === "platinum" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Log event
      await supabase.from("subscription_events").insert({
        user_id: user.id,
        event_type: "upgraded",
        metadata: { target_plan: planKey, updated_at: new Date().toISOString() },
      });

      toast.success(`Successfully switched to ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan!`);
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to upgrade subscription. Please try again.");
    }
  };

  const getPercentage = (count: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min(Math.round((count / limit) * 100), 100);
  };

  const getPlanBadgeColor = (planName: string) => {
    switch (planName?.toLowerCase()) {
      case "platinum":
        return "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20";
      case "gold":
        return "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-yellow-500/20";
      default:
        return "bg-secondary text-secondary-foreground border border-border";
    }
  };

  const currentPlanName = subscription?.plans?.plan_name || "silver";

  const plansList = [
    {
      key: "silver",
      name: "Silver",
      price: "₹499",
      period: "/month",
      desc: "Perfect for individual landlords managing single properties.",
      features: [
        "Up to 10 rooms limit",
        "Up to 50 tenants limit",
        "Rent management",
        "Payment tracking",
        "Basic analytics",
        "WhatsApp reminders",
        "Email support",
      ],
    },
    {
      key: "gold",
      name: "Gold",
      price: "₹899",
      period: "/month",
      desc: "Great for growing landlords with multi-unit buildings.",
      features: [
        "Up to 50 rooms limit",
        "Up to 300 tenants limit",
        "Everything in Silver",
        "Expense management",
        "Maintenance tracking",
        "Advanced analytics",
        "Tenant notes",
        "PDF exports",
        "Excel exports",
        "Priority support",
      ],
      popular: true,
    },
    {
      key: "platinum",
      name: "Platinum",
      price: "₹1199",
      period: "/month",
      desc: "Fully-featured plan for multi-property managers & teams.",
      features: [
        "Unlimited rooms limit",
        "Unlimited tenants limit",
        "Everything in Gold",
        "Multi-property management",
        "Staff management",
        "Advanced reports",
        "Automated reminders",
        "Custom branding",
        "Dedicated support",
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Sparkles className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading subscription information...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Subscription & Plan"
        subtitle="Manage your Nivasa billing, compare packages, and view your current feature limits."
      />

      {/* Current Subscription Summary */}
      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <Card className="md:col-span-1 border border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Plan
            </CardDescription>
            <div className="flex items-center justify-between mt-1">
              <CardTitle className="text-2xl font-bold">
                {subscription?.plans?.display_name || "Silver"}
              </CardTitle>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${getPlanBadgeColor(currentPlanName)}`}>
                {subscription?.status || "trial"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-border/30">
              <span className="text-muted-foreground font-medium">Billing Cycle</span>
              <span className="font-semibold text-foreground capitalize">{subscription?.billing_cycle || "monthly"}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/30">
              <span className="text-muted-foreground font-medium">Expiry Date</span>
              <span className="font-semibold text-foreground">
                {subscription?.expiry_date
                  ? format(new Date(subscription.expiry_date), "MMM dd, yyyy")
                  : "Never (Lifetime)"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/30">
              <span className="text-muted-foreground font-medium">Payment Method</span>
              <span className="font-semibold text-foreground capitalize">{subscription?.payment_provider || "manual"}</span>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            {subscription?.status === "trial" && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 w-full">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Your free trial will expire soon. Please select a plan below.</span>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Resource Usage & Limits */}
        <Card className="md:col-span-2 border border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Resource Utilization</CardTitle>
            <CardDescription>
              Your usage is tracked in real-time. Upgrading plan instantly expands your capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rooms Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Rooms
                </span>
                <span className="font-medium text-muted-foreground">
                  {usage.rooms_count} / {limits.roomLimit === -1 ? "Unlimited" : limits.roomLimit}
                </span>
              </div>
              <Progress value={limits.roomLimit === -1 ? 100 : getPercentage(usage.rooms_count, limits.roomLimit)} className="h-2" />
            </div>

            {/* Tenants Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Active Tenants
                </span>
                <span className="font-medium text-muted-foreground">
                  {usage.tenants_count} / {limits.tenantLimit === -1 ? "Unlimited" : limits.tenantLimit}
                </span>
              </div>
              <Progress value={limits.tenantLimit === -1 ? 100 : getPercentage(usage.tenants_count, limits.tenantLimit)} className="h-2" />
            </div>

            {/* Properties Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  Properties (Buildings)
                </span>
                <span className="font-medium text-muted-foreground">
                  {usage.properties_count} / {limits.features.multi_property?.enabled ? "Unlimited" : "1"}
                </span>
              </div>
              <Progress value={limits.features.multi_property?.enabled ? 100 : getPercentage(usage.properties_count, 1)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Comparison */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Flexible SaaS Pricing Plans</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Select the best plan matching your property management scale. Upgrade or downgrade anytime.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {plansList.map((plan) => {
          const isActive = currentPlanName === plan.key;
          return (
            <Card
              key={plan.key}
              className={`flex flex-col relative transition-all duration-300 border ${
                isActive
                  ? "border-primary shadow-lg ring-1 ring-primary"
                  : plan.popular
                  ? "border-primary/40 shadow-md hover:border-primary/70"
                  : "border-border hover:border-muted-foreground/30"
              } bg-card/45 backdrop-blur-sm`}
            >
              {plan.popular && (
                <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-bold text-white uppercase tracking-wider shadow">
                  Most Popular
                </span>
              )}
              <CardHeader className="text-center pb-4 pt-6">
                <CardTitle className="text-xl font-bold flex items-center justify-center gap-1.5">
                  {plan.name}
                  {isActive && <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />}
                </CardTitle>
                <CardDescription className="min-h-[40px] mt-1.5 text-xs text-muted-foreground px-2">
                  {plan.desc}
                </CardDescription>
                <div className="mt-4 flex items-baseline justify-center text-foreground">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="ml-1 text-sm font-semibold text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pb-6 pt-4 border-t border-border/40">
                <ul className="space-y-2.5 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-foreground/90 font-medium text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pb-6 pt-2 border-t border-border/40 bg-secondary/10">
                <Button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={isActive}
                  variant={isActive ? "outline" : plan.popular ? "default" : "secondary"}
                  className="w-full font-bold shadow-sm py-5.5"
                >
                  {isActive ? "Currently Active" : `Get ${plan.name}`}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
