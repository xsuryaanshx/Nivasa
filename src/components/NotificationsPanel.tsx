import { nivasaApi } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  X,
  Bell,
  Home,
  AlertCircle,
  CheckCircle2,
  Clock,
  BellOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { useLanguage } from "./LanguageProvider";

interface AppNotification {
  id: string;
  type: "vacant" | "pending" | "info" | "success";
  title: string;
  body: string;
  time: string;
  read: boolean;
  link?: string;
}

function buildNotifications(rooms: any[], t: (key: string) => string): AppNotification[] {
  const notifs: AppNotification[] = [];
  const now = new Date();

  if (!rooms || rooms.length === 0) {
    return [
      {
        id: "welcome",
        type: "info",
        title: "Welcome to Nivasa!",
        body: "Add buildings and rooms to start tracking your properties.",
        time: "Just now",
        read: false,
      },
    ];
  }

  rooms.forEach((room: any) => {
    if (room.status === "vacant") {
      // Estimate how long vacant – if no joinedAt use a rough placeholder
      notifs.push({
        id: `vacant-${room.id}`,
        type: "vacant",
        title: `Room ${room.number} is ${t("vacant").toLowerCase()}`,
        body: `${room.buildingName} · This room has no tenants assigned. Consider listing it.`,
        time: "Now",
        read: false,
        link: `/app/buildings/${room.buildingId}`,
      });
    } else if (room.status === "pending") {
      notifs.push({
        id: `pending-${room.id}`,
        type: "pending",
        title: `Rent pending — Room ${room.number}`,
        body: `${room.buildingName} · Payment not yet received this month.`,
        time: "This month",
        read: false,
        link: `/app/tenants?status=pending`,
      });
    }
  });

  // Month-start reminder
  if (now.getDate() <= 5) {
    notifs.push({
      id: "month-start",
      type: "info",
      title: "Month-start reminder",
      body: "It's the start of the month — a good time to send rent invoices to all tenants.",
      time: `${now.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
      read: true,
    });
  }

  if (notifs.length === 0) {
    notifs.push({
      id: "all-good",
      type: "success",
      title: "All rooms are occupied",
      body: "Great work! Every room has a tenant assigned.",
      time: "Now",
      read: true,
    });
  }

  // Apply persisted states
  let dismissed: string[] = [];
  let readNotifs: string[] = [];
  try {
    dismissed = JSON.parse(localStorage.getItem("nivasa:dismissed-notifs") || "[]");
    readNotifs = JSON.parse(localStorage.getItem("nivasa:read-notifs") || "[]");
  } catch (e) {}

  return notifs
    .filter(n => !dismissed.includes(n.id))
    .map(n => ({
      ...n,
      read: n.read || readNotifs.includes(n.id)
    }));
}

const ICON_MAP = {
  vacant: { icon: Home, color: "text-amber-400", bg: "bg-amber-500/10" },
  pending: { icon: Clock, color: "text-rose-400", bg: "bg-rose-500/10" },
  info: { icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

import { useNavigate } from "react-router-dom";

export function NotificationsPanel({ open, onClose }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      if (nivasaApi) {
        const rooms = await nivasaApi.getRooms();
        setNotifs(buildNotifications(rooms, t as any));
      }
    } catch {
      setNotifs(buildNotifications([], t as any));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadNotifications();
  }, [open]);

  // Close on Escape & lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const markAllRead = () => {
    setNotifs((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem("nivasa:read-notifs", JSON.stringify(updated.map(n => n.id)));
      } catch (e) {}
      return updated;
    });
  };

  const dismiss = (id: string) => {
    setNotifs((prev) => {
      const filtered = prev.filter((n) => n.id !== id);
      try {
        const dismissed = JSON.parse(localStorage.getItem("nivasa:dismissed-notifs") || "[]");
        localStorage.setItem("nivasa:dismissed-notifs", JSON.stringify([...dismissed, id]));
      } catch (e) {}
      return filtered;
    });
  };

  const unread = notifs.filter((n) => !n.read).length;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 z-[100] flex h-[100dvh] w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
                  <Bell className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  {unread > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {unread} unread
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={loadNotifications}
                  title="Refresh"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </button>
                {notifs.length > 0 && (
                  <button
                    onClick={() => {
                      try {
                        const dismissed = JSON.parse(localStorage.getItem("nivasa:dismissed-notifs") || "[]");
                        const currentIds = notifs.map(n => n.id);
                        localStorage.setItem("nivasa:dismissed-notifs", JSON.stringify([...dismissed, ...currentIds]));
                      } catch (e) {}
                      setNotifs([]);
                    }}
                    title="Clear All"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-rose-500 text-xs font-medium px-2"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={onClose}
                  title="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                </div>
              ) : notifs.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <BellOff className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifs.map((n) => {
                    const { icon: Icon, color, bg } = ICON_MAP[n.type];
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.7}
                        onDragEnd={(e, info) => {
                          if (Math.abs(info.offset.x) > 80) {
                            dismiss(n.id);
                          }
                        }}
                        onClick={() => {
                          if (n.link) {
                            navigate(n.link);
                            onClose();
                          }
                        }}
                        className={cn(
                          "group relative flex gap-3 rounded-2xl border p-4 transition-all overflow-hidden",
                          n.link && "cursor-pointer hover:border-brand/40 hover:shadow-glow-sm",
                          n.read
                            ? "border-border/50 bg-secondary/30"
                            : "border-border bg-card shadow-soft",
                        )}
                      >
                        {/* Permanent Tap/Hover Glow */}
                        {n.link && (
                          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_70%)]" />
                        )}

                        {/* Unread dot */}
                        {!n.read && (
                          <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-brand" />
                        )}

                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `hsl(var(--background))` }}
                        >
                          <div className={cn("flex h-full w-full items-center justify-center rounded-xl", bg)}>
                            <Icon className={cn("h-4.5 w-4.5", color)} />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 pr-4">
                          <p
                            className={cn(
                              "text-sm font-semibold leading-snug",
                              n.read ? "text-foreground/70" : "text-foreground",
                            )}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                            {n.body}
                          </p>
                          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                            {n.time}
                          </p>
                        </div>

                        <button
                          onClick={() => dismiss(n.id)}
                          className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary group-hover:flex"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border px-5 py-3">
              <p className="text-center text-[10px] text-muted-foreground/50 uppercase tracking-widest">
                Nivasa · Real-time property alerts
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
