import { useQuery } from "@tanstack/react-query";
import { TrendingUp, IndianRupee, Wrench, Building2, Wallet, Users } from "lucide-react";
import { nivasaApi } from "@/lib/api";
import { useCurrency, formatMoney } from "@/lib/currency";

export default function ProfitPage() {
  const { currency } = useCurrency();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["profitStats"],
    queryFn: nivasaApi.getProfitStats,
  });

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            Profit & Expenses
          </h1>
          <p className="text-muted-foreground mt-1">Detailed breakdown of your financial performance</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Revenue Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="h-6 w-6" />
              <h3 className="font-semibold">Total Revenue (Paid)</h3>
            </div>
            <div className="mt-4 text-4xl font-bold tracking-tight text-foreground">
              {formatMoney(stats?.totalRevenue || 0, currency, { decimals: 0 })}
            </div>
          </div>

          {/* Expenses Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <Wrench className="h-6 w-6" />
              <h3 className="font-semibold">Total Expenses</h3>
            </div>
            <div className="mt-4 text-4xl font-bold tracking-tight text-foreground">
              {formatMoney(stats?.totalExpenses || 0, currency, { decimals: 0 })}
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Wrench className="h-4 w-4" /> Maintenance</span>
                <span className="font-medium text-foreground">{formatMoney(stats?.totalMaintenance || 0, currency, { decimals: 0 })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" /> Staff Salaries</span>
                <span className="font-medium text-foreground">{formatMoney(stats?.totalStaffSalaries || 0, currency, { decimals: 0 })}</span>
              </div>
            </div>
          </div>

          {/* Net Profit Card */}
          <div className="rounded-2xl border-2 border-brand bg-brand/5 p-6 shadow-sm flex flex-col justify-center">
            <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Net Profit
            </div>
            <div className="mt-2 text-5xl font-extrabold tracking-tight text-brand">
              {formatMoney(stats?.netProfit || 0, currency, { decimals: 0 })}
            </div>
          </div>

          {/* Building-wise Breakdown */}
          <div className="md:col-span-3 mt-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-3 mb-6">
              <Building2 className="h-6 w-6 text-brand" />
              Profit by Building
            </h2>
            
            {stats?.buildingProfits && stats.buildingProfits.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {stats.buildingProfits.map((b: any) => (
                  <div key={b.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-brand/50 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-foreground">{b.name}</h3>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/50 rounded-full text-xs font-medium text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {b.vacantRooms} Vacant Rooms
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Revenue</span>
                        <span className="text-emerald-500 font-bold text-base">{formatMoney(b.revenue || 0, currency, { decimals: 0 })}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Expenses</span>
                        <span className="text-rose-500 font-bold text-base">{formatMoney(b.expenses || 0, currency, { decimals: 0 })}</span>
                      </div>
                      
                      <div className="h-px bg-border my-2" />
                      
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-foreground uppercase tracking-wider text-sm">Net Profit</span>
                        <span className={`text-xl font-black ${b.netProfit >= 0 ? "text-brand" : "text-rose-500"}`}>
                          {formatMoney(b.netProfit || 0, currency, { decimals: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-2xl bg-secondary/20">
                <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-foreground">No building data available</p>
                <p className="text-muted-foreground">Add buildings and record payments to see profit breakdowns.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
