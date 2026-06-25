import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { nivasaApi } from "./api";

// Helper function to load local or remote images asynchronously into HTMLImageElement
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

/**
 * Generates and downloads a Rent Receipt PDF for paid payments.
 */
export async function downloadReceiptPdf(p: any, landlordName: string = "Nivasa Landlord") {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Color Palette
  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [59, 130, 246]; // Brand Blue
  const grayColor = [100, 116, 139]; // Slate 500
  const lightGrayBg = [248, 250, 252]; // Slate 50

  // 1. Top Header Banner (Slate 900 background)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 42, "F");

  // Load and draw Nivasa Dark Logo with correct aspect ratio
  try {
    const img = await loadImage("/nivasa-logo-dark-v2.png");
    const logoHeight = 14;
    const logoWidth = (img.naturalWidth / img.naturalHeight) * logoHeight;
    doc.addImage(img, "PNG", 16, 14, logoWidth, logoHeight);
  } catch (err) {
    console.warn("Failed to load logo in PDF:", err);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("NIVASA", 16, 24);
  }

  // Header Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("PAYMENT RECEIPT", 194, 23, { align: "right" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175); // Gray 400
  doc.text("Official proof of rent settlement", 194, 29, { align: "right" });

  // 2. Main Card Container (Centered)
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 50, 182, 210, 4, 4, "FD");

  // A. Total Paid Box (Centered at top of card)
  doc.setFillColor(lightGrayBg[0], lightGrayBg[1], lightGrayBg[2]);
  doc.roundedRect(30, 62, 150, 28, 2, 2, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("TOTAL AMOUNT PAID", 105, 71, { align: "center" });

  const formatInr = (val: number) => `Rs ${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(formatInr(p.amount), 105, 83, { align: "center" });

  // B. Receipt Details Table
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TRANSACTION SUMMARY", 30, 103);

  const tableBody = [
    ["Receipt Number", `REC-${p.id.slice(0, 8).toUpperCase()}`],
    ["Payment Date", new Date(p.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
    ["Landlord / Payee", landlordName],
    ["Tenant Name", p.tenantName],
    ["Building / Room", `${p.buildingName || "N/A"} - Room ${p.roomNumber || "N/A"}`],
    ["Payment Method", p.method],
    ["Transaction Reference", p.reference || "N/A"],
    ["Remarks / Note", p.note || "Rent Payment"]
  ];

  autoTable(doc, {
    startY: 108,
    margin: { left: 30, right: 30 },
    body: tableBody,
    theme: "striped",
    styles: {
      fontSize: 9.5,
      cellPadding: 3.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], width: 55 },
      1: { fontStyle: "bold", halign: "left" }
    }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 15;

  // C. Bottom Signatures & Stamp
  // Stamp on left: PAID green badge
  doc.setFillColor(209, 250, 229); // Green 100
  doc.roundedRect(30, nextY, 32, 14, 1.5, 1.5, "F");
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105); // Green 600
  doc.text("PAID", 46, nextY + 9.5, { align: "center" });

  // Signature line on right
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.5);
  doc.line(125, nextY + 8, 180, nextY + 8);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Authorized Signatory", 152.5, nextY + 13, { align: "center" });

  // 3. Footer
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("This receipt is a digitally generated document by Nivasa. Official proof of rent settlement.", 105, 275, { align: "center" });
  doc.text("Thank you for your prompt rent payment!", 105, 280, { align: "center" });

  // --- Watermark ---
  const pageCountReceipt = doc.getNumberOfPages();
  for (let i = 1; i <= pageCountReceipt; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // Gray 400
    const pageHeight = doc.internal.pageSize.height;
    doc.text("Generated by Nivasa by Ami Group.", 105, pageHeight - 8, { align: "center" });
  }

  const safeTenantName = p.tenantName.replace(/\s+/g, "_");
  const receiptFilename = `Receipt_${safeTenantName}_${p.date.split("T")[0]}.pdf`;
  nivasaApi.logFeatureUsage("pdf_exports", "receipt_export", { tenantName: p.tenantName });
  doc.save(receiptFilename);
}

/**
 * Generates and downloads a detailed Invoice PDF for rent, electricity, laundry, food/mess, etc.
 */
export async function downloadInvoicePdf(invoice: any, tenant: any, room: any, landlordName: string = "Nivasa Landlord", upiId?: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [59, 130, 246]; // Brand Blue
  const grayColor = [100, 116, 139]; // Slate 500
  const lightGrayBg = [248, 250, 252]; // Slate 50

  // 1. Top Header Banner (Slate 900 background)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 42, "F");

  // Load and draw Nivasa Dark Logo with correct aspect ratio
  try {
    const img = await loadImage("/nivasa-logo-dark-v2.png");
    const logoHeight = 14;
    const logoWidth = (img.naturalWidth / img.naturalHeight) * logoHeight;
    doc.addImage(img, "PNG", 16, 14, logoWidth, logoHeight);
  } catch (err) {
    console.warn("Failed to load logo in PDF:", err);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("NIVASA", 16, 24);
  }

  // Header Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("RENT INVOICE", 194, 23, { align: "right" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175); // Gray 400
  doc.text("Detailed breakdown of outstanding charges", 194, 29, { align: "right" });

  // 2. Main Card Container (Centered)
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 50, 182, 210, 4, 4, "FD");

  // A. Total Due Box (Centered at top of card)
  doc.setFillColor(lightGrayBg[0], lightGrayBg[1], lightGrayBg[2]);
  doc.roundedRect(30, 60, 150, 26, 2, 2, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("TOTAL AMOUNT DUE", 105, 68, { align: "center" });

  const formatInr = (val: number) => `Rs ${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(formatInr(invoice.total_due), 105, 79, { align: "center" });

  // B. Invoice Meta Info Table
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("BILLING & TENANT INFO", 30, 96);

  const metaBody = [
    ["Billing Month", invoice.month_year],
    ["Invoice Date", new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
    ["Landlord / Payee", landlordName],
    ["Tenant Name", tenant.name],
    ["Room & Building", `${room.buildingName || "N/A"} - Room ${room.number || "N/A"}`]
  ];

  autoTable(doc, {
    startY: 100,
    margin: { left: 30, right: 30 },
    body: metaBody,
    theme: "striped",
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], width: 45 },
      1: { fontStyle: "bold", halign: "left" }
    }
  });

  // C. Items Breakdown Table
  const tableBody: any[] = [];
  tableBody.push(["Base Rent", "1", formatInr(invoice.base_rent), formatInr(invoice.base_rent)]);
  if (invoice.electricity_cost > 0) {
    tableBody.push(["Electricity Charges", "1", formatInr(invoice.electricity_cost), formatInr(invoice.electricity_cost)]);
  }
  if (invoice.add_ons && invoice.add_ons.length > 0) {
    invoice.add_ons.forEach((a: any) => {
      tableBody.push([a.name, "1", formatInr(a.cost), formatInr(a.cost)]);
    });
  }
  if (invoice.previous_dues > 0) {
    tableBody.push(["Previous Outstanding Dues", "1", formatInr(invoice.previous_dues), formatInr(invoice.previous_dues)]);
  }

  const itemsStartY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("CHARGES BREAKDOWN", 30, itemsStartY);

  autoTable(doc, {
    startY: itemsStartY + 4,
    margin: { left: 30, right: 30 },
    head: [["Item Description", "Qty", "Rate", "Total"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "left"
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      1: { halign: "center", width: 12 },
      2: { halign: "right", width: 28 },
      3: { halign: "right", fontStyle: "bold", width: 28 }
    }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 8;

  // D. QR code / payment area
  if (upiId) {
    const buildingNameSafe = (room.buildingName || "Maduvan").replace(/\s+/g, '_');
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(landlordName)}&am=${invoice.total_due.toFixed(2)}&tn=${encodeURIComponent(`${buildingNameSafe}_${invoice.month_year.replace(/\s+/g, '_')}_Rent_Payment`)}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("SCAN TO PAY INSTANTLY", 30, nextY + 4);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("You can scan this QR code using any UPI app", 30, nextY + 9);
    doc.text("or click the link received inside WhatsApp.", 30, nextY + 13);

    try {
      const qrImg = await loadImage(qrUrl);
      doc.addImage(qrImg, "PNG", 145, nextY, 26, 26);
    } catch (err) {
      console.warn("Failed to load QR code inside PDF invoice:", err);
    }
  }

  // Signature Block
  const finalY = upiId ? nextY + 28 : nextY + 8;
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.5);
  doc.line(30, finalY + 12, 85, finalY + 12);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Issuer / Landlord Signature", 30, finalY + 17);

  // 3. Footer
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("This invoice is an official rent invoice generated by Nivasa. Please pay before the due date.", 105, 275, { align: "center" });
  doc.text("Thank you for your business!", 105, 280, { align: "center" });

  // --- Watermark ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // Gray 400
    const pageHeight = doc.internal.pageSize.height;
    doc.text("Generated by Nivasa by Ami Group.", 105, pageHeight - 8, { align: "center" });
  }

  // Save the PDF
  const safeTenantName = tenant.name.replace(/\s+/g, "_");
  const invoiceFilename = `Invoice_${safeTenantName}_${invoice.month_year.replace(/\s+/g, "_")}.pdf`;
  nivasaApi.logFeatureUsage("pdf_exports", "invoice_export", { tenantName: tenant.name, monthYear: invoice.month_year });
  doc.save(invoiceFilename);
}
