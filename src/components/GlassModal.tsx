import { useEffect, useState, type ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function GlassModal({ open, onClose, title, description, children }: Props) {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handler = () => {
      setViewportHeight(window.visualViewport?.height || window.innerHeight);
    };

    window.visualViewport.addEventListener("resize", handler);
    window.visualViewport.addEventListener("scroll", handler);
    handler(); // initialize

    return () => {
      window.visualViewport?.removeEventListener("resize", handler);
      window.visualViewport?.removeEventListener("scroll", handler);
    };
  }, []);

  const isNative = typeof window !== "undefined" && (
    !!(window as any).Capacitor ||
    window.location.protocol === "file:" ||
    window.location.href.includes("android_asset") ||
    !window.location.origin ||
    window.location.origin === "null"
  );

  return (
    <Drawer open={open} onOpenChange={(val) => !val && onClose()}>
      <DrawerContent 
        className={cn(
          "glass-strong rounded-t-[20px] border-border/50 mx-auto w-full max-w-md",
          isNative ? "max-h-[90dvh]" : "max-h-[85dvh]"
        )}
        style={(!isNative && viewportHeight) ? { maxHeight: `${viewportHeight * 0.85}px` } : undefined}
      >
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg font-semibold tracking-tight">{title}</DrawerTitle>
          {description && (
            <DrawerDescription className="text-xs text-muted-foreground mt-1">
              {description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className={cn(
          "overflow-y-auto overflow-x-hidden px-4 sm:px-6 pb-6 mt-2",
          !isNative && "flex-1"
        )}>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}