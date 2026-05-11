import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import { MoreVertical, Search, X, Moon, Sun, LogOut, Settings, Globe, Languages } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useCurrency, type CurrencyCode } from "@/lib/currency";
import { useLanguage } from "./LanguageProvider";
import { cn } from "@/lib/utils";

gsap.registerPlugin(CustomEase);

export function MobileDrawerMenu() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    CustomEase.create('drawerEase', 'M0,0 C0.25,0.1 0.25,1 1,1');
  }, []);

  const toggleMenu = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    const duration = 0.75;
    
    if (nextState) {
      // Open animation
      gsap.to(menuRef.current, { height: window.innerHeight * 0.8, duration, ease: 'drawerEase' });
      gsap.to('.app-cover', {
        width: window.innerWidth * 0.65,
        height: window.innerHeight * 0.8,
        left: 'auto',
        right: 16,
        top: '50%',
        y: '-50%',
        borderRadius: 32,
        duration,
        ease: 'drawerEase',
      });
    } else {
      // Close animation
      gsap.to(menuRef.current, { height: 65, duration, ease: 'drawerEase' });
      gsap.to('.app-cover', {
        width: '100%',
        height: '100%',
        left: 0,
        right: 'auto',
        top: 0,
        y: 0,
        borderRadius: 0,
        duration,
        ease: 'drawerEase',
      });
    }
  };

  return (
    <div 
      ref={menuRef}
      className={cn(
        "mobile-drawer-menu fixed left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[50] h-[65px] overflow-hidden rounded-[32px] bg-secondary p-2 transition-[width] duration-500 ease-out md:hidden",
        isOpen ? "w-[min(360px,calc(100vw-2rem))]" : "w-[65px]",
      )}
    >
      <div ref={optionsRef} className="flex w-full items-center gap-3">
        <button onClick={toggleMenu} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-foreground hover:bg-muted transition-colors">
          <MoreVertical className="h-5 w-5" />
        </button>
        <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-full">
          <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            className="h-12 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground"
            placeholder={t('search')}
          />
        </div>
        <button onClick={toggleMenu} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-foreground hover:bg-muted transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="space-y-3 px-2 py-6">
        <MenuItem 
          icon={theme === 'dark' ? Sun : Moon} 
          label={`Theme: ${theme === 'dark' ? 'Light' : 'Dark'}`} 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
        
        <MenuItem 
          icon={Languages} 
          label={`Lang: ${language === 'en' ? 'English' : 'हिंदी'}`} 
          onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
        />

        <MenuItem 
          icon={Globe} 
          label={`${t('currency')}: ${currency.code}`} 
          onClick={() => {
            const codes: CurrencyCode[] = ["INR", "USD", "EUR", "GBP", "AED"];
            const nextIdx = (codes.indexOf(currency.code) + 1) % codes.length;
            setCurrency(codes[nextIdx]);
          }}
        />

        <MenuItem 
          icon={Settings} 
          label={t('settings')}
          onClick={() => {
            toggleMenu();
            navigate("/app/settings");
          }}
        />
        
        <MenuItem 
          icon={LogOut} 
          label={t('logout')} 
          onClick={signOut}
          className="text-destructive"
        />
        
        <div className="h-24 w-full overflow-hidden rounded-2xl bg-card mt-6 border border-border flex items-center justify-center p-4">
           <div className="flex flex-col items-center gap-2">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background font-bold text-sm">
                {user?.initials || "U"}
             </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold">{user?.firstName || t('user')}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('premium_member')}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-start gap-4 hover:bg-background/50 p-2 rounded-2xl cursor-pointer transition-colors ${className}`}
    >
      <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-semibold text-sm text-foreground/90 capitalize">{label}</span>
    </div>
  );
}
