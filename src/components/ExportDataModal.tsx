import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Building2, Home, Users, ReceiptIndianRupee, ChevronDown } from "lucide-react";
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
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  if (!open) return null;

  const handleExport = async (type: "buildings" | "rooms" | "tenants" | "payments") => {
    setExporting(type);
    try {
      let data = [];
      let filename = "";
      
      const filterByDate = (items: any[], dateField: string) => {
        if (selectedMonth === "all" && selectedYear === "all") return items;
        return items.filter((item: any) => {
          if (!item[dateField]) return false;
          const d = new Date(item[dateField]);
          const matchesMonth = selectedMonth === "all" || d.getMonth().toString() === selectedMonth;
          const matchesYear = selectedYear === "all" || d.getFullYear().toString() === selectedYear;
          return matchesMonth && matchesYear;
        });
      };

      const suffix = (selectedMonth !== "all" || selectedYear !== "all") 
        ? `_${selectedMonth !== "all" ? MONTHS.find(m => m.value === selectedMonth)?.label : "All"}_${selectedYear !== "all" ? selectedYear : "All"}`
        : "";

      let exportTitle = "";
      if (type === "buildings") {
        const rawBuildings = await nivasaApi.getBuildings();
        const filtered = filterByDate(rawBuildings, "created_at");
        data = filtered.map((b: any) => ({
          "Building ID": b.id,
          "Name": b.name,
          "Address": b.address || "",
          "Total Rooms": b.rooms || 0,
          "Occupied Rooms": b.occupied || 0,
          "Occupancy Rate": b.occupancyRate !== undefined ? `${b.occupancyRate}%` : "0%",
          "Monthly Revenue": b.monthlyRevenue || 0,
          "Created At": b.created_at ? new Date(b.created_at).toLocaleDateString() : ""
        }));
        filename = `Buildings_Export${suffix}`;
        exportTitle = "Buildings Report";
      } else if (type === "rooms") {
        const rawRooms = await nivasaApi.getRooms();
        const filtered = filterByDate(rawRooms, "createdAt");
        data = filtered.map((r: any) => ({
          "Room ID": r.id,
          "Building Name": r.buildingName,
          "Room Number": r.number,
          "Room Type": r.roomType || "",
          "Rent": r.rent,
          "Capacity": r.capacity,
          "Status": r.status,
          "Current Tenants": (r.tenants || []).map((t: any) => t.name).join(", ") || "None",
          "Tenant Phones": (r.tenants || []).map((t: any) => t.phone).join(", ") || "",
          "Previous Reading": r.prevReading || 0,
          "Current Reading": r.currReading || 0,
          "Created At": r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""
        }));
        filename = `Rooms_Export${suffix}`;
        exportTitle = "Rooms Configuration";
      } else if (type === "tenants") {
        const rawTenants = await nivasaApi.getTenants();
        const filtered = filterByDate(rawTenants, "joined_at");
        data = filtered.map((t: any) => ({
          "Tenant ID": t.id,
          "Name": t.name,
          "Phone": t.phone,
          "WhatsApp": t.whatsapp_number || t.phone || "",
          "Aadhar Number": t.aadhar || "",
          "Status": t.status,
          "Joined At": t.joined_at ? new Date(t.joined_at).toLocaleDateString() : "",
          "Left At": t.leftAt ? new Date(t.leftAt).toLocaleDateString() : "",
          "Deposit Amount": t.depositAmount || 0,
          "Rent Amount": t.rent_amount ?? t.roomRent ?? 0
        }));
        filename = `Tenants_Export${suffix}`;
        exportTitle = "Tenants Directory";
      } else if (type === "payments") {
        const rawPayments = await nivasaApi.getRecentPayments(10000);
        const filtered = filterByDate(rawPayments, "date");
        data = filtered.map((p: any) => ({
          "Payment ID": p.id,
          "Date": p.date ? new Date(p.date).toLocaleDateString() : "",
          "Building Name": p.buildingName,
          "Room Number": p.roomNumber,
          "Tenant Name": p.tenantName,
          "Amount": p.amount,
          "Method": p.method,
          "Status": p.status,
          "Note": p.note || ""
        }));
        filename = `Payments_Export${suffix}`;
        exportTitle = "Payments History";
      }

      if (data && data.length > 0) {
        downloadExcel(data, filename, exportTitle);
        toast.success(`Exported ${data.length} records successfully`);
      } else {
        toast.error(`No records found for the selected criteria`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export data");
    } finally {
      setExporting(null);
    }
  };

  const ExportCard = ({ type, title, desc, icon: Icon, color, bg }: any) => {
    const isExpanded = expandedCard === type;
    
    return (
      <div className={`flex flex-col rounded-2xl border transition-colors ${isExpanded ? 'border-primary/50 bg-secondary/10' : 'border-border/50 bg-secondary/20 hover:bg-secondary/30'}`}>
        <button
          onClick={() => setExpandedCard(isExpanded ? null : type)}
          className="flex items-center gap-4 p-4 w-full text-left"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{desc}</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-border/30 mt-1">
                <div className="flex gap-2 mt-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-28 h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y === "all" ? "All Years" : y}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleExport(type)}
                  disabled={exporting !== null}
                  className="flex items-center justify-center gap-2 h-9 w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {exporting === type ? (
                    <span>Exporting...</span>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download Excel</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold">Export Data</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-3 overflow-y-auto">
          <p className="text-sm text-muted-foreground mb-2">Select the data you would like to export to Excel.</p>
          
          <ExportCard type="buildings" title="Buildings" desc="Export all property details" icon={Building2} color="text-blue-500" bg="bg-blue-500/10" />
          <ExportCard type="rooms" title="Rooms" desc="Export all room configurations" icon={Home} color="text-violet-500" bg="bg-violet-500/10" />
          <ExportCard type="tenants" title="Tenants" desc="Export active and past tenants" icon={Users} color="text-cyan-500" bg="bg-cyan-500/10" />
          <ExportCard type="payments" title="Payments" desc="Export full payment history" icon={ReceiptIndianRupee} color="text-emerald-500" bg="bg-emerald-500/10" />
        </div>
      </motion.div>
    </div>
  );
}
