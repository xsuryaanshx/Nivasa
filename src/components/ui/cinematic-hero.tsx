import { nivasaApi } from "@/lib/api";
"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }

  /* Environment Overlays */
  .film-grain {
      position: absolute; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 50; opacity: 0.05; mix-blend-mode: overlay;
      background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }

  .bg-grid-theme {
      background-size: 60px 60px;
      background-image: 
          linear-gradient(to right, color-mix(in srgb, hsl(var(--foreground)) 5%, transparent) 1px, transparent 1px),
          linear-gradient(to bottom, color-mix(in srgb, hsl(var(--foreground)) 5%, transparent) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  /* Theme-aware text (Shadow in Light Mode, Glow in Dark Mode) */
  .text-3d-matte {
      color: hsl(var(--foreground));
      text-shadow: 
          0 10px 30px color-mix(in srgb, hsl(var(--foreground)) 20%, transparent), 
          0 2px 4px color-mix(in srgb, hsl(var(--foreground)) 10%, transparent);
  }

  .text-silver-matte {
      background: linear-gradient(180deg, hsl(var(--foreground)) 0%, color-mix(in srgb, hsl(var(--foreground)) 40%, transparent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0); /* Hardware acceleration to prevent WebKit clipping bug */
      filter: 
          drop-shadow(0px 10px 20px color-mix(in srgb, hsl(var(--foreground)) 15%, transparent)) 
          drop-shadow(0px 2px 4px color-mix(in srgb, hsl(var(--foreground)) 10%, transparent));
  }
`;

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  tagline1?: string;
  tagline2?: string;
}

export function CinematicHero({ 
  tagline1 = "Your Property,",
  tagline2 = "Simplified.",
  className, 
  ...props 
}: CinematicHeroProps) {
  
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const checkFastBypass = async () => {
      try {
        if (nivasaApi) {
          const session = await nivasaApi.auth.getSession();
          if (session?.user && active) {
            navigate("/app", { replace: true });
            return true;
          }
        }
      } catch (e) {}
      return false;
    };

    let ctx: gsap.Context | null = null;
    checkFastBypass().then((bypassed) => {
      if (bypassed) return;
      ctx = gsap.context(() => {
      // Setup initial hidden state
      gsap.set(".text-track", { autoAlpha: 0, y: 60, scale: 0.85, filter: "blur(20px)", rotationX: -20 });
      gsap.set(".text-days", { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" });
      
      const tl = gsap.timeline({
        delay: 0.3,
        onComplete: async () => {
          // Check session while fading out
          let dest = "/login";
          try {
            if (nivasaApi) {
              const session = await nivasaApi.auth.getSession();
              if (session?.user) dest = "/app";
            }
          } catch (e) {}
          
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.6,
            ease: "power2.inOut",
            onComplete: () => {
              navigate(dest, { replace: true });
            }
          });
        }
      });

      // Animate text sequence in
      tl.to(".text-track", { duration: 1.2, autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", rotationX: 0, ease: "expo.out" })
        .to(".text-days", { duration: 1.0, clipPath: "inset(0 0% 0 0)", ease: "power4.inOut" }, "-=0.6")
        // Hold the animation on screen for ~2 seconds
        .to({}, { duration: 2.0 });

    }, containerRef);
    });

    return () => {
      active = false;
      if (ctx) ctx.revert();
    };
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-screen h-[100dvh] overflow-hidden flex items-center justify-center bg-background text-foreground font-sans antialiased", className)}
      style={{ perspective: "1500px" }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-theme absolute inset-0 z-0 pointer-events-none opacity-50" aria-hidden="true" />

      {/* BACKGROUND LAYER: Hero Texts */}
      <div className="hero-text-wrapper relative z-10 flex flex-col items-center justify-center text-center w-full px-4 will-change-transform transform-style-3d">
        <h1 className="text-track gsap-reveal text-3d-matte text-5xl md:text-7xl lg:text-[6rem] font-bold tracking-tight mb-2">
          {tagline1}
        </h1>
        <h1 className="text-days gsap-reveal text-silver-matte text-5xl md:text-7xl lg:text-[6rem] font-extrabold tracking-tighter">
          {tagline2}
        </h1>
      </div>
    </div>
  );
}
