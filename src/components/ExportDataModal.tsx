import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Building2, Home, Users, ReceiptIndianRupee, Calendar as CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { nivasaApi } from "@/lib/api";
import { downloadExcel } from "@/lib/export";
import { toast } from "sonner";
import { useState } from "react";

const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

const YEARS = ["all", "2024", "2025", "2026", "2027", "2028", "2029", "2030"];

export function ExportDataModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  if (!open) return null;

  const handleExport = async (type: "buildings" | "rooms" | "tenants" | "payments") => {
    setExporting(type);
    try {
      let data = [];
      let filename = "";

      if (type === "buildings") {
        data = await nivasaApi.getBuildings();
        filename = "Buildings_Export";
      } else if (type === "rooms") {
        data = await nivasaApi.getRooms();
        filename = "Rooms_Export";
      } else if (type === "tenants") {
        data = await nivasaApi.getTenants();
        filename = "Tenants_Export";
      } else if (type === "payments") {
        const rawPayments = await nivasaApi.getRecentPayments(10000);
        
        let filteredPayments = rawPayments;
        
        // Filter by month and year
        if (selectedMonth !== "all" || selectedYear !== "all") {
          filteredPayments = rawPayments.filter((p: any) => {
            if (!p.date) return false;
            const d = new Date(p.date);
            const matchesMonth = selectedMonth === "all" || d.getMonth().toString() === selectedMonth;
            const matchesYear = selectedYear === "all" || d.getFullYear().toString() === selectedYear;
            return matchesMonth && matchesYear;
          });
        }
        
        data = filteredPayments.map((p: any) => ({
          ID: p.id,
          Amount: p.amount,
          Status: p.status,
          Method: p.method,
          Date: p.date,
          TenantName: p.tenantName,
          RoomNumber: p.roomNumber,
          BuildingName: p.buildingName
        }));
        
        const suffix = (selectedMonth !== "all" || selectedYear !== "all") 
          ? `_${selectedMonth !== "all" ? MONTHS.find(m => m.value === selectedMonth)?.label : "All"}_${selectedYear !== "all" ? selectedYear : "All"}`
          : "";
        
        filename = `Payments_Export${suffix}`;
      }

      if (data && data.length > 0) {
        downloadExcel(data, filename);
        toast.success(`Exported ${data.length} ${type} successfully`);
      } else {
        toast.error(`No ${type} found for the selected criteria`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export data");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <h2 className="text-lg font-semibold">Export Data</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground mb-2">Select the data you would like to export to Excel.</p>
          
          <button
            onClick={() => handleExport("buildings")}
            disabled={exporting !== null}
            className="flex items-center gap-4 rounded-2xl border border-border/50 bg-secondary/20 p-4 transition-colors hover:bg-secondary/50 disabled:opacity-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Buildings</p>
              <p className="text-xs text-muted-foreground">Export all property details</p>
            </div>
            {exporting === "buildings" ? <span className="text-xs font-medium text-blue-500">Exporting...</span> : <Download className="h-4 w-4 text-muted-foreground" />}
          </button>

          <button
            onClick={() => handleExport("rooms")}
            disabled={exporting !== null}
            className="flex items-center gap-4 rounded-2xl border border-border/50 bg-secondary/20 p-4 transition-colors hover:bg-secondary/50 disabled:opacity-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
              <Home className="h-5 w-5 text-violet-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Rooms</p>
              <p className="text-xs text-muted-foreground">Export all room configurations</p>
            </div>
            {exporting === "rooms" ? <span className="text-xs font-medium text-violet-500">Exporting...</span> : <Download className="h-4 w-4 text-muted-foreground" />}
          </button>

          <button
            onClick={() => handleExport("tenants")}
            disabled={exporting !== null}
            className="flex items-center gap-4 rounded-2xl border border-border/50 bg-secondary/20 p-4 transition-colors hover:bg-secondary/50 disabled:opacity-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
              <Users className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Tenants</p>
              <p className="text-xs text-muted-foreground">Export active and past tenants</p>
            </div>
            {exporting === "tenants" ? <span className="text-xs font-medium text-cyan-500">Exporting...</span> : <Download className="h-4 w-4 text-muted-foreground" />}
          </button>

          <div className="flex flex-col rounded-2xl border border-border/50 bg-secondary/20 transition-colors hover:bg-secondary/30">
            <button
              onClick={() => handleExport("payments")}
              disabled={exporting !== null}
              className="flex items-center gap-4 p-4 disabled:opacity-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <ReceiptIndianRupee className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Payments</p>
                <p className="text-xs text-muted-foreground">Export full payment history</p>
              </div>
              {exporting === "payments" ? <span className="text-xs font-medium text-emerald-500">Exporting...</span> : <Download className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div className="px-4 pb-4 pt-1 flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-28 h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y === "all" ? "All Years" : y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
