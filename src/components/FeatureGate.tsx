import React from "react";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { Lock, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  title?: string;
  description?: string;
}

export function FeatureGate({
  featureKey,
  children,
  fallback,
  title = "Premium Feature Locked",
  description = "Upgrade your plan to access this feature.",
}: FeatureGateProps) {
  const { canAccessFeature, isLoading } = useSubscriptionData();
  const navigate = useNavigate();

  // Show a loading skeleton or nothing while checking subscription state
  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasAccess = canAccessFeature(featureKey);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
        <Lock className="h-10 w-10" />
      </div>
      
      <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-3">
        {title}
      </h1>
      
      <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
        {description}
      </p>
      
      <Button
        onClick={() => navigate("/app/subscription")}
        size="lg"
        className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white font-semibold shadow-lg shadow-primary/20 group py-6 px-8 rounded-full"
      >
        <Sparkles className="mr-2 h-5 w-5" />
        View Plans & Upgrade
        <ChevronRight className="ml-1.5 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
      </Button>
    </div>
  );
}
