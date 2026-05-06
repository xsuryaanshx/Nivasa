import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { GooeyText } from "@/components/ui/gooey-text-morphing";

interface SplashScreenProps {
  isReady: boolean;
  onFinished: () => void;
}

export const SplashScreen = ({ isReady, onFinished }: SplashScreenProps) => {
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show the animation for at least 4.5 seconds to ensure it's seen
    const timer = setTimeout(() => {
      setAnimationFinished(true);
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Transition logic: Wait for both animation to "finish" AND app to be ready
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
          filter: isExiting ? "blur(20px)" : "blur(0px)"
        }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <div className="flex items-center justify-center w-full h-full">
          <GooeyText
            texts={["SMART", "PROPERTY", "MANAGEMENT", "EASY"]}
            morphTime={1.2}
            cooldownTime={0.4}
            className="font-bold"
            textClassName="text-foreground drop-shadow-[0_0_15px_hsl(var(--accent-blue)/0.5)]"
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

