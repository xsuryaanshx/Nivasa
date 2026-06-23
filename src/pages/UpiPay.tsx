import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, AlertTriangle, ArrowRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function UpiPay() {
  const [searchParams] = useSearchParams();
  const pa = searchParams.get("pa");
  const pn = searchParams.get("pn") || "";
  const am = searchParams.get("am") || "";
  const tn = searchParams.get("tn") || "";
  const cu = searchParams.get("cu") || "INR";

  const [error, setError] = useState<string | null>(null);
  const [triedRedirect, setTriedRedirect] = useState(false);

  // Construct UPI URL: upi://pay?pa=...&pn=...&am=...&tn=...&cu=...
  const upiUrl = pa
    ? `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&am=${parseFloat(am).toFixed(2)}&tn=${encodeURIComponent(tn)}&cu=${cu}`
    : "";

  useEffect(() => {
    if (!pa) {
      setError("Invalid payment request: Missing recipient UPI ID.");
      return;
    }

    // Try automatic redirect on mobile/devices
    const performRedirect = () => {
      try {
        window.location.href = upiUrl;
        setTriedRedirect(true);
      } catch (err) {
        console.error("Failed to redirect to UPI app:", err);
      }
    };

    // Tiny delay to let the UI mount and feel premium before redirecting
    const timer = setTimeout(performRedirect, 800);
    return () => clearTimeout(timer);
  }, [pa, upiUrl]);

  const handleManualPay = () => {
    if (upiUrl) {
      window.location.href = upiUrl;
    }
  };

  if (error) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
        <div className="aurora" />
        <div className="absolute inset-0 bg-gradient-aurora opacity-60" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-[400px] glass-strong rounded-2xl p-8 shadow-float text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-foreground">Payment Error</h1>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">{error}</p>
          <a href="/" className="inline-flex items-center text-primary hover:underline text-sm font-medium">
            Return to Nivasa
          </a>
        </motion.div>
      </div>
    );
  }

  // Format currency display (e.g. ₹20,000.00)
  const numericAmount = parseFloat(am) || 0;
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: cu,
    maximumFractionDigits: 2,
  }).format(numericAmount);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-background px-4 py-12">
      <div className="aurora" />
      <div className="absolute inset-0 bg-gradient-aurora opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative z-10 w-full max-w-[420px] glass-strong rounded-2xl p-8 shadow-float text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Smartphone className="h-8 w-8 animate-pulse text-brand" />
        </div>

        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          Nivasa Pay
        </h1>
        <p className="mb-6 text-xs text-muted-foreground">
          {triedRedirect ? "Redirecting to your payment app..." : "Preparing secure UPI payment..."}
        </p>

        {/* Invoice Summary Card */}
        <Card className="mb-8 border-white/5 bg-white/5 shadow-inner">
          <CardContent className="p-6">
            <div className="text-3xl font-bold tracking-tight text-white mb-2">
              {formattedAmount}
            </div>
            {tn && (
              <div className="text-xs font-semibold text-brand uppercase tracking-wider mb-4">
                {tn.replace(/_/g, " ")}
              </div>
            )}
            <div className="h-px bg-white/10 my-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Payee</span>
              <span className="font-semibold text-foreground text-right">{pn}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>UPI ID</span>
              <span className="font-mono text-foreground text-right">{pa}</span>
            </div>
          </CardContent>
        </Card>

        {/* CTA Button */}
        <Button
          onClick={handleManualPay}
          className="w-full h-12 text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-brand/20 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          Pay Instantly via UPI App <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="mt-4 text-[10px] text-muted-foreground">
          Works with GPay, PhonePe, Paytm, BHIM, and other UPI applications. If the app doesn't open automatically, click the button above.
        </p>
      </motion.div>
    </div>
  );
}
