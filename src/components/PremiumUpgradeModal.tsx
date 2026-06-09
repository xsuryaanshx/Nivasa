import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Check, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PremiumUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
}

export function PremiumUpgradeModal({
  open,
  onOpenChange,
  title = "Unlock Premium Features",
  message = "You have reached your plan limit. Upgrade to continue.",
}: PremiumUpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    onOpenChange(false);
    navigate("/app/profile"); // We'll add the subscription view or navigate directly to the subscription route
    // Actually we'll add /app/subscription. Let's redirect there!
    setTimeout(() => {
      navigate("/app/subscription");
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-border/80 bg-background/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <DialogTitle className="text-center text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground font-medium px-2">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* Gold Quick Info */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/50 transition-all">
            <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              <Check className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Gold Plan — ₹899/month</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Up to 50 rooms, 300 tenants, Expense Management, Analytics, exports & priority support.
              </p>
            </div>
          </div>

          {/* Platinum Quick Info */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all">
            <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                Platinum Plan — ₹1199/month
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary uppercase tracking-wide">
                  Best Value
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unlimited rooms & tenants, Multi-property, Staff management, Branding & automated alerts.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2.5">
          <Button
            onClick={handleUpgradeClick}
            className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white font-semibold shadow-lg shadow-primary/20 group py-6"
          >
            Compare Plans & Upgrade
            <ChevronRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground py-6"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
