import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { BellRing, Building2, CheckCircle2, ArrowUpRight, MessageCircle } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { Sparkline } from "./Sparkline";
import { StatusPill } from "./StatusPill";
import { Money } from "./Money";
import type { Room } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { openWhatsApp } from "@/lib/whatsapp";

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export function RoomCard({ room, index }: { room: Room; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // Mouse-track tilt + glow position
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, v => (v - 0.5) * -6), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, v => (v - 0.5) *  6), { stiffness: 200, damping: 20 });
  const glowX  = useTransform(px, v => `${v * 100}%`);
  const glowY  = useTransform(py, v => `${v * 100}%`);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top)  / r.height);
  };
  const onLeave = () => { px.set(0.5); py.set(0.5); };

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const remind = (e: React.MouseEvent) => {
    stop(e);
    const phone = room.tenant?.whatsapp_number || room.tenant?.phone;
    if (phone) {
      const ok = openWhatsApp(
        phone,
        `Hi ${room.tenant?.name ?? "tenant"}, this is a friendly reminder about the rent for Room ${room.number} at ${room.buildingName}. Please let me know if you have any questions.`,
      );
      toast.success(ok ? "WhatsApp opened" : "Reminder sent", { description: room.tenant?.name ?? `Room ${room.number}` });
    } else {
      toast.success("Reminder queued", { description: `Room ${room.number}` });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={() => navigate(`/app/rooms/${room.id}`)}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 250, damping: 22 }}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow duration-300 hover:shadow-elev"
      >
        {/* Cursor-tracking glow */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(420px circle at ${glowX.get()} ${glowY.get()}, hsl(var(--accent-blue) / 0.18), transparent 50%)`,
          }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--accent-blue) / 0.18), transparent 50%)",
            }}
          />
        </motion.div>

        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> {room.buildingName}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xs font-medium text-muted-foreground">Room</span>
              <span className="text-2xl font-semibold tracking-tight tnum">{room.number}</span>
            </div>
          </div>
          <StatusPill status={room.status} />
        </div>

        <div className="relative mt-4 flex items-center gap-2.5">
          {room.tenant ? (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-[10px] font-semibold text-white shadow-glow">
                {initials(room.tenant.name)}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tenant</div>
                <div className="text-sm font-medium truncate">{room.tenant.name}</div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground italic">— vacant —</div>
          )}
        </div>

        <div className="relative mt-3 -mx-1">
          <Sparkline data={room.history} gradientId={`spark-${room.id}`} />
        </div>

        <div className="relative mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Electricity · 6 mo</span>
          <span className="tnum"><Money value={room.rent} /> / mo</span>
        </div>

        {/* Hover quick-actions */}
        <div className="relative mt-4 flex flex-wrap items-center gap-1.5 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 focus-within:opacity-100 focus-within:translate-y-0">
          {room.tenant && room.status !== "paid" && (
            <QuickAction
              tone="success"
              onClick={(e) => { stop(e); toast.success("Marked as paid", { description: `Room ${room.number}` }); }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
            </QuickAction>
          )}
          {room.tenant && (
            <QuickAction onClick={remind}>
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </QuickAction>
          )}
          {!room.tenant && (
            <QuickAction
              tone="info"
              onClick={(e) => { stop(e); window.dispatchEvent(new CustomEvent("nivasa:add-tenant")); }}
            >
              <BellRing className="h-3.5 w-3.5" /> Add tenant
            </QuickAction>
          )}
          <Link
            to={`/app/rooms/${room.id}`}
            onClick={(e) => e.stopPropagation()}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
          >
            Open <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuickAction({
  children, onClick, className, tone = "neutral",
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  tone?: "neutral" | "success" | "info";
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-card/80 px-2 py-1 text-[11px] font-medium text-foreground/80 backdrop-blur-md transition-colors hover:bg-secondary",
        tone === "success" && "border-status-paid/30 text-status-paid hover:bg-status-paid/10",
        tone === "info" && "border-status-info/30 text-status-info hover:bg-status-info/10",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}