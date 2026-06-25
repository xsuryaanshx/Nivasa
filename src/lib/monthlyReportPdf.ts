import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function downloadMonthlyReportPdf(data: any, ownerName: string = "Nivasa Landlord") {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const period = `${now.toLocaleString('default', { month: 'long' })} 1st, ${now.getFullYear()} – ${now.toLocaleString('default', { month: 'long' })} ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}, ${now.getFullYear()}`;
  const generatedOn = now.toLocaleString();

  // Color Palette
  const primaryColor = [15, 23, 42]; // Slate 900
  const grayColor = [100, 116, 139]; // Slate 500

  // 1. Header
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Monthly Property Ledger", 14, 20);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`Owner: ${ownerName}`, 14, 28);
  doc.text(`Statement Period: ${period}`, 14, 34);
  doc.text(`Generated On: ${generatedOn}`, 14, 40);

  // 2. Financial Summary (The TL;DR)
  const formatInr = (val: number) => `Rs ${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 182, 24, 2, 2, "FD");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  const totalCollected = data.recent.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
  const totalExpected = data.stats.monthlyRevenue || 0;
  const totalPending = Math.max(0, totalExpected - totalCollected);
  const netProfit = data.profitStats.netProfit || 0;
  const totalExpenses = totalCollected - netProfit;

  doc.text("Total Expected", 20, 54);
  doc.text("Total Collected", 55, 54);
  doc.text("Pending Dues", 95, 54);
  doc.text("Total Expenses", 135, 54);
  doc.text("Net Profit", 175, 54);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  
  doc.text(formatInr(totalExpected), 20, 62);
  doc.text(formatInr(totalCollected), 55, 62);
  doc.text(formatInr(totalPending), 95, 62);
  doc.text(formatInr(totalExpenses), 135, 62);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(16, 185, 129); // Emerald 500 for Profit
  doc.text(formatInr(netProfit), 175, 62);

  // 3. Building Summary
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Occupancy Summary by Building", 14, 82);

  const buildings = Array.from(new Set(data.rooms.map((r: any) => r.buildingName || "Unknown")));
  const summaryBody = buildings.map((bName) => {
    const bRooms = data.rooms.filter((r: any) => (r.buildingName || "Unknown") === bName);
    const occupied = bRooms.filter((r: any) => r.status === "occupied").length;
    const vacant = bRooms.filter((r: any) => r.status === "vacant" || r.status === "maintenance").length;
    return [bName, occupied.toString(), vacant.toString(), bRooms.length.toString()];
  });

  autoTable(doc, {
    startY: 86,
    head: [["Building Name", "Occupied Rooms", "Vacant Rooms", "Total Rooms"]],
    body: summaryBody,
    theme: "plain",
    headStyles: { fillColor: [241, 245, 249], textColor: primaryColor as any },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  // 4. Room-by-Room Breakdown (Grouped by Building)
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Room Breakdown", 14, finalY);

  const roomBody: any[] = [];
  
  buildings.forEach((bName) => {
    // Add a sub-header row for the Building
    roomBody.push([{ content: `Building: ${bName}`, colSpan: 6, styles: { fillColor: [226, 232, 240], fontStyle: "bold", textColor: [15, 23, 42] } }]);
    
    const bRooms = data.rooms.filter((r: any) => (r.buildingName || "Unknown") === bName);
    
    // Sort rooms by number
    bRooms.sort((a: any, b: any) => String(a.number).localeCompare(String(b.number)));

    bRooms.forEach((r: any) => {
      const roomPayments = data.recent.filter((p: any) => p.unit_id === r.id || p.roomId === r.id);
      const isOccupied = r.status === "occupied";
      const hasRecentPayment = roomPayments.length > 0;
      
      // Do not list vacant rooms unless they had a payment this month
      if (!isOccupied && !hasRecentPayment) return;

      let tenantName = "-";
      let statusNote = "";
      
      if (r.tenants && r.tenants.length > 0) {
        tenantName = r.tenants.map((t: any) => t.name).join(", ");
      } else if (hasRecentPayment && r.pastTenants && r.pastTenants.length > 0) {
        // Find the past tenant who paid
        const paidPastTenantId = roomPayments[0].tenant_id || roomPayments[0].tenantId;
        const pt = r.pastTenants.find((t: any) => t.id === paidPastTenantId);
        if (pt) {
          tenantName = pt.name;
        } else {
          tenantName = r.pastTenants[0].name; // fallback to last past tenant
        }
        statusNote = " (Moved Out)";
      } else {
        tenantName = "Unknown";
      }

      let pStatus = "Pending";
      let pDate = "-";
      
      if (hasRecentPayment) {
        pStatus = roomPayments[0].status || "Paid";
        const dateStr = roomPayments[0].date || roomPayments[0].paid_date;
        pDate = dateStr ? new Date(dateStr).toLocaleDateString() : "-";
      }

      roomBody.push([
        r.number,
        tenantName + statusNote,
        formatInr(r.rent || 0),
        pStatus.charAt(0).toUpperCase() + pStatus.slice(1),
        pDate,
        "-" // Arrears not tracked per-room in this data
      ]);
    });
  });

  autoTable(doc, {
    startY: finalY + 4,
    head: [["Room", "Tenant Name", "Rent", "Status", "Paid On", "Arrears"]],
    body: roomBody,
    theme: "striped",
    headStyles: { fillColor: primaryColor as any, textColor: 255 },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  // 5. Signature Footer
  const sigY = (doc as any).lastAutoTable.finalY + 30;
  const pageHeight = doc.internal.pageSize.height;
  
  if (sigY < pageHeight - 40) {
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Signature: ___________________________", 14, sigY);
  }

  // 6. Universal Watermark (Nivasa by Ami Group.)
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // Gray 400
    doc.text("Generated by Nivasa by Ami Group.", 105, pageHeight - 10, { align: "center" });
  }

  doc.save(`Monthly_Report_${now.toLocaleString('default', { month: 'short' })}_${now.getFullYear()}.pdf`);
}
