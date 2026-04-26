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
  EUR: { code: "EUR", symbol: "€",  label: "Euro",             rate: 0.92,  locale: "de-DE" },
  GBP: { code: "GBP", symbol: "£",  label: "British Pound",    rate: 0.79,  locale: "en-GB" },
  INR: { code: "INR", symbol: "₹",  label: "Indian Rupee",     rate: 83.2,  locale: "en-IN" },
  AED: { code: "AED", symbol: "د.إ", label: "UAE Dirham",      rate: 3.67,  locale: "en-AE" },
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

export function formatMoney(amountUsd: number, currency: CurrencyMeta, opts: { compact?: boolean; decimals?: number } = {}) {
  const value = amountUsd * currency.rate;
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
export function formatNumeric(amountUsd: number, currency: CurrencyMeta, decimals = 2) {
  const value = amountUsd * currency.rate;
  return new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}