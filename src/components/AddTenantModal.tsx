import { nivasaApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, IdCard, Phone, Smartphone, User, Loader2, Calendar, Banknote, CreditCard, FileText } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isValidMobile, isValidAadhar } from "@/lib/tenantStore";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { PremiumUpgradeModal } from "./PremiumUpgradeModal";
import { TrustScoreBadge } from "./TrustScoreBadge";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultRoomId?: string;
  onAssigned?: (roomId: string) => void;
}

function formatAadhar(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function AddTenantModal({ open, onClose, defaultRoomId, onAssigned }: Props) {
  const { usage, limits } = useSubscriptionData();
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomId, setRoomId] = useState(defaultRoomId || "");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [aadhar, setAadhar] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("Cash");
  const [bedName, setBedName] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [joinedAt, setJoinedAt] = useState(() => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      if (!nivasaApi) return;
      const data = await nivasaApi.getRooms();
      setRoomsList(data);
      if (!defaultRoomId && !roomId && data.length > 0) {
        const vacant = data.find((r: any) => r.status === 'vacant');
        setRoomId(vacant ? vacant.id : data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
      toast.error("Failed to load rooms");
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSuccess(false);
      setErrors({});
      fetchRooms();
      if (defaultRoomId) setRoomId(defaultRoomId);
      // Reset form
      setName("");
      setMobile("");
      setWhatsapp("");
      setSameAsMobile(true);
      setAadhar("");
      setDepositAmount("");
      setDepositMethod("Cash");
      setBedName("");
      setRentAmount("");
      const d = new Date();
      setJoinedAt(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`);
      setSelectedFile(null);

    }
  }, [open, defaultRoomId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!mobile.trim()) e.mobile = "Mobile number is required";
    else if (!isValidMobile(mobile)) e.mobile = "Enter a valid mobile number";
    
    if (!sameAsMobile && whatsapp && !isValidMobile(whatsapp)) {
      e.whatsapp = "Enter a valid WhatsApp number";
    }
    
    if (!aadhar) {
      e.aadhar = "Aadhar number is required";
    } else if (!isValidAadhar(aadhar)) {
      e.aadhar = "Aadhar must be 12 digits";
    }

    if (!roomId) e.room = "Please select a room";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Subscription Limit Check
    const currentTenantsCount = usage?.tenants_count || 0;
    const tenantLimit = limits?.tenantLimit ?? 50;
    if (tenantLimit !== -1 && currentTenantsCount >= tenantLimit) {
      setModalTitle("Tenant Limit Reached");
      setModalMessage(`Your current Silver plan allows up to ${tenantLimit} tenants. Upgrade to Gold or Platinum to continue.`);
      setShowUpgradeModal(true);
      return;
    }

    try {
      setSubmitting(true);
      
      let joinedIso = new Date().toISOString();
      if (joinedAt) {
        const parts = joinedAt.split("/");
        if (parts.length === 3) {
          const [d, m, y] = parts;
          const parsed = new Date(`${y}-${m}-${d}`);
          if (!isNaN(parsed.getTime())) joinedIso = parsed.toISOString();
        }
      }

      let document_url = undefined;
      if (selectedFile) {
        if (selectedFile.size > 5 * 1024 * 1024) {
          throw new Error("Document is too large. Max size is 5MB.");
        }
        // SECURITY FIX #13: Validate MIME type
        if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
          throw new Error("Invalid file type. Only images and PDF are allowed.");
        }
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `tenant_${crypto.randomUUID()}.${fileExt}`;
        const filePath = `tenants/${fileName}`;
        const { error: uploadError } = await nivasaApi.supabase.storage
          .from('documents')
          .upload(filePath, selectedFile);
        if (uploadError) throw new Error("Document upload failed: " + uploadError.message);
        
        const { data: { publicUrl } } = nivasaApi.supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        document_url = publicUrl;
      }

      await nivasaApi.addTenant({
        room_id: roomId,
        name: name.trim(),
        phone: mobile.trim(),
        whatsapp_number: (sameAsMobile ? mobile : whatsapp).trim(),
        aadhar: aadhar.replace(/\s+/g, ""),
        joined_at: joinedIso,
        occupancy_count: 1,
        depositAmount: depositAmount ? Number(depositAmount) : 0,
        depositMethod: depositMethod,
        document_url,
        bed_assignment: bedName.trim() || undefined,
        rent_amount: rentAmount ? Number(rentAmount) : 0,
      });

      setSuccess(true);
      const selectedRoom = roomsList.find((r) => r.id === roomId);
      toast.success("Tenant added successfully", { 
        description: `${name} assigned to Room ${selectedRoom?.number}` 
      });
      
      onAssigned?.(roomId);
      window.dispatchEvent(new CustomEvent("nivasa:refresh"));
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(err.message || "Something went wrong while adding tenant");
      setErrors({ submit: err.message || "Failed to add tenant" });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoomCapacity = (r: any) => {
    if (r.capacity) return r.capacity;
    if (r.occupancyPrices?.length) return Math.max(...r.occupancyPrices.map((t: any) => t.members));
    return 1;
  };

  const availableRooms = roomsList.filter((r) => r.tenants?.length < getRoomCapacity(r));

  return (
    <GlassModal 
      open={open} 
      onClose={onClose} 
      title="Add New Tenant" 
      description="Fill in the tenant details to assign them a room"
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
                <div className="text-sm text-muted-foreground mt-1">The tenant has been added.</div>
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
              <Field label="Assign Room" error={errors.room}>
                <div className="relative">
                  <select
                    value={roomId} 
                    onChange={(e) => setRoomId(e.target.value)}
                    disabled={!!defaultRoomId || loadingRooms || submitting}
                    className="h-12 w-full appearance-none rounded-xl border border-border bg-card/70 px-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all disabled:opacity-50"
                  >
                    <option value="" disabled>Select a room</option>
                    {loadingRooms ? (
                      <option>Loading rooms...</option>
                    ) : (
                      (availableRooms.length ? availableRooms : roomsList).map((r) => {
                        const cap = getRoomCapacity(r);
                        const occ = r.tenants?.length || 0;
                        const isFull = occ >= cap;
                        return (
                          <option key={r.id} value={r.id}>
                            Room {r.number} · {r.buildingName} ({occ}/{cap} filled)
                          </option>
                        );
                      })
                    )}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </Field>

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
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Same as mobile number
                    </span>
                  </label>
                </div>
              </div>

              <Field label="Aadhar Number" hint="12 digits (Required)" error={errors.aadhar}>
                <IconInput 
                  icon={<IdCard className="h-4 w-4" />}
                  value={formatAadhar(aadhar)}
                  onChange={(v) => setAadhar(v.replace(/\D/g, ""))}
                  placeholder="1234 5678 9012" 
                  inputMode="numeric" 
                  maxLength={14}
                  disabled={submitting}
                />
                {aadhar.length === 12 && (
                  <div className="mt-2">
                    <TrustScoreBadge aadhar={aadhar} showLabel />
                  </div>
                )}
              </Field>

              <Field label="ID Document" optional>
                <div className="relative flex items-center justify-center rounded-xl border border-dashed border-border bg-card/70 p-4 transition-colors hover:bg-secondary/50">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={submitting}
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:opacity-0 disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    {selectedFile ? (
                      <p className="text-xs font-medium text-brand truncate max-w-[200px]">{selectedFile.name}</p>
                    ) : (
                      <>
                        <p className="text-xs font-medium">Click to browse or take a photo</p>
                        <p className="text-[10px] text-muted-foreground">Supports PDF and Images (Max 5MB)</p>
                      </>
                    )}
                  </div>
                </div>
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
                      className="h-12 w-full appearance-none rounded-xl border border-border bg-card/70 pl-11 pr-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all disabled:opacity-50"
                    >
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

              <Field label="Joining Date" optional>
                <IconInput 
                  icon={<Calendar className="h-4 w-4" />}
                  value={joinedAt} 
                  onChange={setJoinedAt}
                  placeholder="DD/MM/YYYY"
                  disabled={submitting}
                />
              </Field>



              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={onClose}
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
                      <span>Adding...</span>
                    </div>
                  ) : (
                    "Add Tenant"
                  )}
                </MagneticButton>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      <PremiumUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        title={modalTitle}
        message={modalMessage}
      />
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
          "h-12 w-full rounded-xl border border-border bg-card/70 pr-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10",
          icon ? "pl-11" : "pl-4",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
    </div>
  );
}