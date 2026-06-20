import React, { useEffect, useState } from "react";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { nivasaApi } from "@/lib/api";

interface TrustScoreBadgeProps {
  phone: string;
  className?: string;
  showLabel?: boolean;
}

export function TrustScoreBadge({ phone, className, showLabel = false }: TrustScoreBadgeProps) {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadScore() {
      if (!phone) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const s = await nivasaApi.getTrustScore(phone);
      if (mounted) {
        setScore(s);
        setLoading(false);
      }
    }
    loadScore();
    return () => {
      mounted = false;
    };
  }, [phone]);

  if (loading || !phone) return null;
  if (score === null) return null;

  const isExcellent = score >= 800;
  const isFair = score >= 500 && score < 800;
  const isPoor = score < 500;

  const getColors = () => {
    if (isExcellent) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (isFair) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  };

  const getIcon = () => {
    if (isExcellent) return <ShieldCheck className="w-3.5 h-3.5" />;
    if (isFair) return <Shield className="w-3.5 h-3.5" />;
    return <ShieldAlert className="w-3.5 h-3.5" />;
  };

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium", getColors(), className)} title="Nivasa Trust Score">
      {getIcon()}
      {showLabel && <span>Trust Score:</span>}
      <span className="font-bold">{score}</span>
    </div>
  );
}
