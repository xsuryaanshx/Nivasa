import { nivasaApi } from "@/lib/api";
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, DoorOpen, MapPin, Plus } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { PremiumUpgradeModal } from "./PremiumUpgradeModal";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddBuildingModal({ open, onClose, onSuccess }: Props) {
  const { usage, limits, canCreateProperty } = useSubscriptionData();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [totalRooms, setTotalRooms] = useState<string>("");
  const [upiId, setUpiId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const handleClose = () => {
    onClose();
    setName(""); setAddress(""); setTotalRooms(""); setUpiId(""); setSuccess(false); setError(null);
  };

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

    // Gating Checks
    const currentPropertiesCount = usage?.properties_count || 0;
    const hasMultiProperty = !!limits?.features?.multi_property?.enabled;
    if (!hasMultiProperty && currentPropertiesCount >= 1) {
      setModalTitle("Manage Multiple Properties");
      setModalMessage("Your current plan allows up to 1 property. Upgrade to Platinum to unlock multi-property management.");
      setShowUpgradeModal(true);
      return;
    }

    if (totalRooms !== "") {
      const currentRoomsCount = usage?.rooms_count || 0;
      const roomLimit = limits?.roomLimit ?? 10;
      if (roomLimit !== -1 && currentRoomsCount + rooms > roomLimit) {
        setModalTitle("Room Limit Reached");
        setModalMessage(`Your current plan allows up to ${roomLimit} rooms. Adding this building with ${rooms} rooms would exceed your limit (current: ${currentRoomsCount}). Upgrade to Gold or Platinum to continue.`);
        setShowUpgradeModal(true);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await nivasaApi.addBuilding({
        name: name.trim(),
        address: address.trim(),
        total_rooms: totalRooms !== "" ? rooms : undefined,
        upi_id: upiId.trim() || undefined,
      });

      setSuccess(true);
      toast.success("Building added", {
        description: `${name} has been added to your portfolio.`,
      });

      setTimeout(() => {
        handleClose();
        onSuccess?.();
        window.dispatchEvent(new CustomEvent("nivasa:refresh"));
      }, 1500);
    } catch (err: any) {
      console.error("Error adding building:", err);
      setError(err.message || "Failed to add building");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={handleClose}
      title="Add new building"
      description="Expand your portfolio with a new property"
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
          <h3 className="mt-4 text-lg font-semibold">Building Added Successfully!</h3>
          <p className="mt-1 text-sm text-muted-foreground text-pretty max-w-[240px]">
            The new property has been registered in your portfolio.
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {/* Building Name */}
            <div className="space-y-1.5">
              <label htmlFor="building-name" className="text-xs font-medium text-muted-foreground">
                Building Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="building-name"
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Aurora Heights"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <div className="flex flex-col gap-0.5">
                <label htmlFor="building-address" className="text-xs font-medium text-muted-foreground">
                  Address <span className="text-destructive">*</span>
                </label>
                <p className="text-[10px] text-muted-foreground/75 leading-normal">
                  Include city & state (e.g. "Malviya Nagar, Indore, MP") or paste a Google Maps link to ensure the map shows correctly.
                </p>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="building-address"
                  type="text"
                  maxLength={500}
                  placeholder="e.g. Scheme No 54, Indore, MP or Google Maps URL"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </div>
            </div>

            {/* Total Rooms */}
            <div className="space-y-1.5">
              <label htmlFor="building-total-rooms" className="text-xs font-medium text-muted-foreground">
                Total Rooms{" "}
                <span className="text-muted-foreground/60 text-[10px]">(optional)</span>
              </label>
              <div className="relative">
                <DoorOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="building-total-rooms"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="e.g. 24"
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </div>
            </div>

            {/* UPI ID */}
            <div className="space-y-1.5">
              <div className="flex flex-col gap-0.5">
                <label htmlFor="building-upi" className="text-xs font-medium text-muted-foreground">
                  UPI ID for Payments{" "}
                  <span className="text-muted-foreground/60 text-[10px]">(optional)</span>
                </label>
                <p className="text-[10px] text-muted-foreground/75 leading-normal">
                  Used to generate dynamic UPI links and QR codes for tenants in this building.
                </p>
              </div>
              <div className="relative">
                <input
                  id="building-upi"
                  type="text"
                  placeholder="e.g. landlord@upi or landlord@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.trim())}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 font-mono"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-11 flex-1 rounded-xl border border-border bg-card text-sm font-medium transition-colors hover:bg-secondary/50"
            >
              Cancel
            </button>
            <MagneticButton type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Adding..." : (
                <span className="flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" /> Add Building
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
