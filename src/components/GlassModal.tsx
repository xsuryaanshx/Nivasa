import { useEffect, useState, useRef, type ReactNode } from "react";
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
  const contentRef = useRef<HTMLDivElement>(null);
  const drawerContentRef = useRef<HTMLDivElement>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;

      // Check if it's an input/textarea
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        setIsKeyboardOpen(true);

        // Scroll input into view within the modal content only
        setTimeout(() => {
          if (contentRef.current && target.closest(contentRef.current)) {
            const inputRect = target.getBoundingClientRect();
            const contentRect = contentRef.current.getBoundingClientRect();

            // Only scroll if input is out of view
            if (inputRect.bottom > contentRect.bottom || inputRect.top < contentRect.top) {
              target.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }
        }, 100);
      }
    };

    const handleBlur = () => {
      setIsKeyboardOpen(false);
    };

    // Handle keyboard appearance on iOS
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const keyboardGap = window.innerHeight - currentHeight;

        if (keyboardGap > 100) {
          // Keyboard is likely open
          setKeyboardHeight(keyboardGap);
          setIsKeyboardOpen(true);
        } else {
          setKeyboardHeight(0);
          setIsKeyboardOpen(false);
        }
      }
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  const isNative = typeof window !== "undefined" &&
    (!!(window as any).Capacitor ||
      window.location.protocol === "file:" ||
      window.location.href.includes("android_asset"));

  return (
    <Drawer
      open={open}
      onOpenChange={(val) => !val && onClose()}
      repositionInputs={false}
    >
      <DrawerContent
        ref={drawerContentRef}
        className="bg-card border border-border/50 rounded-t-[20px] mx-auto w-full max-w-md shadow-float fixed bottom-0 left-0 right-0"
        style={{
          maxHeight: "90dvh",
          overflow: "hidden",
          bottom: isKeyboardOpen ? `${keyboardHeight}px` : "0px",
          transition: "bottom 0.3s ease-out",
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
          ref={contentRef}
          className={cn(
            "overflow-y-auto overflow-x-hidden overscroll-contain px-4 sm:px-6",
            "flex-1 flex flex-col",
            isKeyboardOpen ? "pb-96" : "pb-8"
          )}
          style={{
            maxHeight: "calc(90dvh - 80px)",
          }}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}