import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CURRENCIES, CurrencyContext, type CurrencyCode } from "@/lib/currency";

const STORAGE_KEY = "estate.currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return "INR";
    const saved = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    return saved && saved in CURRENCIES ? saved : "INR";
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch {/* ignore */}
  }, [code]);

  const value = useMemo(() => ({
    currency: CURRENCIES[code],
    setCurrency: (c: CurrencyCode) => setCode(c),
  }), [code]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}