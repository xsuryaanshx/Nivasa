import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

interface SplashScreenProps {
  isReady: boolean;
  onFinished: () => void;
}

// Sub-component for the Building to keep SplashScreen clean
const CinematicBuilding = ({ phase }: { phase: number }) => {
  return (
    <motion.div
      initial={{ scale: 0.85, y: 120, rotateX: 8, opacity: 0 }}
      animate={{ 
        scale: phase >= 2 ? 1 : 0.85, 
        y: phase >= 2 ? 0 : 120,
        rotateX: phase >= 3 ? 0 : 8,
        opacity: phase >= 2 ? 1 : 0,
      }}
      transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-[600px] aspect-[4/5] flex items-center justify-center perspective-[1200px]"
    >
      <svg viewBox="0 0 400 650" className="w-full h-full drop-shadow-[0_0_50px_rgba(56,189,248,0.1)]">
        <defs>
          <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF815" />
            <stop offset="45%" stopColor="#38BDF825" />
            <stop offset="55%" stopColor="#38BDF825" />
            <stop offset="100%" stopColor="#38BDF808" />
          </linearGradient>
          
          <linearGradient id="columnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF840" />
            <stop offset="50%" stopColor="#38BDF860" />
            <stop offset="100%" stopColor="#38BDF840" />
          </linearGradient>

          <filter id="windowGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="edgeBloom">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.22 0 0 0 0 0.74 0 0 0 0 0.97 0 0 0 0.5 0" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Foundation Base */}
        <motion.rect
          x="80" y="580" width="240" height="4" rx="2"
          fill="#38BDF820"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: phase >= 1 ? 1 : 0, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 1.5 }}
        />

        {/* Main Structural Silhouette (The Glass) */}
        <motion.path
          d="M100 580 L100 180 L200 120 L300 180 L300 580 Z"
          fill="url(#glassGrad)"
          stroke="#38BDF815"
          strokeWidth="1"
          initial={{ opacity: 0, scaleY: 0.95 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, scaleY: 1 }}
          transition={{ duration: 2.5, delay: 0.5 }}
        />

        {/* Structural Columns (Architectural Ribs) */}
        {[100, 150, 200, 250, 300].map((x, i) => (
          <motion.line
            key={i}
            x1={x} y1={x === 200 ? 120 : 180} x2={x} y2="580"
            stroke="url(#columnGrad)"
            strokeWidth="0.5"
            strokeOpacity="0.3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: phase >= 2 ? 1 : 0,
              opacity: phase >= 2 ? 1 : 0
            }}
            transition={{ duration: 2, delay: 1 + i * 0.2 }}
          />
        ))}

        {/* Floor Lines */}
        {[...Array(15)].map((_, i) => (
          <motion.line
            key={i}
            x1="100" y1={210 + i * 26} x2="300" y2={210 + i * 26}
            stroke="#38BDF8"
            strokeWidth="0.5"
            strokeOpacity="0.1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: phase >= 2 ? 1 : 0,
              opacity: phase >= 2 ? 0.15 : 0
            }}
            transition={{ duration: 1.5, delay: 1.5 + (14 - i) * 0.1 }}
          />
        ))}

        {/* Glowing Windows (Phase 3) */}
        <g filter="url(#windowGlow)">
          {[...Array(14)].map((_, i) => (
            <g key={i}>
              {[...Array(4)].map((_, j) => {
                const xPos = 115 + j * 46 + (j > 1 ? 8 : 0);
                const yPos = 214 + i * 26;
                return (
                  <motion.rect
                    key={j}
                    x={xPos}
                    y={yPos}
                    width="30"
                    height="18"
                    rx="1"
                    initial={{ fill: "#38BDF805", opacity: 0 }}
                    animate={{ 
                      fill: phase >= 3 ? (Math.random() > 0.3 ? "#38BDF860" : "#38BDF810") : "#38BDF805",
                      opacity: phase >= 2 ? 1 : 0,
                    }}
                    transition={{ 
                      duration: 2, 
                      delay: 2.5 + (13 - i) * 0.15 + j * 0.1,
                      ease: "easeOut"
                    }}
                  />
                );
              })}
            </g>
          ))}
        </g>

        {/* Data Stream Pulses (Ecosystem activation) */}
        {phase >= 3 && (
          <g>
            {[...Array(3)].map((_, i) => (
              <motion.path
                key={i}
                d={`M${150 + i * 50} 580 L${150 + i * 50} 150`}
                fill="none"
                stroke="#22C55E"
                strokeWidth="1.5"
                strokeDasharray="4 20"
                initial={{ strokeDashoffset: 100, opacity: 0 }}
                animate={{ 
                  strokeDashoffset: [100, -100],
                  opacity: [0, 0.4, 0]
                }}
                transition={{ 
                  duration: 3, 
                  delay: i * 0.8,
                  repeat: Infinity, 
                  ease: "linear"
                }}
              />
            ))}
          </g>
        )}

        {/* Roof Signal / Antenna */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={{ delay: 3 }}
        >
          <line x1="200" y1="120" x2="200" y2="80" stroke="#38BDF8" strokeWidth="1" />
          <motion.circle
            cx="200" cy="80" r="3" fill="#38BDF8"
            animate={{ 
              scale: [1, 2, 1],
              opacity: [0.5, 1, 0.5],
              filter: ["none", "blur(2px)", "none"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.g>
      </svg>

      {/* Surface Depth Shading Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617] opacity-40 pointer-events-none" />
    </motion.div>
  );
};

      {/* Glass Reflection Sweep Overlay */}
      <motion.div
        initial={{ left: "-100%", opacity: 0 }}
        animate={{ 
          left: phase >= 2 ? "200%" : "-100%",
          opacity: phase >= 2 ? [0, 0.15, 0] : 0
        }}
        transition={{ duration: 4, delay: 2, repeat: Infinity, repeatDelay: 3 }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-25deg] pointer-events-none"
      />
    </motion.div>
  );
};

const AtmosphericLayer = () => {
  const particles = useMemo(() => [...Array(60)].map((_, i) => ({
    id: i,
    size: Math.random() * 2 + 0.5,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 10
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Dynamic Background Glows */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-[#38BDF805] blur-[120px] rounded-full"
      />
      <motion.div 
        animate={{ 
          scale: [1.1, 1, 1.1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 bg-[#22C55E05] blur-[120px] rounded-full"
      />

      {/* Particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: `${p.x}%`, y: `${p.y}%` }}
          animate={{ 
            opacity: [0, 0.3, 0],
            y: [`${p.y}%`, `${p.y - 15}%`],
            x: [`${p.x}%`, `${p.x + (Math.random() - 0.5) * 10}%`]
          }}
          transition={{ 
            duration: p.duration, 
            delay: p.delay, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute rounded-full bg-[#38BDF830] blur-[0.5px]"
          style={{ width: p.size, height: p.size }}
        />
      ))}

      {/* Cinematic Fog / Haze */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent h-1/3 bottom-0 z-20" />
      <motion.div 
        animate={{ opacity: [0.4, 0.6, 0.4], y: [0, -10, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#38BDF808] to-transparent blur-3xl"
      />

      {/* Pulsing Grid System */}
      <div className="absolute inset-x-0 bottom-0 h-[30%] perspective-[800px] overflow-hidden">
        <motion.div 
          initial={{ rotateX: 65, opacity: 0, y: 100 }}
          animate={{ opacity: 0.2, y: 0 }}
          transition={{ duration: 2 }}
          className="w-[200%] h-full -left-1/2 relative"
          style={{ 
            backgroundImage: `
              linear-gradient(to right, #38BDF815 1px, transparent 1px),
              linear-gradient(to bottom, #38BDF815 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at center, black, transparent 80%)"
          }}
        >
          <motion.div 
            animate={{ backgroundPositionY: ["0px", "60px"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          />
        </motion.div>
      </div>
    </div>
  );
};

export const SplashScreen = ({ isReady, onFinished }: SplashScreenProps) => {
  const [phase, setPhase] = useState(1);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const sequence = async () => {
      // Phase 1: Foundation (0-2s) - Grid and Fog already starting
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPhase(2);

      // Phase 2: Structural Assembly (2-5s) - Building forms
      await new Promise(resolve => setTimeout(resolve, 3000));
      setPhase(3);

      // Phase 3: Activation (5-8s) - Windows and Data Flow
      // We'll wait here until isReady is true, but at least for 3 seconds
      const startTime = Date.now();
      const minPhase3Duration = 3000;
      
      const checkReady = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (isReady && elapsed >= minPhase3Duration) {
          setPhase(4);
          clearInterval(checkReady);
        }
      }, 100);

      return () => clearInterval(checkReady);
    };

    sequence();
  }, [isReady]);

  useEffect(() => {
    if (phase === 4) {
      // Phase 4: Logo Reveal (8-11s)
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onFinished, 1200); // Allow exit animation to finish
      }, 3500); 
      return () => clearTimeout(timer);
    }
  }, [phase, onFinished]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617] overflow-hidden">
      <AtmosphericLayer />
      
      {/* Cinematic Camera Wrapper */}
      <motion.div
        animate={{ 
          scale: isExiting ? 1.4 : [1, 1.05, 1],
          y: isExiting ? -50 : [0, -10, 0],
          opacity: isExiting ? 0 : 1,
          filter: isExiting ? "blur(20px)" : "blur(0px)"
        }}
        transition={{ 
          scale: { duration: isExiting ? 1.2 : 20, ease: isExiting ? [0.22, 1, 0.36, 1] : "linear", repeat: isExiting ? 0 : Infinity },
          y: { duration: 20, ease: "easeInOut", repeat: Infinity },
          opacity: { duration: 1 },
          filter: { duration: 1 }
        }}
        className="relative flex flex-col items-center justify-center w-full h-full scale-110"
      >
        <CinematicBuilding phase={phase} />

        {/* Logo Reveal Layer (Phase 4) */}
        <AnimatePresence>
          {phase === 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-30"
            >
              {/* Logo Glow Aura */}
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.4 }}
                className="absolute w-96 h-96 bg-[#38BDF820] blur-[120px] rounded-full"
              />
              
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="flex flex-col items-center"
              >
                <div className="relative group mb-10">
                  <img src="/logo.svg" alt="Estate" className="w-44 h-44 drop-shadow-[0_0_60px_rgba(56,189,248,0.7)]" />
                  
                  {/* Integrated Light Sweep */}
                  <motion.div 
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: "200%", opacity: [0, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"
                  />
                </div>
                
                <motion.h1
                  initial={{ letterSpacing: "2em", opacity: 0 }}
                  animate={{ letterSpacing: "0.8em", opacity: 1 }}
                  transition={{ duration: 2, delay: 0.5 }}
                  className="text-6xl font-extralight text-[#F8FAFC] uppercase tracking-[0.8em] ml-[0.8em]"
                >
                  Estate
                </motion.h1>
                
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "80%", opacity: 1 }}
                  transition={{ duration: 1.5, delay: 1 }}
                  className="h-px bg-gradient-to-r from-transparent via-[#38BDF880] to-transparent mt-8"
                />
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="text-[#38BDF8] mt-6 font-semibold tracking-[0.4em] text-sm uppercase"
                >
                  Premier Property Intelligence
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Finishing Light Scan */}
      <motion.div
        animate={{ 
          top: ["-100%", "200%"],
          opacity: [0, 0.3, 0]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-x-0 h-2 bg-gradient-to-r from-transparent via-[#38BDF840] to-transparent blur-sm pointer-events-none"
      />
    </div>
  );
};
