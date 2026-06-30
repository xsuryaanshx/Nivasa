import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, X } from "lucide-react";
import { motion, useAnimationControls } from "framer-motion";

interface UndoToastProps {
  id: string | number;
  message: string;
  onUndo: () => void;
  duration?: number;
}

export function UndoToast({ id, message, onUndo, duration = 5000 }: UndoToastProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const controls = useAnimationControls();

  useEffect(() => {
    controls.start({
      width: "0%",
      transition: { duration: duration / 1000, ease: "linear" }
    });

    const startTime = Date.now();
    const interval = setInterval(() => {
      const remaining = duration - (Date.now() - startTime);
      if (remaining <= 0) {
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, controls]);

  const handleUndo = () => {
    onUndo();
    toast.dismiss(id);
  };

  return (
    <div className="relative overflow-hidden flex items-center justify-between gap-4 p-3 sm:p-4 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full min-w-[300px] max-w-md mx-auto pointer-events-auto">
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{message}</p>
        <p className="text-[11px] font-medium text-muted-foreground">
          Confirmed in {Math.max(1, Math.ceil(timeLeft / 1000))}s
        </p>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          onClick={handleUndo}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold text-[11px] sm:text-xs hover:bg-amber-500/20 transition-all shadow-sm"
        >
          <RotateCcw className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
          UNDO
        </button>
        <button
          onClick={() => toast.dismiss(id)}
          className="p-1 sm:p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ width: "100%" }}
        animate={controls}
        className="absolute bottom-0 left-0 h-[3px] bg-amber-500/80"
      />
    </div>
  );
}

export function showUndoToast(message: string, onUndo: () => void) {
  const toastId = `undo-${Date.now()}`;
  toast.custom((id) => (
    <UndoToast id={id} message={message} onUndo={onUndo} duration={5000} />
  ), { 
    id: toastId,
    duration: 5000,
  });
}
