import { useEffect, useState, useMemo } from "react";
import { nivasaApi } from "@/lib/api";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCurrency, formatMoney } from "@/lib/currency";

export function RevenueChart() {
  const { currency } = useCurrency();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        if (!nivasaApi) return;
        const data = await nivasaApi.getRecentPayments(1000);
        setPayments(data || []);
      } catch (err) {
        console.error("Error loading payments for chart:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
    window.addEventListener("nivasa:refresh", fetchPayments);
    return () => window.removeEventListener("nivasa:refresh", fetchPayments);
  }, []);

  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    
    const last6Months: { key: string; month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = months[d.getMonth()];
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      last6Months.push({
        key,
        month: monthLabel,
        revenue: 0
      });
    }

    payments.forEach(p => {
      if (p.status !== "paid") return;
      const pDate = new Date(p.date);
      if (isNaN(pDate.getTime())) return;
      const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
      const targetMonth = last6Months.find(m => m.key === key);
      if (targetMonth) {
        targetMonth.revenue += (Number(p.amount) || 0);
      }
    });

    return last6Months.map(({ month, revenue }) => ({ month, revenue }));
  }, [payments]);

  const latest = useMemo(() => {
    return chartData.length > 0 ? chartData[chartData.length - 1].revenue : 0;
  }, [chartData]);

  const percentageChange = useMemo(() => {
    const lastQuarter = chartData.slice(0, 3).reduce((sum, d) => sum + d.revenue, 0);
    const thisQuarter = chartData.slice(3, 6).reduce((sum, d) => sum + d.revenue, 0);
    if (lastQuarter === 0) return 0;
    return Math.round(((thisQuarter - lastQuarter) / lastQuarter) * 100);
  }, [chartData]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Revenue</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tnum">
            {formatMoney(latest, currency, { decimals: 0 })}
          </div>
        </div>
        {percentageChange !== 0 && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
            percentageChange > 0 
              ? "bg-emerald-500/10 text-emerald-500" 
              : "bg-red-500/10 text-red-500"
          }`}>
            {percentageChange > 0 ? `+${percentageChange}%` : `${percentageChange}%`} vs last quarter
          </span>
        )}
      </div>

      <div className="mt-5 h-[220px]">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.map(d => ({ ...d, revenue: d.revenue * currency.rate }))} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(var(--accent-blue))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--accent-blue))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tickLine={false} axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} width={40}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v: number) => `${currency.symbol}${Math.round(v / 1000)}k`} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                formatter={(v: number) => [`${currency.symbol}${Math.round(v).toLocaleString(currency.locale)}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent-blue))"
                strokeWidth={2.4} fill="url(#rev)" activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}