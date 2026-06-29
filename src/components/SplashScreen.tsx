import { motion, type Transition, type Variants } from "framer-motion";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

// ---------------------------------------------------------------------------
// SECTION 1 — ANIMATION CONFIG
// ---------------------------------------------------------------------------

/** Total splash duration (3.5 seconds) */
export const SPLASH_TOTAL_MS = 3500;

export const SPLASH_TIMELINE = {
  reveal: { delay: 0.1, duration: 0.8 },
  glow: { delay: 0.3, duration: 1.5 },
  text: { delay: 0.8, duration: 0.8 },
  exit: { delay: 3.1, duration: 0.4 },
} as const;

const EASE_OUT_CUBIC: Transition["ease"] = [0.215, 0.61, 0.355, 1];
const EASE_IN_OUT_QUINT: Transition["ease"] = [0.83, 0, 0.17, 1];

export const splashContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: { duration: SPLASH_TIMELINE.exit.duration, ease: EASE_IN_OUT_QUINT },
  },
};

export const logoContainerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: SPLASH_TIMELINE.reveal.duration,
      ease: EASE_OUT_CUBIC,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.05,
    y: -10,
    transition: { duration: SPLASH_TIMELINE.exit.duration, ease: EASE_IN_OUT_QUINT },
  },
};

export const textVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: SPLASH_TIMELINE.text.delay,
      duration: SPLASH_TIMELINE.text.duration,
      ease: EASE_OUT_CUBIC,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const glowVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: [0, 0.7, 0.5, 0.7],
    scale: [0.8, 1.05, 0.98, 1],
    transition: {
      delay: SPLASH_TIMELINE.glow.delay,
      duration: SPLASH_TIMELINE.glow.duration,
      ease: "easeInOut",
      times: [0, 0.4, 0.8, 1],
      loop: Infinity,
      repeatDelay: 0.5,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.1,
    transition: { duration: SPLASH_TIMELINE.exit.duration },
  },
};

// ---------------------------------------------------------------------------
// SECTION 2 — HOOK
// ---------------------------------------------------------------------------

interface UseSplashAnimationOptions {
  isReady?: boolean;
  onComplete?: () => void;
}

interface UseSplashAnimationResult {
  isVisible: boolean;
  phase: "visible" | "exit";
  prefersReducedMotion: boolean;
  progress: number;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useSplashAnimation({
  isReady = true,
  onComplete,
}: UseSplashAnimationOptions = {}): UseSplashAnimationResult {
  const [phase, setPhase] = useState<"visible" | "exit">("visible");
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches,
  );
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const syncPreference = () => setPrefersReducedMotion(media.matches);
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    if (prefersReducedMotion) {
      finish();
      return;
    }

    // Simulate progress bar loading
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1.25;
      });
    }, 30);

    const exitTimer = window.setTimeout(() => setPhase("exit"), SPLASH_TOTAL_MS - 400);
    const completeTimer = window.setTimeout(finish, SPLASH_TOTAL_MS);
    timersRef.current.push(exitTimer, completeTimer);

    return () => {
      clearInterval(interval);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isReady, prefersReducedMotion, finish]);

  return { isVisible, phase, prefersReducedMotion, progress };
}

// ---------------------------------------------------------------------------
// SECTION 3 — COMPONENT
// ---------------------------------------------------------------------------

export interface SplashScreenProps {
  isReady?: boolean;
  onComplete?: () => void;
  onFinished?: () => void;
  className?: string;
}

export function SplashScreen({ isReady = true, onComplete, onFinished, className }: SplashScreenProps) {
  const handleComplete = onComplete || onFinished;
  const { isVisible, phase, prefersReducedMotion, progress } = useSplashAnimation({ isReady, onComplete: handleComplete });
  const { resolvedTheme } = useTheme();
  
  // Default to dark during mounting to prevent flash, then update based on resolvedTheme
  const [isDark, setIsDark] = useState(true);
  
  useEffect(() => {
    if (resolvedTheme) {
      setIsDark(resolvedTheme === "dark");
    }
  }, [resolvedTheme]);

  if (!isVisible || prefersReducedMotion) return null;

  const logoSrc = isDark ? "/logo-dark.png" : "/logo.png";
  const glowColor = isDark 
    ? "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.05) 50%, transparent 100%)" 
    : "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.04) 50%, transparent 100%)";

  return (
    <motion.div
      role="status"
      aria-label="Loading Nivasa"
      aria-live="polite"
      className={[
        "fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden transition-colors duration-300",
        isDark ? "bg-zinc-950" : "bg-zinc-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      initial="hidden"
      animate={phase}
      variants={splashContainerVariants}
      style={{ transform: "translateZ(0)" }}
    >
      {/* Background Radial Glow */}
      <motion.div
        aria-hidden
        variants={glowVariants}
        className="pointer-events-none absolute h-[500px] w-[500px] rounded-full will-change-[transform,opacity]"
        style={{
          background: glowColor,
          filter: "blur(60px)",
        }}
      />

      <div className="relative flex flex-col items-center z-10">
        {/* Logo Container */}
        <motion.div
          variants={logoContainerVariants}
          className={[
            "relative overflow-hidden rounded-2xl p-6 border backdrop-blur-xl shadow-2xl mb-8 flex items-center justify-center transition-colors duration-300",
            isDark ? "bg-zinc-900/50 border-zinc-800/80" : "bg-white/70 border-zinc-200/80"
          ].join(" ")}
        >
          {/* Shine/Light sweep animation overlay */}
          <div 
            className={[
              "absolute inset-0 w-[200%] h-full -translate-x-full animate-[shimmer_2.5s_infinite_linear]",
              isDark ? "bg-gradient-to-r from-transparent via-white/10 to-transparent" : "bg-gradient-to-r from-transparent via-black/5 to-transparent"
            ].join(" ")} 
            style={{ transform: 'skewX(-20deg)' }} 
          />
          
          <img
            src={logoSrc}
            alt="Nivasa"
            width={160}
            height={160}
            draggable={false}
            className={[
              "select-none object-contain h-32 w-32 filter",
              isDark ? "drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "drop-shadow-[0_0_10px_rgba(99,102,241,0.15)]"
            ].join(" ")}
          />
        </motion.div>

        {/* Subtitle / Branding Text */}
        <motion.div variants={textVariants} className="text-center">
          <h1 className={[
            "text-2xl font-semibold tracking-wider mb-2 transition-colors duration-300",
            isDark ? "text-white" : "text-zinc-900"
          ].join(" ")}>
            N I V A S A
          </h1>
          <p className={[
            "text-xs font-medium uppercase tracking-widest transition-colors duration-300",
            isDark ? "text-zinc-400" : "text-zinc-600"
          ].join(" ")}>
            Premium Living & Property Management
          </p>
        </motion.div>
      </div>

      {/* Progress Bar Container at Bottom */}
      <div className={[
        "absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-[3px] rounded-full overflow-hidden transition-colors duration-300",
        isDark ? "bg-zinc-900" : "bg-zinc-200"
      ].join(" ")}>
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Tailwind CSS custom animation injection */}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-150%) skewX(-20deg);
          }
          100% {
            transform: translateX(150%) skewX(-20deg);
          }
        }
      `}</style>
    </motion.div>
  );
}
