import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AuroraText } from "@/components/ui/aurora-text";

interface SplashScreenProps {
  isReady: boolean;
  onFinished: () => void;
}

export const SplashScreen = ({ isReady, onFinished }: SplashScreenProps) => {
  const [showLine1, setShowLine1] = useState(false);
  const [showLine2, setShowLine2] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Line 1 appears instantly
    setShowLine1(true);

    // Line 2 appears 0.75s after line 1
    const line2Timer = setTimeout(() => {
      setShowLine2(true);
    }, 750);

    return () => clearTimeout(line2Timer);
  }, []);

  useEffect(() => {
    // Exit after line 2 has been visible for a moment and app is ready
    if (showLine2 && isReady) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onFinished, 1000);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showLine2, isReady, onFinished]);

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
        {/* Line 1: "Your Property" */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: showLine1 ? 1 : 0,
            y: showLine1 ? 0 : 12,
          }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <AuroraText
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
            colors={["#38bdf8", "#7928CA", "#0070F3", "#38bdf8"]}
            speed={0.8}
          >
            Your Property,
          </AuroraText>
        </motion.div>

        {/* Line 2: "Simplified" — appears 2s after line 1 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: showLine2 ? 1 : 0,
            y: showLine2 ? 0 : 12,
          }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <AuroraText
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
            colors={["#38bdf8", "#7928CA", "#0070F3", "#38bdf8"]}
            speed={0.8}
          >
            Simplified.
          </AuroraText>
        </motion.div>
      </motion.div>
    </div>
  );
};
