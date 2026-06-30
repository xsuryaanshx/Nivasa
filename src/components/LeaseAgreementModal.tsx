import { useState, useRef } from "react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { LeaseTemplate } from "./LeaseTemplate";
import { FileSignature, Printer, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useCurrency } from "@/lib/currency";

interface Props {
  open: boolean;
  onClose: () => void;
  tenant: any;
  room: any;
}

export function LeaseAgreementModal({ open, onClose, tenant, room }: Props) {
  const { currency } = useCurrency();
  const [landlordName, setLandlordName] = useState("");
  const [landlordAddress, setLandlordAddress] = useState("");
  const [showTermsEditor, setShowTermsEditor] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Pre-compute dynamic default terms
  const dateObj = tenant?.joined_at ? new Date(tenant.joined_at) : new Date();
  const formattedDate = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rent = tenant?.rent_amount || room?.rent || 0;
  const deposit = tenant?.depositAmount || 0;

  const [terms, setTerms] = useState<string[]>([
    `Duration: This rental agreement shall be valid for a period of 11 (Eleven) months commencing from ${formattedDate}.`,
    `Rent Amount: The Tenant shall pay a monthly rent of ${currency.symbol}${rent.toLocaleString()}. The rent must be paid on or before the 5th of every month.`,
    `Security Deposit: The Tenant has paid a refundable, interest-free security deposit of ${currency.symbol}${deposit.toLocaleString()} to the Landlord. This amount shall be refunded to the Tenant at the time of vacating the premises, after deducting any arrears of rent, electricity bills, or damages to the premises.`,
    `Electricity & Maintenance: Electricity and water charges are not included in the rent and shall be borne by the Tenant based on consumption or proportional share as determined by the Landlord.`,
    `Usage: The Scheduled Premises shall be used strictly for residential purposes only by the Tenant and shall not be used for any commercial or illegal activities.`,
    `Notice Period: Either party can terminate this agreement by giving 1 (one) month's written notice to the other party.`,
    `Maintenance & Damages: The Tenant shall keep the premises in good condition. Any damages caused by the Tenant (excluding normal wear and tear) shall be repaired at the Tenant's expense.`,
    `Sub-letting: The Tenant shall not sub-let, assign, or part with the possession of the Scheduled Premises, in whole or in part, to anyone else.`
  ]);

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
        customTerms={terms}
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

          <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            <button 
              type="button" 
              onClick={() => setShowTermsEditor(!showTermsEditor)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              <span>Customize Terms & Conditions</span>
              {showTermsEditor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showTermsEditor && (
              <div className="p-3 border-t border-border space-y-3 max-h-64 overflow-y-auto">
                {terms.map((term, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-xs font-bold text-muted-foreground mt-2 w-4 shrink-0">{idx + 1}.</span>
                    <textarea
                      value={term}
                      onChange={(e) => {
                        const newTerms = [...terms];
                        newTerms[idx] = e.target.value;
                        setTerms(newTerms);
                      }}
                      className="w-full rounded-lg border border-border bg-card/70 p-2 text-[11px] leading-relaxed outline-none focus:border-brand min-h-[60px] resize-y"
                    />
                    <button 
                      type="button" 
                      onClick={() => setTerms(terms.filter((_, i) => i !== idx))}
                      className="mt-1 h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setTerms([...terms, "New condition: ..."])}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand hover:opacity-80 py-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Term
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
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
