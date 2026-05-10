'use client';

import { useNavigate, useLocation } from "react-router-dom";
import { Building2, Home, LayoutDashboard, Receipt, Zap } from "lucide-react";
import { InteractiveMenu } from "./ui/modern-mobile-menu";
import { useMemo, useState, useEffect } from "react";
import { useLanguage } from "./LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const dockApps = useMemo(() => [
    { id: "/app", label: t('home'), icon: LayoutDashboard },
    { id: "/app/buildings", label: t('buildings'), icon: Building2 },
    { id: "/app/rooms", label: t('rooms'), icon: Home },
    { id: "/app/payments", label: t('payments'), icon: Receipt },
    { id: "electricity", label: t('electricity'), icon: Zap }
  ], [t]);

  useEffect(() => {
    const scrollContainer = document.querySelector('.app-cover');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleAppClick = (index: number, id: string) => {
    if (id === "electricity") {
      window.dispatchEvent(new CustomEvent("estate:add-electricity"));
    } else {
      navigate(id);
    }
  };

  const activeIndex = useMemo(() => {
    const index = dockApps.findIndex(app => {
      if (app.id === "electricity") return false;
      if (app.id === "/app") return location.pathname === "/app";
      return location.pathname.startsWith(app.id);
    });
    return index === -1 ? 0 : index;
  }, [location.pathname, dockApps]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-0 right-0 z-50 flex justify-center lg:hidden px-4"
        >
          <InteractiveMenu 
            items={dockApps}
            activeIndex={activeIndex}
            onItemClick={handleAppClick}
          />
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
