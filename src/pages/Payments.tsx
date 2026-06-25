import { nivasaApi } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { PaymentTimeline } from "@/components/PaymentTimeline";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { VerifyPaymentModal } from "@/components/VerifyPaymentModal";
import { Money } from "@/components/Money";
import { type PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { downloadExcel } from "@/lib/export";
import { FileSpreadsheet } from "lucide-react";

const getFilters = (t: ReturnType<typeof useLanguage>["t"]): ({ key: PaymentStatus | "all"; label: string })[] => [
  { key: "all", label: t("all") },
  { key: "paid", label: t("paid") },
  { key: "pending", label: t("pending") },
  { key: "late", label: t("late") },
];

export default function Payments() {
  const { t } = useLanguage();
  const { canAccessFeature } = useSubscriptionData();
  const canExport = canAccessFeature("excel_exports");
  const [q, setQ] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status") as PaymentStatus | "all" | null;
  const [status, setStatus] = useState<PaymentStatus | "all">(statusParam || "all");

  const handleSetStatus = (s: PaymentStatus | "all") => {
    setStatus(s);
    const newParams = new URLSearchParams(searchParams);
    if (s === "all") newParams.delete("status");
    else newParams.set("status", s);
    setSearchParams(newParams);
  };
  const [open, setOpen] = useState(false);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      if (!nivasaApi) return;
      const data = await nivasaApi.getRecentPayments(100); // Fetch more for the payments page
      setPaymentsList(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    const h = () => setOpen(true);
    const refreshHandler = () => fetchPayments();

    window.addEventListener("nivasa:add-payment", h);
    window.addEventListener("nivasa:refresh", refreshHandler);

    return () => {
      window.removeEventListener("nivasa:add-payment", h);
      window.removeEventListener("nivasa:refresh", refreshHandler);
    };
  }, []);

  const filtered = useMemo(() => {
    return [...paymentsList]
      .filter(p => status === "all" || p.status === status)
      .filter(p => !q || `${p.tenantName} ${p.method}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [q, status, paymentsList]);

  const total = filtered.reduce((s, p) => s + p.amount, 0);
  const outstanding = paymentsList.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0);

  const handleExport = () => {
    if (!canExport) return;
    const dataToExport = filtered.map(p => ({
      "Date": p.date,
      "Tenant Name": p.tenantName,
      "Room": p.roomNumber,
      "Amount": p.amount,
      "Method": p.method,
      "Status": p.status
    }));
    downloadExcel(dataToExport, "rent_roll.xlsx");
  };

  return (
    <div>
      <PageHeader
        title={t("payments")}
        subtitle={t("payments_subtitle")}
        action={
          <div className="flex items-center gap-2">
            {canExport && (
              <MagneticButton onClick={handleExport} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Export Excel
              </MagneticButton>
            )}
            <MagneticButton onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t("add_payment")}
            </MagneticButton>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Stat label={t("filtered_total")} value={<Money value={total} />} />
        <Stat label={t("records")} value={loading ? "..." : filtered.length.toString()} />
        <Stat label={t("outstanding")} value={<Money value={outstanding} />} accent />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex h-10 flex-1 min-w-[240px] max-w-md items-center gap-2 rounded-xl border border-border bg-card px-3.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("search_tenant_method")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {getFilters(t).map(f => (
            <button key={f.key} onClick={() => handleSetStatus(f.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                status === f.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground italic">{t("loading_payments")}</div>
        ) : (
          <PaymentTimeline 
            payments={filtered} 
            onVerifyClick={(p) => {
              setSelectedPayment(p);
              setVerifyOpen(true);
            }} 
          />
        )}
      </div>

      <AddPaymentModal 
        open={open} 
        onClose={() => {
          setOpen(false);
          fetchPayments();
        }} 
      />

      <VerifyPaymentModal
        open={verifyOpen}
        onClose={() => {
          setVerifyOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onSuccess={fetchPayments}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border p-4 shadow-soft",
      accent ? "border-transparent bg-gradient-brand text-white" : "border-border bg-card",
    )}>
      <div className={cn("text-[11px] font-medium", accent ? "text-white/70" : "text-muted-foreground")}>{label}</div>
      <div className="mt-1 text-xl font-semibold tnum tracking-tight">{value}</div>
    </div>
  );
}
