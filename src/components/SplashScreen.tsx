import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  isReady: boolean;
  onFinished: () => void;
}

export const SplashScreen = ({ isReady, onFinished }: SplashScreenProps) => {
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Optimized duration for 3 words (YOUR, PROPERTY, SIMPLIFIED)
    const timer = setTimeout(() => {
      setAnimationFinished(true);
    }, 2000);

    // Mark animation as finished after subtitle has been visible for a moment
    const finishTimer = setTimeout(() => {
      setAnimationFinished(true);
    }, 4000);

    return () => {
      clearTimeout(subtitleTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  useEffect(() => {
    if (hasCompletedMinTime && isReady) {
      // Transition to logo reveal faster if app is ready
      setPhase(4);
    } else if (hasCompletedMinTime && !isReady) {
      // Wait for app to be ready if it's taking longer
      // But stay in Phase 3 (pulse)
      setPhase(3);
    }
  }, [hasCompletedMinTime, isReady]);

  useEffect(() => {
    if (phase === 4) {
      const timer = setTimeout(() => {
        onFinished();
      }, 1500); // Logo reveal duration
      return () => clearTimeout(timer);
    }
  }, [phase, onFinished]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background overflow-hidden">
      <motion.div
        animate={{
          scale: isExiting ? 1.2 : 1,
          opacity: isExiting ? 0 : 1,
          filter: isExiting ? "blur(20px)" : "blur(0px)"
        }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <div className="flex items-center justify-center w-full h-full">
          <GooeyText
            texts={["YOUR", "PROPERTIES", "SIMPLIFIED"]}
            morphTime={0.8}
            cooldownTime={0.5}
            className="font-bold"
            textClassName="text-foreground drop-shadow-[0_0_20px_hsl(var(--accent-blue)/0.4)]"
          />
        </div>

        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617] opacity-40 pointer-events-none" />

        {/* Subtle Scanline Effect */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
            backgroundSize: "100% 2px, 3px 100%"
          }}
        />
      </motion.div>

      {/* Phase 5 Transition: Parallax Camera push */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 4 ? 0.1 : 0 }}
        className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"
      />
    </div>
  );
};
