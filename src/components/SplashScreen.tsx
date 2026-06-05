import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  isReady: boolean;
  onFinished: () => void;
}

export const SplashScreen = ({ isReady, onFinished }: SplashScreenProps) => {
  const [phase, setPhase] = useState(1);
  const [hasCompletedMinTime, setHasCompletedMinTime] = useState(false);

  useEffect(() => {
    // Minimum cinematic duration for the first 3 phases
    const timer = setTimeout(() => {
      setHasCompletedMinTime(true);
    }, 2000);

    return () => clearTimeout(timer);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617] overflow-hidden">
      {/* Phase 1 & 2: Background Particles & Scanning Lines */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: phase <= 3 ? 0.4 : 0 }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#38BDF810] via-transparent to-transparent"
        />
        
        {/* Scanning Lines */}
        <motion.div 
          initial={{ y: "-100%" }}
          animate={{ y: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#38BDF820] to-transparent"
        />
      </div>

      {/* Phase 3 & 4: Core System & Logo */}
      <div className="relative flex flex-col items-center">
        <AnimatePresence mode="wait">
          {phase <= 3 ? (
            <motion.div
              key="pulse"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                filter: "drop-shadow(0 0 20px rgba(56, 189, 248, 0.3))"
              }}
              exit={{ opacity: 0, scale: 1.2, filter: "drop-shadow(0 0 40px rgba(56, 189, 248, 0.6))" }}
              transition={{ duration: 0.8 }}
              className="w-24 h-24 rounded-full border-2 border-[#38BDF840] flex items-center justify-center"
            >
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 rounded-full bg-[#38BDF820] blur-md"
              />
            </motion.div>
          ) : (
            <motion.div
              key="logo"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                filter: "drop-shadow(0 0 30px rgba(56, 189, 248, 0.4))"
              }}
              transition={{ 
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0.2
              }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <img src="/logo.svg" alt="Logo" className="w-32 h-32 text-[#38BDF8]" />
                
                {/* Light Sweep Effect */}
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
              </div>
              
              <motion.h1 
                initial={{ opacity: 0, letterSpacing: "0.5em" }}
                animate={{ opacity: 1, letterSpacing: "0.2em" }}
                transition={{ duration: 1, delay: 0.5 }}
                className="mt-6 text-2xl font-light text-[#F8FAFC] uppercase tracking-[0.2em]"
              >
                Estate
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phase 5 Transition: Parallax Camera push */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 4 ? 0.1 : 0 }}
        className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"
      />
    </div>
  );
};
