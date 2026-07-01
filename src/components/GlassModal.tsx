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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set initial heights
    setViewportHeight(window.visualViewport?.height || window.innerHeight);

    const onResize = () => {
      if (window.visualViewport) {
        const vh = window.visualViewport.height;
        const ih = window.innerHeight;
        setViewportHeight(vh);
        // On iOS, innerHeight stays the same when keyboard opens, but visualViewport shrinks.
        // On Android, both shrink together, so keyboardHeight will be 0 (which is correct because Android resizes the page natively).
        setKeyboardHeight(Math.max(0, ih - vh));
      }
    };

    window.visualViewport?.addEventListener("resize", onResize);
    // Also listen to focus to ensure we update if resize event is missed or delayed
    window.addEventListener("focusin", onResize);
    window.addEventListener("focusout", () => setTimeout(onResize, 50));

    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("focusin", onResize);
    };
  }, []);

  const isKeyboardOpen = keyboardHeight > 0;

  return (
    <Drawer
      open={open}
      onOpenChange={(val) => !val && onClose()}
      repositionInputs={false}
    >
      <DrawerContent
        className="bg-card border border-border/50 rounded-t-[20px] mx-auto w-full max-w-md shadow-float fixed left-0 right-0"
        style={{
          bottom: `${keyboardHeight}px`,
          maxHeight: isKeyboardOpen ? `${viewportHeight}px` : "90dvh",
          overflow: "hidden",
          transition: "bottom 0.2s ease-out, max-height 0.2s ease-out",
        }}
      >
        <DrawerHeader className="pb-2 flex-shrink-0">
          <DrawerTitle className="text-lg font-semibold tracking-tight">
            {title}
          </DrawerTitle>
          {description && (
            <DrawerDescription className="text-xs text-muted-foreground mt-1">
              {description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div
          className={cn(
            "overflow-y-auto overflow-x-hidden overscroll-contain px-4 sm:px-6",
            "flex-1 flex flex-col",
            isKeyboardOpen ? "pb-32" : "pb-8"
          )}
          style={{
            maxHeight: isKeyboardOpen
              ? `calc(${viewportHeight}px - 80px)`
              : "calc(90dvh - 80px)",
          }}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}