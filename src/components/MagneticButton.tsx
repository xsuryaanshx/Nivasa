import { motion, useMotionValue, useSpring } from "framer-motion";
import { forwardRef, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost" | "glass";
  strength?: number;
}

export const MagneticButton = forwardRef<HTMLButtonElement, Props>(function MagneticButton(
  { children, className, variant = "primary", strength = 18, ...props }, _ref
) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    // Disable magnetic effect on touch devices (mobile/tablets) to prevent click-misses
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      return;
    }
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    x.set(((e.clientX - cx) / r.width) * strength);
    y.set(((e.clientY - cy) / r.height) * strength);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  const variants = {
    primary: "bg-foreground text-background hover:opacity-90",
    ghost:   "bg-transparent text-foreground hover:bg-secondary",
    glass:   "glass text-foreground hover:bg-card",
  } as const;

  return (
    <motion.button
      ref={ref}
      style={{ x, y }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium shadow-soft transition-colors",
        variants[variant],
        className,
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
});