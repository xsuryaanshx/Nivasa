import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface SplashScreenProps {
  isReady: boolean;
  onFinished: () => void;
}

export const SplashScreen = ({ isReady, onFinished }: SplashScreenProps) => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Start video playback with a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.warn("Autoplay failed, likely due to browser policy or Low Power Mode:", err);
          // Fallback: if autoplay fails, we still want to proceed after a reasonable delay
          setTimeout(() => setVideoEnded(true), 3000);
        });
      }
    }, 100);

    // Absolute fallback: if video hasn't ended in 10 seconds, proceed anyway
    const fallbackTimer = setTimeout(() => {
      setVideoEnded(true);
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    // Transition logic: Wait for both video to end AND app to be ready
    if (videoEnded && isReady) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onFinished, 1200);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [videoEnded, isReady, onFinished]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617] overflow-hidden">
      <motion.div
        animate={{ 
          scale: isExiting ? 1.2 : 1,
          opacity: isExiting ? 0 : 1,
          filter: isExiting ? "blur(20px)" : "blur(0px)"
        }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <video
          ref={videoRef}
          src="/Boot.mp4"
          className="w-full h-full object-cover bg-[#020617]"
          muted
          autoPlay
          playsInline
          webkit-playsinline="true"
          preload="auto"
          onEnded={() => setVideoEnded(true)}
          onError={(e) => {
            console.error("Video error:", e);
            setVideoEnded(true);
          }}
        />

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
