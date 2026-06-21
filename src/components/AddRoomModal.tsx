import { nivasaApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DoorOpen, CheckCircle2, Building2, Plus, Users, Landmark } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { toast } from "sonner";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { PremiumUpgradeModal } from "./PremiumUpgradeModal";
import { buildTiersFromBaseAndPerAdditional } from "@/lib/rentByOccupancy";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  buildingId?: string;
}

export function AddRoomModal({ open, onClose, onSuccess, buildingId }: Props) {
  const { usage, limits } = useSubscriptionData();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId || "");
  const [number, setNumber] = useState("");
  const [rent, setRent] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [rentType, setRentType] = useState<"total" | "per_person">("total");
  const [roomType, setRoomType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    if (open) {
      setSuccess(false);
      setError(null);
      setNumber("");
      setRent("");
      setCapacity("1");
      setRentType("total");
      setRoomType("");
      setSelectedBuildingId(buildingId || "");

      // If no buildingId is preset, fetch list of buildings
      if (!buildingId) {
        nivasaApi.getBuildings()
          .then((data) => {
            setBuildings(data);
            if (data.length > 0) {
              setSelectedBuildingId(data[0].id);
            }
          })
          .catch((err) => console.error("Error loading buildings:", err));
      }
    }
  }, [open, buildingId]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeBuildingId = buildingId || selectedBuildingId;
    if (!activeBuildingId) {
      setError("Please select a property");
      return;
    }
    if (!number.trim()) {
      setError("Room number/name is required");
      return;
    }
    if (!rent || isNaN(parseFloat(rent)) || parseFloat(rent) < 0) {
      setError("Please enter a valid rent amount");
      return;
    }

    // Gating Checks
    const currentRoomsCount = usage?.rooms_count || 0;
    const roomLimit = limits?.roomLimit ?? 10;
    if (roomLimit !== -1 && currentRoomsCount >= roomLimit) {
      setModalTitle("Room Limit Reached");
      setModalMessage(`Your current plan allows up to ${roomLimit} rooms. Upgrade to Gold or Platinum to continue.`);
      setShowUpgradeModal(true);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const rentAmt = parseFloat(rent);

      if (rentType === "per_person") {
        await nivasaApi.addRoom({
          building_id: activeBuildingId,
          number: number.trim(),
          rent: rentAmt,
          capacity: parseInt(capacity) || 1,
          occupancy_prices: buildTiersFromBaseAndPerAdditional(rentAmt, rentAmt, 10), // Generate up to 10 occupants
          room_type: roomType || undefined,
        });
      } else {
        await nivasaApi.addRoom({
          building_id: activeBuildingId,
          number: number.trim(),
          rent: rentAmt,
          capacity: parseInt(capacity) || 1,
          room_type: roomType || undefined,
        });
      }

      setSuccess(true);
      toast.success("Room created successfully", {
        description: `Room ${number} has been added.`,
      });

      setTimeout(() => {
        handleClose();
        onSuccess?.();
        window.dispatchEvent(new CustomEvent("nivasa:refresh"));
      }, 1500);
    } catch (err: any) {
      console.error("Error adding room:", err);
      setError(err.message || "Failed to add room");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={handleClose}
      title="Create New Room"
      description="Add a room, flat, or single bed space to your property"
    >
      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-status-paid/15 text-status-paid">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Room Created Successfully!</h3>
          <p className="mt-1 text-sm text-muted-foreground text-pretty max-w-[240px]">
            The new unit has been registered to the property.
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Dropdown (only visible if buildingId prop is not provided) */}
          {!buildingId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Select Property</label>
              <div className="relative flex items-center">
                <Building2 className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 appearance-none"
                >
                  {buildings.length === 0 && <option value="">No buildings found</option>}
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Room Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Room Number/Name</label>
            <div className="relative">
              <DoorOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g. 101 or Master Bedroom"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Rent Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rent Amount</label>
              <div className="relative">
                <Landmark className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 8000"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </div>
            </div>

            {/* Beds capacity */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Number of Beds</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Rent Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rent Type</label>
              <select
                value={rentType}
                onChange={(e) => setRentType(e.target.value as "total" | "per_person")}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 px-3 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 appearance-none"
              >
                <option value="total">Total Rent</option>
                <option value="per_person">Per Person</option>
              </select>
            </div>

            {/* Room Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Room Type (Optional)</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 px-3 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 appearance-none"
              >
                <option value="">Select Type</option>
                <option value="1-BHK">1-BHK</option>
                <option value="2-BHK">2-BHK</option>
                <option value="3-BHK">3-BHK</option>
                <option value="1-RK">1-RK</option>
                <option value="Single Room">Single Room</option>
                <option value="PG Bed">PG Bed</option>
                <option value="Shared Room">Shared Room</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="h-11 flex-1 rounded-xl border border-border bg-card text-sm font-medium transition-colors hover:bg-secondary/50"
            >
              Cancel
            </button>
            <MagneticButton type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Creating..." : (
                <span className="flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" /> Create Room
                </span>
              )}
            </MagneticButton>
          </div>
        </form>
      )}

      <PremiumUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        title={modalTitle}
        message={modalMessage}
      />
    </GlassModal>
  );
}
