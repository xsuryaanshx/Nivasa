"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";

const INJECTED_STYLES = `
  .gsap-reveal { opacity: 0; }

  .film-grain {
      position: absolute; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 50; opacity: 0.05; mix-blend-mode: overlay;
      background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }

  .perspective-container { perspective: 1500px; }
  @media (max-width: 768px) {
      .perspective-container { perspective: 1000px; }
  }

  .bg-grid-theme {
      background-size: 60px 60px;
      background-image: 
          linear-gradient(to right, color-mix(in srgb, hsl(var(--foreground)) 5%, transparent) 1px, transparent 1px),
          linear-gradient(to bottom, color-mix(in srgb, hsl(var(--foreground)) 5%, transparent) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  .premium-depth-card {
    background: linear-gradient(145deg, color-mix(in srgb, hsl(var(--accent-blue)) 20%, hsl(var(--background))), hsl(var(--background)));
    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.1);
    border: 1px solid color-mix(in srgb, hsl(var(--foreground)) 5%, transparent);
  }

  .iphone-bezel {
      background-color: #111;
      box-shadow: inset 0 0 0 7px #000, 0 40px 80px -15px rgba(0,0,0,0.4);
  }

  .text-card-silver-matte {
      background: linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
  }
  
  .btn-modern-light {
      background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%);
      color: #0F172A;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 1px white;
  }
  .btn-modern-dark {
      background: linear-gradient(180deg, #27272A 0%, #18181B 100%);
      color: #FFFFFF;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1);
  }
`;

export function CinematicHero({
  brandName = "ESTATE",
  tagline1 = "PREMIUM RENTAL",
  tagline2 = "OS FOR LANDLORDS",
  ctaHeading = "A New Era of Property Management",
  ctaDescription = "Streamline your buildings, rooms, and payments with the precision of a billion-dollar startup.",
  className,
  ...props
}: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("CinematicHero: Starting automatic sequence");
    
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          console.log("CinematicHero: Animation complete, redirecting...");
          navigate("/login");
        }
      });

      // Initial state
      gsap.set(".gsap-reveal", { opacity: 0, y: 20 });
      gsap.set(".main-card", { scale: 0.8, opacity: 0 });
      
      tl.to(".gsap-reveal", { 
        opacity: 1, 
        y: 0, 
        duration: 1, 
        stagger: 0.2, 
        ease: "power3.out" 
      })
      .to(".main-card", {
        opacity: 1,
        scale: 1,
        duration: 1.5,
        ease: "expo.out"
      }, "-=0.5")
      .to({}, { duration: 2 }); // Hold for 2 seconds (Total ~4-5s)

      // Safety timeout in case GSAP stalls
      const safety = setTimeout(() => {
        navigate("/login");
      }, 6000);
      
      return () => clearTimeout(safety);
    }, containerRef);

    return () => ctx.revert();
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background text-foreground font-sans antialiased overflow-hidden perspective-container",
        className
      )}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-theme absolute inset-0 z-0 opacity-50" aria-hidden="true" />
      
      <div className="relative z-10 w-full max-w-5xl px-6 text-center">
        <div className="gsap-reveal mb-4">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent-blue">{tagline1}</span>
        </div>
        <h1 className="gsap-reveal text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-none">
          {brandName}
        </h1>
        
        <div className="main-card premium-depth-card p-8 md:p-16 rounded-[40px] mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-4 text-card-silver-matte">{ctaHeading}</h2>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">{ctaDescription}</p>
        </div>

        <div className="gsap-reveal flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/login" className="btn-modern-light px-8 py-4 rounded-2xl font-bold">Sign In</Link>
          <Link to="/register" className="btn-modern-dark px-8 py-4 rounded-2xl font-bold">Register</Link>
        </div>
      </div>
    </div>
  );
}
