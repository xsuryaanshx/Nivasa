import { useQuery } from "@tanstack/react-query";
import { TrendingUp, IndianRupee, Wrench, Building2, Wallet, Users, Download, FileText, Table as TableIcon } from "lucide-react";
import { nivasaApi } from "@/lib/api";
import { useCurrency, formatMoney } from "@/lib/currency";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProfitPage() {
  const { currency } = useCurrency();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["profitStats"],
    queryFn: nivasaApi.getProfitStats,
  });

  const handleExportExcel = () => {
    if (!stats || !stats.buildingProfits) return;

    // Prepare overview data
    const overviewData = [
      ["Metric", "Amount"],
      ["Total Revenue (Paid)", stats.totalRevenue],
      ["Total Maintenance", stats.totalMaintenance],
      ["Total Staff Salaries", stats.totalStaffSalaries],
      ["Total Expenses", stats.totalExpenses],
      ["Net Profit", stats.netProfit],
      [],
    ];

    // Prepare buildings data
    const buildingsData = [
      ["Building Name", "Revenue", "Maintenance", "Staff Salaries", "Total Expenses", "Net Profit", "Vacant Rooms"],
      ...stats.buildingProfits.map((b: any) => [
        b.name,
        b.revenue,
        b.maintenance,
        b.staffSalaries,
        b.expenses,
        b.netProfit,
        b.vacantRooms,
      ]),
    ];

    // Create a new workbook and add sheets
    const wb = XLSX.utils.book_new();
    
    // Overview Sheet
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, wsOverview, "Profit Overview");

    // Buildings Sheet
    const wsBuildings = XLSX.utils.aoa_to_sheet(buildingsData);
    XLSX.utils.book_append_sheet(wb, wsBuildings, "Building Breakdown");

    // Generate Excel file
    XLSX.writeFile(wb, "Nivasa_Profit_Ledger.xlsx");
  };

  const handleExportPDF = () => {
    if (!stats || !stats.buildingProfits) return;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Nivasa Profit & Expenses Ledger", 14, 22);

    doc.setFontSize(12);
    doc.text("Overview", 14, 32);

    const formatInr = (val: number) => `Rs ${val.toLocaleString("en-IN")}`;

    autoTable(doc, {
      startY: 36,
      head: [["Metric", "Amount"]],
      body: [
        ["Total Revenue (Paid)", formatInr(stats.totalRevenue)],
        ["Total Maintenance", formatInr(stats.totalMaintenance)],
        ["Total Staff Salaries", formatInr(stats.totalStaffSalaries)],
        ["Total Expenses", formatInr(stats.totalExpenses)],
        ["Net Profit", formatInr(stats.netProfit)],
      ],
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    });

    const nextY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Profit by Building", 14, nextY);

    autoTable(doc, {
      startY: nextY + 4,
      head: [["Building", "Revenue", "Expenses", "Net Profit", "Vacant"]],
      body: stats.buildingProfits.map((b: any) => [
        b.name,
        formatInr(b.revenue),
        formatInr(b.expenses),
        formatInr(b.netProfit),
        b.vacantRooms.toString(),
      ]),
      theme: "striped",
      headStyles: { fillColor: [39, 174, 96] },
    });

    doc.save("Nivasa_Profit_Ledger.pdf");
  };

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            Profit & Expenses
          </h1>
          <p className="text-muted-foreground mt-1">Detailed breakdown of your financial performance</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none">
              <Download className="h-4 w-4" />
              Export Ledger
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer gap-2 py-2">
              <FileText className="h-4 w-4 text-rose-500" />
              <span>Export as PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer gap-2 py-2">
              <TableIcon className="h-4 w-4 text-emerald-600" />
              <span>Export as Excel</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Revenue Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="h-6 w-6" />
              <h3 className="font-semibold">Total Revenue (Paid)</h3>
            </div>
            <div className="mt-4 text-4xl font-bold tracking-tight text-foreground">
              {formatMoney(stats?.totalRevenue || 0, currency, { decimals: 0 })}
            </div>
          </div>

          {/* Expenses Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <Wrench className="h-6 w-6" />
              <h3 className="font-semibold">Total Expenses</h3>
            </div>
            <div className="mt-4 text-4xl font-bold tracking-tight text-foreground">
              {formatMoney(stats?.totalExpenses || 0, currency, { decimals: 0 })}
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Wrench className="h-4 w-4" /> Maintenance</span>
                <span className="font-medium text-foreground">{formatMoney(stats?.totalMaintenance || 0, currency, { decimals: 0 })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" /> Staff Salaries</span>
                <span className="font-medium text-foreground">{formatMoney(stats?.totalStaffSalaries || 0, currency, { decimals: 0 })}</span>
              </div>
            </div>
          </div>

          {/* Net Profit Card */}
          <div className="rounded-2xl border-2 border-brand bg-brand/5 p-6 shadow-sm flex flex-col justify-center">
            <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Net Profit
            </div>
            <div className="mt-2 text-5xl font-extrabold tracking-tight text-brand">
              {formatMoney(stats?.netProfit || 0, currency, { decimals: 0 })}
            </div>
          </div>

          {/* Building-wise Breakdown */}
          <div className="md:col-span-3 mt-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-3 mb-6">
              <Building2 className="h-6 w-6 text-brand" />
              Profit by Building
            </h2>
            
            {stats?.buildingProfits && stats.buildingProfits.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {stats.buildingProfits.map((b: any) => (
                  <div key={b.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-brand/50 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-foreground">{b.name}</h3>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary/50 rounded-full text-xs font-medium text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {b.vacantRooms} Vacant Rooms
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Revenue</span>
                        <span className="text-emerald-500 font-bold text-base">{formatMoney(b.revenue || 0, currency, { decimals: 0 })}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Expenses</span>
                        <span className="text-rose-500 font-bold text-base">{formatMoney(b.expenses || 0, currency, { decimals: 0 })}</span>
                      </div>
                      
                      <div className="h-px bg-border my-2" />
                      
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-foreground uppercase tracking-wider text-sm">Net Profit</span>
                        <span className={`text-xl font-black ${b.netProfit >= 0 ? "text-brand" : "text-rose-500"}`}>
                          {formatMoney(b.netProfit || 0, currency, { decimals: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-2xl bg-secondary/20">
                <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-foreground">No building data available</p>
                <p className="text-muted-foreground">Add buildings and record payments to see profit breakdowns.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
