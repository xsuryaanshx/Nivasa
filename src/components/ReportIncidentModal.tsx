import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { MagneticButton } from "./MagneticButton";
import { nivasaApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReportIncidentModalProps {
  open: boolean;
  tenant: any;
  buildingId?: string;
  onClose: () => void;
}

export function ReportIncidentModal({ open, tenant, buildingId, onClose }: ReportIncidentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [incidentType, setIncidentType] = useState<string>("rent_skipped");
  const [description, setDescription] = useState("");
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open && tenant?.phone) {
      loadHistory();
      setIncidentType("rent_skipped");
      setDescription("");
    }
  }, [open, tenant]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const data = await nivasaApi.getTrustIncidents(tenant.phone);
    setIncidents(data);
    setLoadingHistory(false);
  };

  const getPenalty = (type: string) => {
    switch (type) {
      case "rent_skipped": return -100;
      case "property_damage": return -200;
      case "late_payment": return -25;
      case "good_behavior": return 50;
      default: return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.phone) {
      toast.error("Tenant phone number is required to report an incident.");
      return;
    }

    try {
      setSubmitting(true);
      await nivasaApi.reportTrustIncident({
        tenant_phone: tenant.phone,
        building_id: buildingId,
        incident_type: incidentType,
        score_change: getPenalty(incidentType),
        description: description.trim(),
      });
      toast.success("Incident reported", {
        description: "The tenant's Trust Score has been updated globally.",
      });
      onClose();
      // Dispatch refresh if needed
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
    } catch (error: any) {
      toast.error(error.message || "Failed to report incident");
    } finally {
      setSubmitting(false);
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <Dialog.Title className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-brand" />
                Report Incident
              </Dialog.Title>
              <div className="mt-1 text-xs text-muted-foreground">
                Reporting an incident affects {tenant.name}&apos;s Trust Score globally across the Nivasa network.
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            <form id="incident-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Incident Type</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none appearance-none"
                >
                  <option value="rent_skipped">Skipped Rent (-100 pts)</option>
                  <option value="property_damage">Property Damage (-200 pts)</option>
                  <option value="late_payment">Late Payment (-25 pts)</option>
                  <option value="good_behavior">Good Behavior / Paid on Time (+50 pts)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide brief details about the incident..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none min-h-[80px] resize-none"
                />
              </div>
            </form>

            <div className="mt-8">
              <div className="text-xs font-semibold text-muted-foreground mb-3">Incident History for {tenant.phone}</div>
              {loadingHistory ? (
                <div className="text-xs text-muted-foreground animate-pulse">Loading history...</div>
              ) : incidents.length === 0 ? (
                <div className="text-xs text-muted-foreground italic bg-secondary/50 p-3 rounded-lg border border-border/50 text-center">No past incidents reported.</div>
              ) : (
                <div className="space-y-2">
                  {incidents.map((inc) => (
                    <div key={inc.id} className="text-xs bg-secondary/40 border border-border/50 rounded-lg p-3">
                      <div className="flex items-center justify-between font-medium mb-1">
                        <span className="capitalize">{inc.incident_type.replace("_", " ")}</span>
                        <span className={cn(inc.score_change < 0 ? "text-red-500" : "text-emerald-500")}>
                          {inc.score_change > 0 ? "+" : ""}{inc.score_change} pts
                        </span>
                      </div>
                      <div className="text-muted-foreground mb-2">"{inc.description}"</div>
                      <div className="text-[10px] text-muted-foreground/60 text-right">
                        {new Date(inc.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end shrink-0 pt-4 border-t border-border/50">
            <MagneticButton form="incident-form" type="submit" disabled={submitting}>
              {submitting ? "Reporting..." : "Report Incident"}
            </MagneticButton>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
