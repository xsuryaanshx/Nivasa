import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NivasaLogo } from "./NivasaLogo";

interface SplashScreenProps {
  isReady: boolean;
  onFinished: () => void;
}

export const SplashScreen = ({ isReady, onFinished }: SplashScreenProps) => {
  const [showLogo, setShowLogo] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show logo shortly after mount
    const timer = setTimeout(() => {
      setShowLogo(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Exit after logo has been visible for a moment and app is ready
    if (showLogo && isReady) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onFinished, 1000);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showLogo, isReady, onFinished]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background overflow-hidden">
      <motion.div
        animate={{
          opacity: isExiting ? 0 : 1,
          scale: isExiting ? 1.05 : 1,
          filter: isExiting ? "blur(10px)" : "blur(0px)",
        }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center gap-1"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: showLogo ? 1 : 0,
            y: showLogo ? 0 : 12,
          }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <NivasaLogo className="h-16 md:h-20 w-auto" />
        </motion.div>
      </motion.div>
    </div>
  );
};
