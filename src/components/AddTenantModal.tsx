import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, IdCard, Phone, Smartphone, User } from "lucide-react";
import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";
import { rooms } from "@/lib/mockData";
import { assignTenantToRoom, isValidAadhar, isValidMobile } from "@/lib/tenantStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomId, setRoomId] = useState(defaultRoomId || "");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [aadhar, setAadhar] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const api = (window as any).estateApi;
      if (!api) return;
      const data = await api.getRooms();
      setRoomsList(data);
      if (!roomId && data.length > 0) {
        const vacant = data.find((r: any) => !r.tenant);
        setRoomId(vacant ? vacant.id : data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
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
    }
  }, [open, defaultRoomId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "First name is required";
    if (!surname.trim()) e.surname = "Surname is required";
    if (!isValidMobile(mobile)) e.mobile = "Enter a valid mobile number";
    if (!sameAsMobile && whatsapp && !isValidMobile(whatsapp)) e.whatsapp = "Enter a valid WhatsApp number";
    if (!isValidAadhar(aadhar)) e.aadhar = "Aadhar must be 12 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const api = (window as any).estateApi;
      if (!api) throw new Error("API not loaded");

      await api.addTenant({
        room_id: roomId,
        name: name.trim(),
        surname: surname.trim(),
        phone: mobile.trim(),
        whatsapp: (sameAsMobile ? mobile : whatsapp).trim(),
        aadhar: aadhar.replace(/\s+/g, ""),
        joined_at: new Date().toISOString().slice(0, 10)
      });

      setSuccess(true);
      toast.success("Tenant added", { 
        description: `${name} ${surname} → Room ${roomsList.find((r) => r.id === roomId)?.number}` 
      });
      onAssigned?.(roomId);
      setTimeout(() => {
        onClose();
        setName(""); setSurname(""); setMobile(""); setWhatsapp(""); setAadhar("");
      }, 700);
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to add tenant" });
    } finally {
      setSubmitting(false);
    }
  };

  const vacantRooms = roomsList.filter((r) => !r.tenant);

  return (
    <GlassModal open={open} onClose={onClose} title="Add new tenant" description="Assign a tenant to an available room">
      {success ? (
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 py-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-status-paid/15 text-status-paid">
            <CheckCircle2 className="h-7 w-7" />
          </motion.div>
          <div className="text-base font-semibold">Tenant added</div>
          <div className="text-xs text-muted-foreground">Closing…</div>
        </motion.div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Room">
            <select
              value={roomId} onChange={(e) => setRoomId(e.target.value)}
              disabled={loadingRooms || submitting}
              className="h-11 w-full appearance-none rounded-xl border border-border bg-card/70 px-3 text-sm outline-none focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
            >
              {loadingRooms ? (
                <option>Loading rooms...</option>
              ) : (
                (vacantRooms.length ? vacantRooms : roomsList).map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.number} · {r.buildingName}{r.tenant ? ` · occupied by ${r.tenant.name}` : " · vacant"}
                  </option>
                ))
              )}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={errors.name}>
              <IconInput icon={<User className="h-3.5 w-3.5" />}
                value={name} onChange={(v) => setName(v)} placeholder="Aarav" />
            </Field>
            <Field label="Surname" error={errors.surname}>
              <IconInput value={surname} onChange={(v) => setSurname(v)} placeholder="Sharma" />
            </Field>
          </div>

          <Field label="Mobile number" error={errors.mobile}>
            <IconInput icon={<Phone className="h-3.5 w-3.5" />}
              value={mobile} onChange={(v) => setMobile(v)} placeholder="+91 98765 43210" inputMode="tel" />
          </Field>

          <div>
            <Field label="WhatsApp number" optional error={errors.whatsapp}>
              <IconInput icon={<Smartphone className="h-3.5 w-3.5" />}
                value={sameAsMobile ? mobile : whatsapp}
                onChange={(v) => { setSameAsMobile(false); setWhatsapp(v); }}
                disabled={sameAsMobile}
                placeholder="+91 98765 43210" inputMode="tel" />
            </Field>
            <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <input type="checkbox" checked={sameAsMobile}
                onChange={(e) => setSameAsMobile(e.target.checked)}
                className="h-3.5 w-3.5 accent-foreground" />
              Same as mobile
            </label>
          </div>

          <Field label="Aadhar number" hint="12 digits" error={errors.aadhar}>
            <IconInput icon={<IdCard className="h-3.5 w-3.5" />}
              value={formatAadhar(aadhar)}
              onChange={(v) => setAadhar(v.replace(/\D/g, ""))}
              placeholder="1234 5678 9012" inputMode="numeric" maxLength={14} />
          </Field>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-border bg-card/60 text-sm font-medium transition-colors hover:bg-card">
              Cancel
            </button>
            <MagneticButton type="submit" className="flex-1">Add tenant</MagneticButton>
          </div>
        </form>
      )}
    </GlassModal>
  );
}

function Field({ label, hint, optional, error, children }: {
  label: string; hint?: string; optional?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
          {optional && <span className="ml-1 text-[10px] text-muted-foreground/70">(optional)</span>}
        </span>
        {hint && !error && <span className="text-[10px] text-muted-foreground tnum">{hint}</span>}
        {error && <span className="text-[10px] font-medium text-destructive">{error}</span>}
      </div>
      {children}
    </label>
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
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      )}
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} inputMode={inputMode} maxLength={maxLength} disabled={disabled}
        className={cn(
          "h-11 w-full rounded-xl border border-border bg-card/70 pr-3 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]",
          icon ? "pl-9" : "pl-3.5",
          disabled && "opacity-60",
        )}
      />
    </div>
  );
}