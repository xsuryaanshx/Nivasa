import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

export function ParallaxBackground() {
  const { scrollY } = useScroll();
  
  // We move the background slowly upwards as the user scrolls down.
  // 1000px scroll = 250px background movement (25% speed)
  // We negate it so it moves UP slightly as we scroll DOWN, creating depth.
  const y = useTransform(scrollY, [0, 1000], [0, -250]);
  
  // To avoid layout thrashing and keep 60fps on mobile, 
  // we use a motion.div that leverages GPU acceleration.
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-background">
      <motion.div
        className="absolute -inset-[500px] pointer-events-none"
        style={{ y }}
      >
        <div className="w-full h-full parallax-aurora-bg" />
      </motion.div>
    </div>
  );
}
