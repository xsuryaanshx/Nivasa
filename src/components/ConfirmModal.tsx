import { GlassModal } from "./GlassModal";
import { MagneticButton } from "./MagneticButton";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true
}: ConfirmModalProps) {
  return (
    <GlassModal open={open} onClose={onClose} title={title}>
      <div className="p-6">
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              isDestructive 
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20" 
                : "bg-brand text-white hover:bg-brand/90"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </GlassModal>
  );
}
