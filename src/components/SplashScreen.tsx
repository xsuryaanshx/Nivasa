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
    // Start video playback
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error("Video playback failed:", err);
        // Fallback: mark as ended if playback fails
        setVideoEnded(true);
      });
    }
  }, []);

  useEffect(() => {
    // Transition logic: Wait for both video to end AND app to be ready
    // Or just video end if that's the primary cinematic driver
    if (videoEnded && isReady) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onFinished, 1200); // Match exit animation duration
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
          className="w-full h-full object-cover"
          muted
          playsInline
          onEnded={() => setVideoEnded(true)}
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
