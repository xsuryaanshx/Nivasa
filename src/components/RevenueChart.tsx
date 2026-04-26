import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { revenueSeries } from "@/lib/mockData";
import { useCurrency, formatMoney } from "@/lib/currency";

export function RevenueChart() {
  const { currency } = useCurrency();
  const latest = revenueSeries[revenueSeries.length - 1].revenue;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Revenue</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tnum">{formatMoney(latest, currency, { decimals: 0 })}</div>
        </div>
        <span className="pill-paid inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium">+12% vs last quarter</span>
      </div>

      <div className="mt-5 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueSeries.map(d => ({ ...d, revenue: d.revenue * currency.rate }))} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
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
      </div>
    </div>
  );
}