import { useState, useEffect } from "react";
import { Building2, DoorOpen, MapPin, Save } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  buildingData: { id: string; name: string; address: string; total_rooms?: number };
}

export function EditBuildingModal({ open, onClose, onSuccess, buildingData }: Props) {
  const [name, setName] = useState(buildingData.name);
  const [address, setAddress] = useState(buildingData.address);
  const [totalRooms, setTotalRooms] = useState<string>(
    buildingData.total_rooms !== undefined ? String(buildingData.total_rooms) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(buildingData.name);
    setAddress(buildingData.address);
    setTotalRooms(buildingData.total_rooms !== undefined ? String(buildingData.total_rooms) : "");
    setError(null);
  }, [buildingData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError("Building name and address are required");
      return;
    }
    const rooms = parseInt(totalRooms, 10);
    if (totalRooms !== "" && (isNaN(rooms) || rooms < 0)) {
      setError("Total rooms must be a positive integer");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const api = (window as any).nivasaApi;
      if (!api) throw new Error("API not loaded");

      // Use updateBuilding from our api layer (also wired to api.supabase.from for direct calls)
      await api.updateBuilding(buildingData.id, {
        name: name.trim(),
        address: address.trim(),
        total_rooms: totalRooms !== "" ? rooms : undefined,
      });

      toast.success("Building updated");
      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error("Error updating building:", err);
      setError(err.message || "Failed to update building");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Edit Building"
      description="Update property details"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          {/* Building Name */}
          <div className="space-y-1.5">
            <label htmlFor="edit-building-name" className="text-xs font-medium text-muted-foreground">
              Building Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="edit-building-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label htmlFor="edit-building-address" className="text-xs font-medium text-muted-foreground">
              Address <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="edit-building-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>

          {/* Total Rooms (replaces "Total Units") */}
          <div className="space-y-1.5">
            <label htmlFor="edit-building-total-rooms" className="text-xs font-medium text-muted-foreground">
              Total Rooms{" "}
              <span className="text-muted-foreground/60 text-[10px]">(optional)</span>
            </label>
            <div className="relative">
              <DoorOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="edit-building-total-rooms"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="e.g. 24"
                value={totalRooms}
                onChange={(e) => setTotalRooms(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-border bg-card text-sm font-medium transition-colors hover:bg-secondary/50"
          >
            Cancel
          </button>
          <MagneticButton type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Saving..." : (
              <span className="flex items-center justify-center gap-2">
                <Save className="h-4 w-4" /> Save Changes
              </span>
            )}
          </MagneticButton>
        </div>
      </form>
    </GlassModal>
  );
}
