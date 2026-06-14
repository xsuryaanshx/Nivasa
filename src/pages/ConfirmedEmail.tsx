import { motion } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { MagneticButton } from "@/components/MagneticButton";

export default function ConfirmedEmail() {
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
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle className="h-8 w-8" />
        </div>

        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Email Confirmed!
        </h1>
        <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
          Your email address has been successfully verified. You are now logged in and ready to manage your workspace.
        </p>

        <Link to="/app" className="block w-full">
          <MagneticButton className="w-full">
            Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </MagneticButton>
        </Link>
      </motion.div>
    </div>
  );
}
