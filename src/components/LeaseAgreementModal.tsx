import { useState, useRef } from "react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { LeaseTemplate } from "./LeaseTemplate";
import { FileSignature, Printer } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  tenant: any;
  room: any;
}

export function LeaseAgreementModal({ open, onClose, tenant, room }: Props) {
  const [landlordName, setLandlordName] = useState("");
  const [landlordAddress, setLandlordAddress] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (!tenant || !room) return null;

  return (
    <>
      {/* Hidden print template */}
      <LeaseTemplate 
        ref={printRef}
        tenant={tenant}
        room={room}
        landlordName={landlordName}
        landlordAddress={landlordAddress}
      />

      <GlassModal open={open} onClose={onClose} title="Generate Lease" description="Fill landlord details to complete the draft">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-brand" /> Tenant Details (Auto-filled)
            </div>
            <div className="text-xs text-muted-foreground">
              <p><strong>Name:</strong> {tenant.name}</p>
              <p><strong>Room:</strong> {room.number} ({room.buildingName})</p>
              <p><strong>Rent:</strong> ₹{tenant.rent_amount || room.rent}</p>
            </div>
          </div>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Landlord Name</span>
            </div>
            <input
              type="text"
              value={landlordName}
              onChange={e => setLandlordName(e.target.value)}
              placeholder="e.g. John Doe"
              className="h-11 w-full rounded-xl border border-border bg-card/70 px-4 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
            />
          </label>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Property Address</span>
            </div>
            <input
              type="text"
              value={landlordAddress}
              onChange={e => setLandlordAddress(e.target.value)}
              placeholder="e.g. 123 Main St, City, State"
              className="h-11 w-full rounded-xl border border-border bg-card/70 px-4 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
            />
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-border bg-card/60 text-sm font-medium transition-colors hover:bg-card"
            >
              Cancel
            </button>
            <MagneticButton type="button" onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" /> Save as PDF
            </MagneticButton>
          </div>
        </div>
      </GlassModal>
    </>
  );
}
