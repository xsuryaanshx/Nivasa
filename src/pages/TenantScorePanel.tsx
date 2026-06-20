import React, { useState } from "react";
import { ArrowLeft, Search, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { nivasaApi } from "@/lib/api";
import { format } from "date-fns";

export default function TenantScorePanel() {
  const [aadharInput, setAadharInput] = useState("");
  const [searchedAadhar, setSearchedAadhar] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAadhar = aadharInput.replace(/\D/g, "");
    if (cleanAadhar.length !== 12) {
      alert("Please enter a valid 12-digit Aadhar number.");
      return;
    }
    setLoading(true);
    setSearchedAadhar(cleanAadhar);
    setHasSearched(true);
    
    try {
      const s = await nivasaApi.getTrustScore(cleanAadhar);
      setScore(s);
      
      const history = await nivasaApi.getTrustIncidents(cleanAadhar);
      setIncidents(history);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isExcellent = score !== null && score >= 800;
  const isFair = score !== null && score >= 500 && score < 800;
  const isPoor = score !== null && score < 500;

  const getColors = () => {
    if (isExcellent) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (isFair) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  };

  const getIcon = () => {
    if (isExcellent) return <ShieldCheck className="w-8 h-8" />;
    if (isFair) return <Shield className="w-8 h-8" />;
    return <ShieldAlert className="w-8 h-8" />;
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/app/profile" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-brand" /> Tenant Score Checker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verify a tenant's Trust Score using their Aadhar number before onboarding them.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter 12-digit Aadhar Number"
              className="h-14 w-full rounded-2xl border border-border bg-card/50 pl-12 pr-4 text-base outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10"
              value={aadharInput}
              onChange={(e) => setAadharInput(e.target.value)}
              maxLength={14}
            />
          </div>
          <button 
            type="submit"
            disabled={loading || aadharInput.length < 12}
            className="h-14 px-8 rounded-2xl bg-brand text-white font-semibold shadow-lg shadow-brand/25 transition-all hover:bg-brand/90 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Check Score"}
          </button>
        </form>

        {hasSearched && !loading && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl border border-border bg-card shadow-sm text-center">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Trust Score</h2>
              <div className={`mx-auto inline-flex items-center gap-3 px-6 py-3 rounded-full border ${getColors()}`}>
                {getIcon()}
                <span className="text-4xl font-black tracking-tight">{score}</span>
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">
                {isExcellent && "This tenant has an excellent track record!"}
                {isFair && "This tenant has a fair track record. Proceed with caution."}
                {isPoor && "This tenant has a poor track record. Reconsider onboarding."}
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-border bg-card shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4">Incident History</h3>
              {incidents.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground bg-secondary/30 rounded-2xl">
                  No incidents reported for this Aadhar number.
                </div>
              ) : (
                <div className="space-y-4">
                  {incidents.map((inc) => (
                    <div key={inc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-background">
                      <div>
                        <div className="font-semibold text-sm capitalize">
                          {inc.incident_type.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(inc.created_at), "MMM d, yyyy")}
                        </div>
                        {inc.description && (
                          <div className="text-xs text-muted-foreground mt-2 bg-secondary/50 p-2 rounded-lg">
                            {inc.description}
                          </div>
                        )}
                      </div>
                      <div className={`text-sm font-bold px-3 py-1 rounded-full ${inc.score_change < 0 ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {inc.score_change > 0 ? "+" : ""}{inc.score_change} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
