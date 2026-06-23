import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Smartphone, ExternalLink } from "lucide-react";
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

  // Construct custom deep-linking schemes for each popular UPI app
  const getUpiUrl = (scheme: string) => {
    if (!pa) return "";
    return `${scheme}://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&am=${parseFloat(am).toFixed(2)}&tn=${encodeURIComponent(tn)}&cu=${cu}`;
  };

  const gpayUrl = getUpiUrl("gpay");
  const phonepeUrl = getUpiUrl("phonepe");
  const paytmUrl = getUpiUrl("paytmmp");
  const genericUpiUrl = getUpiUrl("upi");

  useEffect(() => {
    if (!pa) {
      setError("Invalid payment request: Missing recipient UPI ID.");
    }
  }, [pa]);

  const handlePay = (url: string) => {
    if (url) {
      window.location.href = url;
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
          <Smartphone className="h-8 w-8 text-brand" />
        </div>

        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
          Nivasa Pay
        </h1>
        <p className="mb-6 text-xs text-muted-foreground">
          Select your preferred payment app to complete the transaction safely.
        </p>

        {/* Invoice Summary Card */}
        <Card className="mb-6 border-white/5 bg-white/5 shadow-inner">
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

            {/* QR Code fallback for desktop scanners */}
            {genericUpiUrl && (
              <div className="mt-5 flex flex-col items-center justify-center space-y-2 pt-4 border-t border-white/5">
                <div className="p-2 bg-white rounded-xl shadow-soft flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(genericUpiUrl)}`}
                    alt="UPI QR Code"
                    className="h-28 w-28"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Or scan QR code to pay
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment App Options */}
        <div className="space-y-2.5 text-left mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Pay with UPI App
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Google Pay */}
            <Button
              onClick={() => handlePay(gpayUrl)}
              className="w-full h-12 justify-start px-4 text-sm font-medium rounded-xl border border-blue-500/10 bg-blue-500/5 hover:bg-blue-500/10 text-white hover:text-white"
            >
              <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1 shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#4285F4" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3 0-3.478 2.822-6.3 6.3-6.3 1.637 0 3.129.624 4.26 1.65l3.059-3.059C19.394 2.824 16.34 1.5 12.99 1.5 6.643 1.5 1.5 6.643 1.5 12.99s5.143 11.49 11.49 11.49c6.386 0 11.835-4.577 11.835-11.49 0-.785-.078-1.543-.225-2.28H12.24z"/>
                </svg>
              </div>
              Google Pay
              <ExternalLink className="ml-auto h-4 w-4 opacity-50" />
            </Button>

            {/* PhonePe */}
            <Button
              onClick={() => handlePay(phonepeUrl)}
              className="w-full h-12 justify-start px-4 text-sm font-medium rounded-xl border border-purple-500/10 bg-purple-500/5 hover:bg-purple-500/10 text-white hover:text-white"
            >
              <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1 shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#5f259f" d="M19.5 3h-15C3.67 3 3 3.67 3 4.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm3-6h-2V9c0-.55-.45-1-1-1s-1 .45-1 1v3c0 .55.45 1 1 1h3c.55 0 1-.45 1-1s-.45-1-1-1z"/>
                </svg>
              </div>
              PhonePe
              <ExternalLink className="ml-auto h-4 w-4 opacity-50" />
            </Button>

            {/* Paytm */}
            <Button
              onClick={() => handlePay(paytmUrl)}
              className="w-full h-12 justify-start px-4 text-sm font-medium rounded-xl border border-sky-500/10 bg-sky-500/5 hover:bg-sky-500/10 text-white hover:text-white"
            >
              <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1 shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#00baf2" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              Paytm
              <ExternalLink className="ml-auto h-4 w-4 opacity-50" />
            </Button>

            {/* Generic UPI */}
            <Button
              onClick={() => handlePay(genericUpiUrl)}
              variant="outline"
              className="w-full h-12 justify-start px-4 text-sm font-medium rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white"
            >
              <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 p-1.5 shrink-0 text-white">
                <Smartphone className="h-4 w-4" />
              </div>
              Other UPI Apps (Default)
              <ExternalLink className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-4">
          Secured by Nivasa. The selected option will prompt to open the corresponding payment app installed on your device.
        </p>
      </motion.div>
    </div>
  );
}
