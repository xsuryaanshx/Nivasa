import { nivasaApi } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, UserPlus, DoorOpen, ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { RoomCard } from "@/components/RoomCard";
import { MagneticButton } from "@/components/MagneticButton";
import { type PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ErrorBanner } from "@/components/ErrorBanner";

const getFilters = (t: any): ({ key: PaymentStatus | "all"; label: string })[] => [
  { key: "all",     label: t('all') },
  { key: "paid",    label: t('paid') },
  { key: "pending", label: t('pending') },
  { key: "late",    label: t('late') },
];

export default function Rooms() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status") as PaymentStatus | "all" | null;
  const [status, setStatus] = useState<PaymentStatus | "all">(statusParam || "all");
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<Set<string>>(new Set());

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
  const [error, setError] = useState<any>(null);
  const [collapsedBuildings, setCollapsedBuildings] = useState<Record<string, boolean>>({});

  const toggleBuilding = (bName: string) => {
    setCollapsedBuildings(prev => ({
      ...prev,
      [bName]: !prev[bName]
    }));
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!nivasaApi) return;
      const [data, payments] = await Promise.all([
        nivasaApi.getRooms(),
        nivasaApi.getRecentPayments(1000)
      ]);
      setRoomsList(data);
      setPaymentsList(payments);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const refreshHandler = () => fetchRooms();
    
    const handleDeleteOptimistic = (e: any) => {
      setOptimisticDeletedIds(prev => new Set([...prev, e.detail.id]));
    };
    
    const handleUndoDelete = (e: any) => {
      setOptimisticDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(e.detail.id);
        return next;
      });
    };
    
    window.addEventListener("nivasa:refresh", refreshHandler);
    window.addEventListener("nivasa:optimistic-delete-room", handleDeleteOptimistic);
    window.addEventListener("nivasa:undo-delete-room", handleUndoDelete);

    return () => {
      window.removeEventListener("nivasa:refresh", refreshHandler);
      window.removeEventListener("nivasa:optimistic-delete-room", handleDeleteOptimistic);
      window.removeEventListener("nivasa:undo-delete-room", handleUndoDelete);
    };
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
      if (optimisticDeletedIds.has(r.id)) return false;
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

      {error && <ErrorBanner error={error} onRetry={fetchRooms} />}

      <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex h-10 w-full sm:flex-1 min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={t("search_rooms")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
          />
        </div>

        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1 rounded-xl border border-border bg-card p-1 overflow-x-auto hide-scrollbar">
          {getFilters(t).map(f => (
            <button
              key={f.key}
              onClick={() => handleSetStatus(f.key)}
              className={cn(
                "flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap text-center",
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
        <div className="flex flex-col gap-10">
          {Object.entries(
            filtered.reduce((acc, r) => {
              const b = r.buildingName || "Unknown Property";
              if (!acc[b]) acc[b] = [];
              acc[b].push(r);
              return acc;
            }, {} as Record<string, any[]>)
          ).map(([buildingName, rooms]: [string, any[]]) => {
            const occupied = rooms.filter(r => r.status === "occupied" || (r.tenants && r.tenants.length > 0)).length;
            const vacant = rooms.length - occupied;
            const occRate = rooms.length > 0 ? (occupied / rooms.length) * 100 : 0;
            
            return (
              <div key={buildingName} className="flex flex-col">
                <div 
                  className="mb-4 cursor-pointer select-none group"
                  onClick={() => toggleBuilding(buildingName)}
                >
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/80 mb-1 group-hover:text-foreground/80 transition-colors">
                    ROOMS &bull; {rooms.length} TOTAL
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight group-hover:text-brand transition-colors">
                      {buildingName}
                    </h2>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 group-hover:bg-secondary transition-colors">
                      <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", collapsedBuildings[buildingName] ? "-rotate-90" : "rotate-0")} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                      <span className="text-foreground/90 tracking-wide">Occupied {occupied}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-secondary-foreground/20"></div>
                      <span className="text-foreground/90 tracking-wide">Vacant {vacant}</span>
                    </div>
                  </div>
                </div>

                {!collapsedBuildings[buildingName] && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
                  {rooms.map((room: any, index: number) => (
                    <RoomCard key={room.id} room={room} index={index} payments={paymentsList} />
                  ))}
                </div>

                {rooms.length > 0 && (
                  <div className="mt-6 flex items-center justify-between rounded-[28px] bg-card p-6 shadow-sm border border-border/60">
                    <div className="flex-shrink-0">
                      <div className="text-[13px] font-medium text-muted-foreground mb-0.5">{t("occupancy")}</div>
                      <div className="text-3xl font-bold tracking-tight">{Math.round(occRate)}%</div>
                    </div>
                    <div className="h-3 w-full ml-6 mr-1 bg-secondary rounded-full overflow-hidden flex">
                       <div className="bg-green-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${occRate}%` }} />
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            );
          })}
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
