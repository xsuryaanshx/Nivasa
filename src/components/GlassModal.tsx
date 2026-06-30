import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function GlassModal({ open, onClose, title, description, children }: Props) {
  return (
    <Drawer open={open} onOpenChange={(val) => !val && onClose()}>
      <DrawerContent className="max-h-[85dvh] glass-strong rounded-t-[20px] border-border/50 mx-auto w-full max-w-md">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg font-semibold tracking-tight">{title}</DrawerTitle>
          {description && (
            <DrawerDescription className="text-xs text-muted-foreground mt-1">
              {description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 mt-2">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}