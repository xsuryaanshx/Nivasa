import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  isReady: boolean;
  onFinished: () => void;
}

export const SplashScreen = ({ isReady, onFinished }: SplashScreenProps) => {
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show "Simplified" after a 2-second delay
    const subtitleTimer = setTimeout(() => {
      setShowSubtitle(true);
    }, 2000);

    // Mark animation as finished after subtitle has been visible
    const finishTimer = setTimeout(() => {
      setAnimationFinished(true);
    }, 4000);

    return () => {
      clearTimeout(subtitleTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  useEffect(() => {
    if (animationFinished && isReady) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onFinished, 1200);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [animationFinished, isReady, onFinished]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background overflow-hidden">
      <motion.div
        animate={{
          scale: isExiting ? 1.2 : 1,
          opacity: isExiting ? 0 : 1,
          filter: isExiting ? "blur(20px)" : "blur(0px)",
        }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {/* Line 1: "Your Property," */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight"
            style={{
              textShadow: "0 0 30px hsl(var(--accent-blue) / 0.3)",
            }}
          >
            Your Property,
          </motion.h1>

          {/* Line 2: "Simplified" — appears with 2s delay */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{
              opacity: showSubtitle ? 1 : 0,
              y: showSubtitle ? 0 : 16,
            }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-wide"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent-blue)), hsl(260 60% 65%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 20px hsl(var(--accent-blue) / 0.25))",
            }}
          >
            Simplified.
          </motion.h2>
        </div>

        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617] opacity-40 pointer-events-none" />

        {/* Subtle Scanline Effect */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
            backgroundSize: "100% 2px, 3px 100%",
          }}
        />
      </motion.div>

      {/* Exit Light Scan */}
      {isExiting && (
        <motion.div
          initial={{ top: "-100%" }}
          animate={{ top: "200%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent blur-sm z-[10000]"
        />
      )}
    </div>
  );
};
