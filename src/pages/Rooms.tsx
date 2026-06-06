import { nivasaApi } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { RoomCard } from "@/components/RoomCard";
import { MagneticButton } from "@/components/MagneticButton";
import { type PaymentStatus } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const getFilters = (t: any): ({ key: PaymentStatus | "all"; label: string })[] => [
  { key: "all",     label: t('all') },
  { key: "paid",    label: t('paid') },
  { key: "pending", label: t('pending') },
  { key: "late",    label: t('late') },
];

export default function Rooms() {
  const { t } = useLanguage();
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

  const buildingParam = searchParams.get("building") as string | null;
  const [selectedBuilding, setSelectedBuilding] = useState<string | "all">(buildingParam || "all");

  const handleSetBuilding = (b: string | "all") => {
    setSelectedBuilding(b);
    const newParams = new URLSearchParams(searchParams);
    if (b === "all") newParams.delete("building");
    else newParams.set("building", b);
    setSearchParams(newParams);
  };
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      if (!api) return;
      const [data, payments] = await Promise.all([
        api.getRooms(),
        api.getRecentPayments(1000)
      ]);
      setRoomsList(data);
      setPaymentsList(payments);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const handler = () => fetchRooms();
    window.addEventListener("nivasa:refresh", handler);
    return () => window.removeEventListener("nivasa:refresh", handler);
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        const lastPath = sessionStorage.getItem('lastPath');
        const isFromRoomDetail = lastPath && /^\/app\/rooms\/[a-zA-Z0-9_-]+$/.test(lastPath);

        if (isFromRoomDetail) {
          const saved = sessionStorage.getItem('roomsScroll');
          if (saved) {
            window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
          }
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
          sessionStorage.setItem('roomsScroll', '0');
        }
      }, 50); // slight delay to ensure DOM layout is complete

      const handleScroll = () => {
        sessionStorage.setItem('roomsScroll', window.scrollY.toString());
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [loading]);

  const buildingsList = useMemo(() => {
    const b = new Set(roomsList.map(r => r.buildingName).filter(Boolean));
    return Array.from(b).sort();
  }, [roomsList]);

  const filtered = useMemo(() => {
    let result = roomsList.filter(r => {
      if (status !== "all" && r.status !== status) return false;
      if (selectedBuilding !== "all" && r.buildingName !== selectedBuilding) return false;
      if (!q) return true;
      const hay = `${r.number} ${r.buildingName} ${r.tenants?.map((t: any) => t.name).join(" ") ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    result.sort((a, b) => {
      const b1 = a.buildingName || '';
      const b2 = b.buildingName || '';
      if (b1 !== b2) return collator.compare(b1, b2);
      return collator.compare(a.number || '', b.number || '');
    });

    return result;
  }, [q, status, selectedBuilding, roomsList]);

  return (
    <div>
      <PageHeader
        title={t('rooms')}
        subtitle={t("rooms_subtitle")}
        action={
          <MagneticButton onClick={() => window.dispatchEvent(new CustomEvent("nivasa:add-tenant"))}>
            <UserPlus className="h-4 w-4" /> {t('add_tenant')}
          </MagneticButton>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex h-10 flex-1 min-w-[240px] max-w-md items-center gap-2 rounded-xl border border-border bg-card px-3.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={t("search_rooms")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        
        <select 
          value={selectedBuilding} 
          onChange={(e) => handleSetBuilding(e.target.value)}
          className="h-10 rounded-xl border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand"
        >
          <option value="all">All Buildings</option>
          {buildingsList.map(b => (
            <option key={b} value={b as string}>{b as string}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {getFilters(t).map(f => (
            <button
              key={f.key}
              onClick={() => handleSetStatus(f.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                status === f.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r, i) => <RoomCard key={r.id} room={r} index={i} payments={paymentsList} />)}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{t("no_rooms_match")}</div>
      <div className="mt-1 text-xs text-muted-foreground">{t("clear_search_hint")}</div>
    </div>
  );
}
