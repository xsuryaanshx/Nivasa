import { nivasaApi, supabase } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Sparkles, User, Check, Phone } from "lucide-react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MagneticButton } from "@/components/MagneticButton";
import { toast } from "sonner";

const PLANS = [
  {
    id: "silver",
    name: "Silver",
    price: "₹499",
    desc: "Up to 10 rooms, 50 tenants.",
    badge: "",
  },
  {
    id: "gold",
    name: "Gold",
    price: "₹899",
    desc: "Up to 50 rooms, 300 tenants.",
    badge: "Popular",
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "₹1199",
    desc: "Unlimited rooms & tenants.",
    badge: "Premium",
  },
];

export default function Register() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [role, setRole] = useState<"landlord" | "tenant">("landlord");
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!email || !pwd) { setError("Please fill in all fields."); return; }
    if (pwd.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(pwd)) { setError("Password must include at least one uppercase letter."); return; }
    if (!/[0-9]/.test(pwd)) { setError("Password must include at least one number."); return; }
    if (!/[^A-Za-z0-9]/.test(pwd)) { setError("Password must include at least one special character."); return; }

    let matchedTenantId: string | undefined;
    if (role === "tenant") {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        setError("Please enter a valid 10-digit phone number.");
        return;
      }
      
      setLoading(true);
      try {
        const { data: tenantRecords, error: tenantErr } = await supabase
          .from("tenants")
          .select("id, status, phone")
          .eq("status", "active");
          
        if (tenantErr) throw tenantErr;
        
        const matchedTenant = tenantRecords?.find(t => {
          const cleanDb = t.phone.replace(/\D/g, "");
          return cleanDb === cleanPhone;
        });
        
        if (!matchedTenant) {
          setError("No active tenant record found with this phone number. Please ask your landlord to add you to the system first.");
          setLoading(false);
          return;
        }
        
        matchedTenantId = matchedTenant.id;
      } catch (err: any) {
        setError(err.message || "Failed to verify tenant record.");
        setLoading(false);
        return;
      }
    } else {
      if (!selectedPlan) { setError("Please select a plan to continue."); return; }
    }

    setLoading(true);
    try {
      const metadata = role === "tenant" 
        ? { role: "tenant", phone: phone.trim(), tenant_id: matchedTenantId }
        : { role: "landlord" };
        
      const { data, error } = await nivasaApi.auth.signUp(
        email, 
        pwd, 
        fullName.trim(), 
        role === "landlord" ? selectedPlan : null,
        metadata
      );
      if (error) throw error;

      // Force sign out immediately after sign up to prevent auto-login
      await nivasaApi.auth.signOut();

      toast.success("Account created!", {
        description: `Welcome, ${fullName.split(" ")[0]}! Please check your email for a confirmation link.`,
      });
      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-background px-4 py-12">
      <div className="aurora" />
      <div className="absolute inset-0 bg-gradient-aurora opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative z-10 w-full max-w-[540px] glass-strong rounded-2xl p-8 shadow-float"
      >
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
            <img src="/nivasa-brand-v2.png" alt="Nivasa Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">Nivasa</div>
            <div className="text-xs text-muted-foreground font-medium">Join the workspace</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Start managing your properties with calm clarity.</p>

        <form onSubmit={submit} className="mt-7 space-y-5">
          <div className="block">
            <span className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Register as *
            </span>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                onClick={() => setRole("landlord")}
                className={`cursor-pointer rounded-xl border p-3.5 text-center font-medium text-sm transition-all select-none ${
                  role === "landlord"
                    ? "border-primary bg-primary/5 text-primary scale-[1.01] shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
                    : "border-border/60 bg-card/45 hover:bg-card/75 text-muted-foreground"
                }`}
              >
                Landlord / Owner
              </div>
              <div
                onClick={() => setRole("tenant")}
                className={`cursor-pointer rounded-xl border p-3.5 text-center font-medium text-sm transition-all select-none ${
                  role === "tenant"
                    ? "border-primary bg-primary/5 text-primary scale-[1.01] shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
                    : "border-border/60 bg-card/45 hover:bg-card/75 text-muted-foreground"
                }`}
              >
                Tenant / Resident
              </div>
            </div>
          </div>

          {role === "landlord" ? (
            <div className="block">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Choose your Plan *
              </span>
              <div className="grid grid-cols-3 gap-3">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative cursor-pointer rounded-xl border p-4 transition-all duration-300 flex flex-col justify-between select-none ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] scale-[1.02]"
                          : "border-border/60 bg-card/45 hover:bg-card/70 hover:border-border"
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/10 dark:bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider scale-90">
                          {plan.badge}
                        </span>
                      )}
                      <div className="space-y-1">
                        <div className="font-semibold text-sm text-foreground">{plan.name}</div>
                        <div className="flex items-baseline">
                          <span className="text-base font-bold tracking-tight text-foreground">{plan.price}</span>
                          <span className="text-[10px] text-muted-foreground ml-0.5">/mo</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-normal pt-1">{plan.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Field label="Phone Number (matching your landlord record)">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="99999 99999"
                  className="h-11 w-full rounded-xl border border-border bg-card/70 pl-9 pr-3.5 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
                />
              </div>
            </Field>
          )}

          <Field label="Full Name">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jordan Singh"
                autoComplete="name"
                className="h-11 w-full rounded-xl border border-border bg-card/70 pl-9 pr-3.5 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
            </div>
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="h-11 w-full rounded-xl border border-border bg-card/70 px-3.5 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-11 w-full rounded-xl border border-border bg-card/70 px-3.5 pr-10 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.12)]"
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                aria-label="Toggle password">
                {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </Field>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </motion.div>
          )}

          <MagneticButton type="submit" className="mt-2 w-full" disabled={loading}>
            {loading ? "Creating account…" : <>Sign up <ArrowRight className="h-4 w-4" /></>}
          </MagneticButton>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
