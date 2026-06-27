import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    const handleScroll = () => {
      const cover = document.querySelector('.app-cover');
      const main = document.querySelector('main');
      const scrollY = window.scrollY || document.documentElement.scrollTop || cover?.scrollTop || main?.scrollTop || 0;
      sessionStorage.setItem(`scroll-pos-${location.pathname}`, scrollY.toString());
    };
    
    // Listen on all possible scroll containers
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [location.pathname]);

  useEffect(() => {
    if (navType === "POP") {
      const saved = sessionStorage.getItem(`scroll-pos-${location.pathname}`);
      if (saved) {
        const targetScroll = parseInt(saved, 10);
        
        const tryScroll = () => {
          window.scrollTo(0, targetScroll);
          document.documentElement.scrollTo?.({ top: targetScroll });
          document.querySelector('.app-cover')?.scrollTo?.({ top: targetScroll });
          document.querySelector('main')?.scrollTo?.({ top: targetScroll });
        };

        tryScroll();
        
        let attempts = 0;
        const interval = setInterval(() => {
          const cover = document.querySelector('.app-cover');
          const main = document.querySelector('main');
          const currentY = window.scrollY || document.documentElement.scrollTop || cover?.scrollTop || main?.scrollTop || 0;
          
          if (currentY < targetScroll) {
            tryScroll();
          }
          attempts++;
          if (attempts > 15) clearInterval(interval);
        }, 100);

        return () => clearInterval(interval);
      }
    } else {
      const toTop = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTo?.({ top: 0 });
        document.querySelector('.app-cover')?.scrollTo?.({ top: 0 });
        document.querySelector('main')?.scrollTo?.({ top: 0 });
      };
      toTop();
    }
  }, [location.pathname, navType]);

  return null;
}
