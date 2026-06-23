import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Smartphone, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NivasaLogo } from "@/components/NivasaLogo";

export default function UpiPay() {
  const [searchParams] = useSearchParams();
  const pa = searchParams.get("pa");
  const pn = searchParams.get("pn") || "";
  const am = searchParams.get("am") || "";
  const tn = searchParams.get("tn") || "";
  const cu = searchParams.get("cu") || "INR";

  const [error, setError] = useState<string | null>(null);

  // Construct custom deep-linking schemes for popular UPI apps
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
      setError("Invalid payment request: Recipient UPI ID is missing.");
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
      {/* Background gradients */}
      <div className="aurora opacity-40 dark:opacity-100" />
      <div className="absolute inset-0 bg-gradient-aurora opacity-30 dark:opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative z-10 w-full max-w-[430px] glass-strong rounded-3xl p-6 sm:p-8 shadow-elev text-center border border-white/10"
      >
        {/* Brand Header */}
        <div className="mb-6">
          <NivasaLogo className="h-10 sm:h-12 w-auto mx-auto mb-2" />
          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-widest uppercase flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> SECURE PAYMENT PORTAL
          </p>
        </div>

        {/* Premium Receipt Card */}
        <Card className="mb-6 border-dashed border-border/80 bg-card/40 backdrop-blur-md shadow-soft rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            {/* Main Billing Value */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                Total Amount Due
              </div>
              <div className="text-3.5xl font-extrabold tracking-tight text-foreground">
                {formattedAmount}
              </div>
            </div>

            <div className="h-px bg-border/40 my-2" />

            {/* Receipt Parameters */}
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Purpose</span>
                <span className="font-medium text-foreground text-right capitalize">
                  {tn ? tn.replace(/_/g, " ") : "Rent Payment"}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Payee</span>
                <span className="font-semibold text-foreground text-right">{pn}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">UPI ID</span>
                <span className="font-mono text-[11px] sm:text-xs text-foreground text-right select-all">
                  {pa}
                </span>
              </div>
            </div>

            {/* Scanner layout for desktop */}
            {genericUpiUrl && (
              <div className="mt-4 pt-4 border-t border-border/40 flex flex-col items-center justify-center space-y-3">
                {/* QR scanning camera target box */}
                <div className="relative p-3 bg-white rounded-xl shadow-soft border border-border/30 flex items-center justify-center">
                  {/* Focus corners */}
                  <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-brand rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-brand rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-brand rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-brand rounded-br-sm" />
                  
                  {/* Scan line effect */}
                  <motion.div
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="absolute left-0 w-full h-[2px] bg-brand shadow-[0_0_8px_rgba(59,130,246,0.6)] pointer-events-none z-10"
                  />

                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(genericUpiUrl)}`}
                    alt="UPI QR Code"
                    className="h-28 w-28 sm:h-32 sm:w-32 relative z-0"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Scan QR with any payment app to pay
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* UPI App Selection grid */}
        <div className="space-y-3 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pay via UPI application
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Google Pay */}
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={() => handlePay(gpayUrl)}
                className="w-full h-12 justify-start px-4 text-sm font-medium rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-foreground transition-colors duration-200"
              >
                <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1.5 shrink-0 shadow-sm border border-border">
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path fill="#4285F4" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3 0-3.478 2.822-6.3 6.3-6.3 1.637 0 3.129.624 4.26 1.65l3.059-3.059C19.394 2.824 16.34 1.5 12.99 1.5 6.643 1.5 1.5 6.643 1.5 12.99s5.143 11.49 11.49 11.49c6.386 0 11.835-4.577 11.835-11.49 0-.785-.078-1.543-.225-2.28H12.24z"/>
                  </svg>
                </div>
                Google Pay
                <ExternalLink className="ml-auto h-4 w-4 opacity-40 text-muted-foreground" />
              </Button>
            </motion.div>

            {/* PhonePe */}
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={() => handlePay(phonepeUrl)}
                className="w-full h-12 justify-start px-4 text-sm font-medium rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-foreground transition-colors duration-200"
              >
                <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1.5 shrink-0 shadow-sm border border-border">
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path fill="#5f259f" d="M19.5 3h-15C3.67 3 3 3.67 3 4.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm3-6h-2V9c0-.55-.45-1-1-1s-1 .45-1 1v3c0 .55.45 1 1 1h3c.55 0 1-.45 1-1s-.45-1-1-1z"/>
                  </svg>
                </div>
                PhonePe
                <ExternalLink className="ml-auto h-4 w-4 opacity-40 text-muted-foreground" />
              </Button>
            </motion.div>

            {/* Paytm */}
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={() => handlePay(paytmUrl)}
                className="w-full h-12 justify-start px-4 text-sm font-medium rounded-xl border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 text-foreground transition-colors duration-200"
              >
                <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white p-1.5 shrink-0 shadow-sm border border-border">
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path fill="#00baf2" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </div>
                Paytm
                <ExternalLink className="ml-auto h-4 w-4 opacity-40 text-muted-foreground" />
              </Button>
            </motion.div>

            {/* Generic UPI */}
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={() => handlePay(genericUpiUrl)}
                variant="outline"
                className="w-full h-12 justify-start px-4 text-sm font-medium rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors duration-200"
              >
                <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg bg-muted p-1.5 shrink-0 text-muted-foreground border border-border">
                  <Smartphone className="h-4 w-4" />
                </div>
                Other UPI Apps (Default)
                <ExternalLink className="ml-auto h-4 w-4 opacity-40 text-muted-foreground" />
              </Button>
            </motion.div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-6 leading-relaxed">
          Powered by Nivasa Payment Gateway. Your transaction is encrypted and completely secure.
        </p>
      </motion.div>
    </div>
  );
}
