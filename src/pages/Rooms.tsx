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
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const api = (window as any).nivasaApi;
      if (!api) return;
      const data = await api.getRooms();
      setRoomsList(data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filtered = useMemo(() => roomsList.filter(r => {
    if (status !== "all" && r.status !== status) return false;
    if (!q) return true;
    const hay = `${r.number} ${r.buildingName} ${r.tenant?.name ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }), [q, status, roomsList]);

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
          {filtered.map((r, i) => <RoomCard key={r.id} room={r} index={i} />)}
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
