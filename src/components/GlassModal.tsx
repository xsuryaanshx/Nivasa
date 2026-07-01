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
  return (
    <Drawer
      open={open}
      onOpenChange={(val) => !val && onClose()}
      repositionInputs={false}
    >
      <DrawerContent
        className={cn(
          "bg-card border border-border/50 rounded-t-[20px] mx-auto w-full max-w-md shadow-float",
          "max-h-[85dvh]"
        )}
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
            "flex-1 flex flex-col pb-8"
          )}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}