import { nivasaApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { Building2, DoorOpen, MapPin, Save } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  buildingData: { id: string; name: string; address: string; total_rooms?: number; upi_id?: string };
}

export function EditBuildingModal({ open, onClose, onSuccess, buildingData }: Props) {
  const [name, setName] = useState(buildingData.name);
  const [address, setAddress] = useState(buildingData.address);
  const [totalRooms, setTotalRooms] = useState<string>(
    String(buildingData.total_rooms ?? (buildingData as any).rooms ?? 0)
  );
  const [upiId, setUpiId] = useState(buildingData.upi_id || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(buildingData.name);
    setAddress(buildingData.address);
    setTotalRooms(String(buildingData.total_rooms ?? (buildingData as any).rooms ?? 0));
    setUpiId(buildingData.upi_id || "");
    setError(null);
  }, [buildingData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError("Building name and address are required");
      return;
    }
    const roomsCount = parseInt(totalRooms, 10);
    if (isNaN(roomsCount) || roomsCount < 0) {
      setError("Total rooms must be a non-negative number");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      
      // Use updateBuilding from our nivasaApi layer (also wired to nivasaApi.supabase.from for direct calls)
      await nivasaApi.updateBuilding(buildingData.id, {
        name: name.trim(),
        address: address.trim(),
        total_rooms: roomsCount,
        upi_id: upiId.trim(),
      });

      toast.success("Building updated");
      onClose();
      onSuccess?.();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
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
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="edit-building-address" className="text-xs font-medium text-muted-foreground">
                Address <span className="text-destructive">*</span>
              </label>
              <p className="text-[10px] text-muted-foreground/75 leading-normal">
                Include city & state (e.g. "Malviya Nagar, Indore, MP") or paste a Google Maps link to ensure the map shows correctly.
              </p>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="edit-building-address"
                type="text"
                placeholder="e.g. Scheme No 54, Indore, MP or Google Maps URL"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>

          {/* Total Rooms */}
          <div className="space-y-1.5">
            <label htmlFor="edit-building-rooms" className="text-xs font-medium text-muted-foreground">
              Total Rooms <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <DoorOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="edit-building-rooms"
                type="number"
                min={0}
                value={totalRooms}
                onChange={(e) => setTotalRooms(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>

          {/* UPI ID */}
          <div className="space-y-1.5">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="edit-building-upi" className="text-xs font-medium text-muted-foreground">
                UPI ID for Payments
              </label>
              <p className="text-[10px] text-muted-foreground/75 leading-normal">
                Used to generate dynamic UPI links and QR codes for tenants in this building.
              </p>
            </div>
            <div className="relative">
              <input
                id="edit-building-upi"
                type="text"
                placeholder="e.g. landlord@upi or landlord@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.trim())}
                className="h-11 w-full rounded-xl border border-border bg-secondary/30 px-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 font-mono"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
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
