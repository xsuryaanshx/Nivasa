import { useCurrency, formatMoney } from "@/lib/currency";

interface Props {
  /** Amount stored in USD-base. */
  value: number;
  compact?: boolean;
  decimals?: number;
  className?: string;
}

export function Money({ value, compact, decimals, className }: Props) {
  const { currency } = useCurrency();
  return <span className={className}>{formatMoney(value, currency, { compact, decimals })}</span>;
}