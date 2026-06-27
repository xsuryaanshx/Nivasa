import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`scroll-pos-${location.key}`, window.scrollY.toString());
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      sessionStorage.setItem(`scroll-pos-${location.key}`, window.scrollY.toString());
    };
  }, [location.key]);

  useEffect(() => {
    if (navType === "POP") {
      const saved = sessionStorage.getItem(`scroll-pos-${location.key}`);
      if (saved) {
        requestAnimationFrame(() => {
          // Wait for render, then scroll
          setTimeout(() => {
            window.scrollTo(0, parseInt(saved, 10));
          }, 100);
        });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.key, navType]);

  return null;
}
