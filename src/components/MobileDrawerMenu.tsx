import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import { MoreVertical, Search, X, MessageSquare, TrendingUp, Bookmark, Image as ImageIcon, Bell, Users, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

gsap.registerPlugin(CustomEase);

export function MobileDrawerMenu() {
  const { user, signOut } = useAuth();
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
      gsap.to(optionsRef.current, { x: -42, duration, ease: 'drawerEase' });
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
      gsap.to('.topbar-elements', { opacity: 0, duration: 0.3 });
    } else {
      // Close animation
      gsap.to(optionsRef.current, { x: 0, duration, ease: 'drawerEase' });
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
      gsap.to('.topbar-elements', { opacity: 1, duration: 0.5, delay: 0.2 });
    }
  };

  return (
    <div 
      ref={menuRef}
      className="mobile-drawer-menu absolute left-4 top-4 z-[50] h-[65px] w-[263px] overflow-hidden rounded-[32px] bg-secondary p-2 md:hidden"
    >
      <div ref={optionsRef} className="flex w-[263px] items-center gap-3">
        <button onClick={toggleMenu} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-foreground hover:bg-muted transition-colors">
          <MoreVertical className="h-5 w-5" />
        </button>
        <div className="relative flex w-[218px] shrink-0 items-center justify-center overflow-hidden rounded-full">
          <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            className="h-12 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search"
          />
        </div>
        <button onClick={toggleMenu} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-foreground hover:bg-muted transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="space-y-4 px-2 py-6">
        <MenuItem icon={MessageSquare} label="Messages" />
        <MenuItem icon={TrendingUp} label="Trending" />
        <MenuItem icon={Bookmark} label="Bookmarks" />
        <MenuItem icon={ImageIcon} label="Gallery" />
        <MenuItem icon={Bell} label="Notifications" />
        <MenuItem icon={Users} label="People" />
        <MenuItem icon={Settings} label="Settings" />
        
        <div className="h-28 w-full overflow-hidden rounded-2xl bg-card mt-6 border border-border flex items-center justify-center p-4">
           <div className="flex flex-col items-center gap-2">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background font-bold text-sm">
                {user?.initials || "U"}
             </div>
             <span className="text-sm font-medium">{user?.firstName || "User"}</span>
           </div>
        </div>
        
        <button 
           onClick={signOut}
           className="w-full py-3 mt-2 rounded-xl text-destructive bg-destructive/10 font-semibold text-sm"
        >
           Sign Out
        </button>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="flex items-center justify-start gap-4 hover:bg-background/50 p-2 rounded-2xl cursor-pointer transition-colors">
      <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-semibold text-sm text-foreground/90 capitalize">{label}</span>
    </div>
  );
}
