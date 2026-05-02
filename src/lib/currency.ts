import { createContext, useContext } from "react";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "INR" | "AED";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  // Multiplier applied to USD-based mock values for plausible display.
  rate: number;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: "USD", symbol: "$",  label: "US Dollar",        rate: 1.00,  locale: "en-US" },
  EUR: { code: "EUR", symbol: "€",  label: "Euro",             rate: 1.00,  locale: "de-DE" },
  GBP: { code: "GBP", symbol: "£",  label: "British Pound",    rate: 1.00,  locale: "en-GB" },
  INR: { code: "INR", symbol: "₹",  label: "Indian Rupee",     rate: 1.00,  locale: "en-IN" },
  AED: { code: "AED", symbol: "د.إ", label: "UAE Dirham",      rate: 1.00,  locale: "en-AE" },
};

export interface CurrencyContextValue {
  currency: CurrencyMeta;
  setCurrency: (code: CurrencyCode) => void;
}

export const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

export function formatMoney(amount: number, currency: CurrencyMeta, opts: { compact?: boolean; decimals?: number } = {}) {
  const value = amount; // Use clean number directly
  const decimals = opts.decimals ?? (value >= 1000 ? 0 : 2);
  if (opts.compact && Math.abs(value) >= 1000) {
    const k = value / 1000;
    return `${currency.symbol}${k.toFixed(k >= 100 ? 0 : 1)}k`;
  }
  const formatted = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(value);
  return `${currency.symbol}${formatted}`;
}

/** Plain numeric (no symbol) — useful for invoice text bodies. */
export function formatNumeric(amount: number, currency: CurrencyMeta, decimals = 2) {
  const value = amount;
  return new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}