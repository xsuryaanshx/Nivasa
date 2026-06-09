import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical, Search, X, Moon, Sun, LogOut, Settings, Languages, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useLanguage } from "./LanguageProvider";
import { cn } from "@/lib/utils";

type MobileDrawerMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPalette?: () => void;
};

export function MobileDrawerMenu({ open, onOpenChange, onOpenPalette }: MobileDrawerMenuProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => onOpenChange(false);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] md:hidden"
            onClick={close}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed left-0 top-0 z-[101] flex h-[100dvh] w-[min(90vw,22rem)] flex-col overflow-hidden rounded-br-[2rem] rounded-tr-[2rem] border-y border-r border-border/60 bg-secondary/95 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl md:hidden",
            )}
          >
            <div className="flex shrink-0 items-center gap-2 p-3">
              <button
                type="button"
                onClick={() => {
                  onOpenPalette?.();
                  close();
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-foreground transition-colors hover:bg-muted"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              <div className="relative flex min-w-0 flex-1 items-center">
                <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t("search")}
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-foreground transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
              <MenuItem
                icon={theme === "dark" ? Moon : Sun}
                label={`Theme: ${theme === "dark" ? "Dark" : "Light"}`}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
              <MenuItem
                icon={Languages}
                label={`Lang: ${language === "en" ? "English" : "हिंदी"}`}
                onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              />

              <MenuItem
                icon={Settings}
                label={t("settings")}
                onClick={() => {
                  close();
                  navigate("/app/profile");
                }}
              />
              <MenuItem
                icon={Sparkles}
                label={t("subscription") || "Subscription"}
                onClick={() => {
                  close();
                  navigate("/app/subscription");
                }}
              />
              <MenuItem icon={LogOut} label={t("logout")} onClick={signOut} className="text-destructive" />

              <div className="mt-auto rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b] text-sm font-bold text-white dark:bg-foreground dark:text-background">
                    {user?.initials || "U"}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-sm font-semibold text-foreground">
                      {user?.email?.split("@")[0] || user?.firstName || t("user")}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("premium_member")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-background/60",
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-foreground shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-semibold text-foreground/90">{label}</span>
    </button>
  );
}
