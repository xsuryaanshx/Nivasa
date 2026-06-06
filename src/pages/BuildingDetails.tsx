import { nivasaApi } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, MoreHorizontal, Plus, ArrowLeft, Users, ReceiptIndianRupee, DoorOpen } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MagneticButton } from "@/components/MagneticButton";
import { Money } from "@/components/Money";
import { toast } from "sonner";
import { EditBuildingModal } from "@/components/EditBuildingModal";
import { useLanguage } from "@/components/LanguageProvider";
import { buildTiersFromBaseAndPerAdditional } from "@/lib/rentByOccupancy";
import { cn } from "@/lib/utils";
import { RoomActionSheet } from "@/components/RoomActionSheet";
import type { Room } from "@/lib/types";

export default function BuildingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isEditingBuilding, setIsEditingBuilding] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: "", rent: "" });
  const [useOccRent, setUseOccRent] = useState(false);
  const [occBase, setOccBase] = useState("");
  const [occPer, setOccPer] = useState("");
  const [occMax, setOccMax] = useState("4");
  const [addingRoom, setAddingRoom] = useState(false);

  // Long press for room table rows
  const [selectedRoomForSheet, setSelectedRoomForSheet] = useState<Room | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [pressingRoomId, setPressingRoomId] = useState<string | null>(null);

  const startPress = (roomId: string, clientX: number, clientY: number) => {
    isLongPressedRef.current = false;
    startPosRef.current = { x: clientX, y: clientY };
    setPressingRoomId(roomId);

    timerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      setPressingRoomId(null);
      if (navigator.vibrate) {
        navigator.vibrate(60);
      }
      const r = data?.units?.find((u: any) => u.id === roomId);
      if (r) {
        setSelectedRoomForSheet({
          id: r.id,
          number: r.number,
          buildingId: data.id,
          buildingName: data.name,
          rent: r.rent_amount,
          occupancyPrices: r.occupancy_prices,
          status: r.status,
          tenants: r.tenants,
          prevReading: 0,
          currReading: 0,
          ratePerUnit: 0.18,
          history: [],
          pastTenants: []
        });
      }
    }, 600);
  };

  const endPress = () => {
    setPressingRoomId(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchStart = (roomId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPress(roomId, touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    endPress();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPosRef.current.x);
    const dy = Math.abs(touch.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      endPress();
    }
  };

  const handleMouseDown = (roomId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startPress(roomId, e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    endPress();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!pressingRoomId) return;
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      endPress();
    }
  };


  const fetchData = async () => {
    try {
      setLoading(true);
      if (!nivasaApi) return;
      const buildingData = await nivasaApi.getPropertyDetails(id);
      setData(buildingData);
    } catch (error) {
      console.error("Error fetching building details:", error);
      toast.error("Failed to load property details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    window.addEventListener("nivasa:refresh", handler);
    return () => window.removeEventListener("nivasa:refresh", handler);
  }, [id]);

  const handleAddRoom = async () => {
    if (!newRoom.number.trim()) return toast.error("Room number is required");

    if (useOccRent) {
      const base = parseFloat(occBase);
      const per = parseFloat(occPer);
      const maxM = parseInt(occMax, 10);
      if (isNaN(base) || base <= 0) return toast.error("Enter a valid base rent for one occupant");
      if (isNaN(per) || per < 0) return toast.error("Enter a valid amount for each additional occupant (0 is ok)");
      if (isNaN(maxM) || maxM < 2 || maxM > 24) return toast.error("Max occupants must be between 2 and 24");
    } else {
      if (!newRoom.rent || isNaN(parseFloat(newRoom.rent))) return toast.error("Valid rent amount is required");
    }

    try {
      setAddingRoom(true);
      if (useOccRent) {
        const base = parseFloat(occBase);
        const per = parseFloat(occPer);
        const maxM = parseInt(occMax, 10);
        await nivasaApi.addRoom({
          building_id: id,
          number: newRoom.number.trim(),
          rent: base,
          occupancy_prices: buildTiersFromBaseAndPerAdditional(base, per, maxM),
        });
      } else {
        await nivasaApi.addRoom({
          building_id: id,
          number: newRoom.number.trim(),
          rent: parseFloat(newRoom.rent),
        });
      }

      toast.success("Room added successfully");
      setIsAddingRoom(false);
      setNewRoom({ number: "", rent: "" });
      setUseOccRent(false);
      setOccBase("");
      setOccPer("");
      setOccMax("4");
      fetchData();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (error) {
      toast.error("Failed to add room");
    } finally {
      setAddingRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">{t("loading_property_details")}</p>
      </div>
    );
  }

  if (!data) return <div className="text-center py-20">{t("property_not_found")}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="pb-20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/app/buildings")} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              {data.name}
              <button
                onClick={() => setIsEditingBuilding(true)}
                className="text-xs font-normal text-muted-foreground hover:text-brand underline underline-offset-4"
              >
                {t("edit")}
              </button>
            </h1>
            <p className="text-sm text-muted-foreground">{data.address}</p>
          </div>
        </div>
      </div>

      <EditBuildingModal
        open={isEditingBuilding}
        onClose={() => setIsEditingBuilding(false)}
        onSuccess={fetchData}
        buildingData={{ id: data.id, name: data.name, address: data.address, total_rooms: data.units?.length }}
      />

      {/* Stats */}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <DoorOpen className="h-3 w-3" /> {t("total_rooms")}
          </div>
          <div className="mt-1 text-2xl font-bold">{data.units.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Users className="h-3 w-3" /> {t("occupancy")}
          </div>
          <div className="mt-1 text-2xl font-bold">{Math.round(data.occupancyRate)}%</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft border-brand/20 bg-brand/[0.02]">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-brand/70">
            <ReceiptIndianRupee className="h-3 w-3" /> {t("potential_revenue")}
          </div>
          <div className="mt-1 text-2xl font-bold text-brand">
            <Money value={data.units.reduce((acc: number, u: any) => acc + (u.rent_amount || 0), 0)} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Users className="h-3 w-3" /> {t("active_tenants")}
          </div>
          <div className="mt-1 text-2xl font-bold">{data.tenants.length}</div>
        </div>
      </div>

      {/* Rooms list */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("rooms_tenants")}</h2>
          <MagneticButton onClick={() => setIsAddingRoom(!isAddingRoom)} className="h-9 px-4 text-xs">
            <Plus className="h-3.5 w-3.5 mr-2" /> {isAddingRoom ? t("cancel") : t("add_room")}
          </MagneticButton>
        </div>

        <AnimatePresence>
          {isAddingRoom && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 overflow-hidden rounded-2xl border border-brand/20 bg-brand/[0.02] p-6"
            >
              <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/60 p-3">
                <input
                  type="checkbox"
                  checked={useOccRent}
                  onChange={(e) => setUseOccRent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border"
                />
                <span>
                  <span className="text-sm font-medium">{t("occupancy_based_rent")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t("occupancy_based_rent_hint")}</span>
                </span>
              </label>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("room_number")}</label>
                  <input
                    type="text"
                    placeholder="e.g. 101 or Master Bedroom"
                    value={newRoom.number}
                    onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                </div>

                {!useOccRent ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("monthly_rent")}</label>
                    <input
                      type="number" inputMode="decimal" step="any"
                      placeholder="0.00"
                      value={newRoom.rent}
                      onChange={(e) => setNewRoom({ ...newRoom, rent: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("rent_one_occupant")}</label>
                      <input
                        type="number" inputMode="decimal" step="any"
                        placeholder="0.00"
                        value={occBase}
                        onChange={(e) => setOccBase(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("per_additional_occupant")}</label>
                      <input
                        type="number" inputMode="decimal" step="any"
                        placeholder="0.00"
                        value={occPer}
                        onChange={(e) => setOccPer(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("max_occupants_tiers")}</label>
                      <input
                        type="number" inputMode="decimal" step="any"
                        min={2}
                        max={24}
                        placeholder="4"
                        value={occMax}
                        onChange={(e) => setOccMax(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-end md:col-span-2 lg:col-span-1">
                  <button
                    onClick={handleAddRoom}
                    disabled={addingRoom}
                    className="h-[38px] w-full rounded-xl bg-brand text-sm font-semibold text-white shadow-glow hover:bg-brand/90 disabled:opacity-60 transition-opacity"
                  >
                    {addingRoom ? t("adding") : t("create_room")}
                  </button>
                </div>
              </div>

              {useOccRent && occBase && !isNaN(parseFloat(occBase)) && (
                <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 px-4 py-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t("generated_preview")}: </span>
                  {buildTiersFromBaseAndPerAdditional(
                    parseFloat(occBase),
                    parseFloat(occPer) || 0,
                    Math.min(24, Math.max(2, parseInt(occMax, 10) || 4)),
                  )
                    .slice(0, 6)
                    .map((tier) => (
                      <span key={tier.members} className="ml-2 inline-block whitespace-nowrap">
                        {tier.members} {t("people")}: <span className="tnum font-medium text-foreground">{tier.amount}</span>
                      </span>
                    ))}
                  <span className="mt-1 block text-[11px]">{t("configure_later_in_room")}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/30 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">{t("room")}</th>
                <th className="px-6 py-4 font-medium">{t("status")}</th>
                <th className="px-6 py-4 font-medium">{t("tenant")}</th>
                <th className="px-6 py-4 font-medium text-right">{t("rent")}</th>
                <th className="px-6 py-4 font-medium text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.units.map((room: any) => (
                <tr
                  key={room.id}
                  onMouseDown={(e) => handleMouseDown(room.id, e)}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  onTouchStart={(e) => handleTouchStart(room.id, e)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  onClick={(e) => {
                    if (isLongPressedRef.current) {
                      e.preventDefault();
                      e.stopPropagation();
                      isLongPressedRef.current = false;
                      return;
                    }
                    navigate(`/app/rooms/${room.id}`);
                  }}
                  className={cn(
                    "transition-all duration-150 cursor-pointer select-none",
                    pressingRoomId === room.id ? "bg-secondary/35 scale-[0.99]" : "hover:bg-secondary/10"
                  )}
                >
                  <td className="px-6 py-4 font-semibold">{room.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${
                      room.status === "occupied"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}>
                      {room.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {room.tenants && room.tenants.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                          {room.tenants[0].name[0]}
                        </div>
                        {room.tenants[0].name}
                        {room.tenants.length > 1 && <span className="text-[10px] opacity-70">(+{room.tenants.length - 1})</span>}
                      </div>
                    ) : (
                      <span className="opacity-30">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-right tabular-nums">
                    <Money value={room.rent_amount} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/rooms/${room.id}`); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data.units.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <DoorOpen className="h-10 w-10 opacity-10 mb-3" />
                      <p className="text-sm italic">{t("no_rooms_added")}</p>
                      <button onClick={() => setIsAddingRoom(true)} className="mt-3 text-xs text-brand hover:underline">
                        {t("add_first_room")}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedRoomForSheet && (
        <RoomActionSheet
          open={!!selectedRoomForSheet}
          onClose={() => setSelectedRoomForSheet(null)}
          room={selectedRoomForSheet}
          onSuccess={fetchData}
        />
      )}
    </motion.div>
  );
}
