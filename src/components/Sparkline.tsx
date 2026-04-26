import { Area, AreaChart, ResponsiveContainer } from "recharts";

export function Sparkline({ data, gradientId }: { data: { units: number }[]; gradientId: string }) {
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="hsl(var(--accent-blue))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--accent-blue))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="units" stroke="hsl(var(--accent-blue))" strokeWidth={1.6} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}