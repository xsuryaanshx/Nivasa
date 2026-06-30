import { nivasaApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, IdCard, Phone, Smartphone, User, Loader2, Banknote, CreditCard, AlertTriangle, X } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, maskAadhar } from "@/lib/utils";
import { toast } from "sonner";
import { isValidMobile, isValidAadhar } from "@/lib/tenantStore";
import { type Tenant } from "@/lib/types";

interface Props {
  open: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onUpdated?: () => void;
}

function formatAadhar(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function EditTenantModal({ open, tenant, onClose, onUpdated }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [aadhar, setAadhar] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("Pending");
  const [bedName, setBedName] = useState("");
  const [rentAmount, setRentAmount] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Aadhar duplicate detection
  const [aadharWarning, setAadharWarning] = useState<{ roomNumber: string; buildingName: string; tenantName: string } | null>(null);
  const [checkingAadhar, setCheckingAadhar] = useState(false);

  useEffect(() => {
    if (open && tenant) {
      setIsEditing(false);
      setSuccess(false);
      setErrors({});
      setName(tenant.name || "");
      setMobile(tenant.phone || "");
      setWhatsapp(tenant.whatsapp_number || "");
      setSameAsMobile(tenant.phone === tenant.whatsapp_number);
      setAadhar(tenant.aadhar || "");
      setDepositAmount(tenant.depositAmount ? String(tenant.depositAmount) : "");
      setDepositMethod(tenant.depositMethod || "Pending");
      setBedName(tenant.bed_assignment || "");
      setRentAmount(tenant.rent_amount ? String(tenant.rent_amount) : "");
      setAadharWarning(null);
    }
  }, [open, tenant]);

  // Real-time Aadhar duplicate check (skip match against current tenant's own Aadhar)
  useEffect(() => {
    const clean = aadhar.replace(/\D/g, "");
    // Only check when we have a full 12-digit number AND it's different from the original
    if (clean.length !== 12 || clean === (tenant?.aadhar || "").replace(/\D/g, "")) {
      setAadharWarning(null);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        setCheckingAadhar(true);
        const allRooms = await nivasaApi.getRooms();
        for (const room of allRooms) {
          for (const t of (room.tenants || [])) {
            if (
              (t.aadhar || "").replace(/\D/g, "") === clean &&
              t.status !== "vacated" &&
              t.id !== tenant?.id
            ) {
              if (!cancelled) {
                setAadharWarning({
                  roomNumber: room.number,
                  buildingName: room.buildingName,
                  tenantName: t.name,
                });
              }
              return;
            }
          }
        }
        if (!cancelled) setAadharWarning(null);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setCheckingAadhar(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [aadhar, tenant?.id, tenant?.aadhar]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!mobile.trim()) e.mobile = "Mobile number is required";
    else if (!isValidMobile(mobile)) e.mobile = "Enter a valid mobile number";
    
    if (!sameAsMobile && whatsapp && !isValidMobile(whatsapp)) {
      e.whatsapp = "Enter a valid WhatsApp number";
    }
    
    if (aadhar && !isValidAadhar(aadhar)) {
      e.aadhar = "Aadhar must be 12 digits";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !tenant) return;

    try {
      setSubmitting(true);
      
      await nivasaApi.updateTenant(tenant.id, {
        name: name.trim(),
        phone: mobile.trim(),
        whatsapp_number: (sameAsMobile ? mobile : whatsapp).trim(),
        aadhar: aadhar.replace(/\s+/g, ""),
        depositAmount: depositAmount ? Number(depositAmount) : 0,
        depositMethod: depositMethod,
        bed_assignment: bedName.trim() || undefined,
        rent_amount: rentAmount ? Number(rentAmount) : 0,
      });

      setSuccess(true);
      toast.success("Tenant updated successfully");
      
      onUpdated?.();
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(err.message || "Something went wrong while updating tenant");
      setErrors({ submit: err.message || "Failed to update tenant" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassModal 
      open={open} 
      onClose={onClose} 
      title={isEditing ? "Edit Tenant" : "Tenant Profile"} 
      description={isEditing ? "Update tenant information" : "Details and information"}
    >
      <div className="max-w-full sm:max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4 py-12"
            >
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-status-paid/20 text-status-paid shadow-glow"
              >
                <CheckCircle2 className="h-10 w-10" />
              </motion.div>
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">Success!</div>
                <div className="text-sm text-muted-foreground mt-1">Tenant details have been updated.</div>
              </div>
            </motion.div>
          ) : !isEditing && tenant ? (
            <motion.div
              key="view"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 py-2"
            >
              <div className="rounded-xl bg-secondary/50 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-white font-semibold shadow-glow">
                    {name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{tenant.name}</div>
                    <div className="text-xs text-muted-foreground">Joined {new Date(tenant.joined_at || "").toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Mobile</div>
                    <a href={`tel:${tenant.phone}`} className="text-sm font-medium hover:text-brand hover:underline block">{tenant.phone}</a>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">WhatsApp</div>
                    {tenant.whatsapp_number ? (
                      <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-brand hover:underline block">
                        {tenant.whatsapp_number}
                      </a>
                    ) : (
                      <div className="text-sm font-medium">-</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Aadhar</div>
                    <div className="text-sm font-medium">{tenant.aadhar ? maskAadhar(tenant.aadhar) : "-"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Deposit</div>
                    <div className="text-sm font-medium">₹{tenant.depositAmount || 0} ({tenant.depositMethod || "Cash"})</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Bed Assignment</div>
                    <div className="text-sm font-medium">{tenant.bed_assignment || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Monthly Rent</div>
                    <div className="text-sm font-medium">₹{tenant.rent_amount || 0}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="h-12 flex-1 rounded-xl border border-border bg-card/60 text-sm font-semibold transition-all hover:bg-secondary"
                >
                  Close
                </button>
                <MagneticButton 
                  onClick={() => setIsEditing(true)}
                  className="flex-1"
                >
                  Edit Details
                </MagneticButton>
              </div>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={submit} 
              className="space-y-5 py-2"
            >
              <Field label="Full Name" error={errors.name}>
                <IconInput 
                  icon={<User className="h-4 w-4" />}
                  value={name} 
                  onChange={(v) => setName(v)} 
                  placeholder="Enter tenant's full name" 
                  disabled={submitting}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Mobile Number" error={errors.mobile}>
                  <IconInput 
                    icon={<Phone className="h-4 w-4" />}
                    value={mobile} 
                    onChange={(v) => setMobile(v)} 
                    placeholder="98765 43210" 
                    inputMode="tel"
                    disabled={submitting}
                  />
                </Field>

                <div className="space-y-2">
                  <Field label="WhatsApp Number" optional error={errors.whatsapp}>
                    <IconInput 
                      icon={<Smartphone className="h-4 w-4" />}
                      value={sameAsMobile ? mobile : whatsapp}
                      onChange={(v) => { setSameAsMobile(false); setWhatsapp(v); }}
                      disabled={sameAsMobile || submitting}
                      placeholder="98765 43210" 
                      inputMode="tel"
                    />
                  </Field>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={sameAsMobile}
                        onChange={(e) => setSameAsMobile(e.target.checked)}
                        className="peer h-4 w-4 opacity-0 absolute"
                        disabled={submitting}
                      />
                      <div className="h-4 w-4 rounded border border-border bg-card peer-checked:bg-brand peer-checked:border-brand transition-all flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white scale-0 peer-checked:scale-100 transition-transform" />
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Same as mobile number
                    </span>
                  </label>
                </div>
              </div>

              <Field label="Aadhar Number" hint="12 digits" optional error={errors.aadhar}>
                <div className="relative">
                  <IconInput 
                    icon={<IdCard className="h-4 w-4" />}
                    value={formatAadhar(aadhar)}
                    onChange={(v) => setAadhar(v.replace(/\D/g, ""))}
                    placeholder="1234 5678 9012" 
                    inputMode="numeric" 
                    maxLength={14}
                    disabled={submitting}
                  />
                  {checkingAadhar && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </span>
                  )}
                </div>

                {/* Duplicate Aadhar Warning */}
                <AnimatePresence>
                  {aadharWarning && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          Aadhar already registered!
                        </p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                          <span className="font-medium">{aadharWarning.tenantName}</span> in{" "}
                          <span className="font-medium">Room {aadharWarning.roomNumber}</span> ({aadharWarning.buildingName})
                          already uses this Aadhar number.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAadharWarning(null)}
                        className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Bed Assignment" optional hint="e.g. Bed A or 1">
                  <IconInput 
                    value={bedName} 
                    onChange={setBedName} 
                    placeholder="Enter bed (optional)" 
                    disabled={submitting}
                  />
                </Field>
                <Field label="Monthly Rent" optional>
                  <IconInput 
                    icon={<Banknote className="h-4 w-4" />}
                    value={rentAmount} 
                    onChange={setRentAmount} 
                    placeholder="e.g. 5000" 
                    inputMode="numeric"
                    disabled={submitting}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Deposit Amount" optional>
                  <IconInput 
                    icon={<Banknote className="h-4 w-4" />}
                    value={depositAmount} 
                    onChange={setDepositAmount} 
                    placeholder="e.g. 10000" 
                    inputMode="numeric"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Deposit Method" optional>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand transition-colors">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value)}
                      disabled={submitting}
                      className="h-12 w-full appearance-none rounded-xl border border-border bg-card/70 pl-11 pr-4 text-base sm:text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all disabled:opacity-50"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank">Bank Transfer</option>
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </Field>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  disabled={submitting}
                  className="h-12 flex-1 rounded-xl border border-border bg-card/60 text-sm font-semibold transition-all hover:bg-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <MagneticButton 
                  type="submit" 
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    "Save Changes"
                  )}
                </MagneticButton>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </GlassModal>
  );
}

function Field({ label, hint, optional, error, children }: {
  label: string; hint?: string; optional?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
          {label}
          {optional && <span className="ml-1 normal-case font-normal text-muted-foreground/60">(Optional)</span>}
        </span>
        {hint && !error && <span className="text-[10px] text-muted-foreground tnum">{hint}</span>}
        {error && (
          <motion.span 
            initial={{ opacity: 0, x: 5 }} 
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded"
          >
            {error}
          </motion.span>
        )}
      </div>
      {children}
    </div>
  );
}

function IconInput({
  icon, value, onChange, placeholder, inputMode, maxLength, disabled,
}: {
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <div className="relative group">
      {icon && (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-brand transition-colors">
          {icon}
        </span>
      )}
      <input
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} 
        inputMode={inputMode} 
        maxLength={maxLength} 
        disabled={disabled}
        className={cn(
          "h-12 w-full rounded-xl border border-border bg-card/70 pr-4 text-base sm:text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10",
          icon ? "pl-11" : "pl-4",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
    </div>
  );
}
