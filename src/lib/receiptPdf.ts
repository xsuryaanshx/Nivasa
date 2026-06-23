import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  // 1. Logo & Header
  try {
    const img = await loadImage("/nivasa-logo-light-v2.png");
    doc.addImage(img, "PNG", 14, 15, 36, 12);
  } catch (err) {
    console.warn("Failed to load logo in PDF, falling back to text:", err);
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(14, 15, 6, 12, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("NIVASA", 24, 24);
  }

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Premium Property Management", 14, 30);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("RENT RECEIPT", 140, 24);

  // Divider Line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  // 2. Metadata Columns (Receipt Info & Tenant Info)
  doc.setFontSize(9);
  
  // Left: Receipt Info
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("RECEIPT DETAILS", 14, 44);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Receipt No:", 14, 50);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`REC-${p.id.slice(0, 8).toUpperCase()}`, 35, 50);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Date:", 14, 56);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(new Date(p.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), 35, 56);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Landlord:", 14, 62);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(landlordName || "Property Owner", 35, 62);

  // Right: Tenant Info
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TENANT DETAILS", 110, 44);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Name:", 110, 50);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(p.tenantName, 130, 50);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Building:", 110, 56);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(p.buildingName || "N/A", 130, 56);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Room No:", 110, 62);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(p.roomNumber || "N/A", 130, 62);

  // 3. Payment Breakdown Table
  const formatInr = (val: number) => `Rs ${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  autoTable(doc, {
    startY: 72,
    head: [["Item Description", "Payment Method", "Reference", "Total Amount"]],
    body: [
      [
        `Rent Payment for Room ${p.roomNumber || "N/A"}${p.note ? ` (${p.note})` : ""}`,
        p.method,
        p.reference || "N/A",
        formatInr(p.amount)
      ]
    ],
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      fontSize: 10,
      fontStyle: "bold",
      halign: "left"
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      3: { halign: "right", fontStyle: "bold" }
    }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 12;

  // 4. Summary Box & Signature
  doc.setFillColor(lightGrayBg[0], lightGrayBg[1], lightGrayBg[2]);
  doc.rect(14, nextY, 90, 24, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TOTAL PAID", 18, nextY + 8);

  doc.setFontSize(16);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(formatInr(p.amount), 18, nextY + 18);

  // Signature Block
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.line(140, nextY + 14, 196, nextY + 14); // Signature line
  doc.text("Authorized Signatory", 148, nextY + 19);

  // 5. Footer Notes
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("This is a computer-generated receipt and does not require a physical signature.", 14, 275);
  doc.text("Thank you for your rent payment!", 14, 280);

  // Save the PDF
  const safeTenantName = p.tenantName.replace(/\s+/g, "_");
  const receiptFilename = `Receipt_${safeTenantName}_${p.date.split("T")[0]}.pdf`;
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

  // 1. Logo & Header
  try {
    const img = await loadImage("/nivasa-logo-light-v2.png");
    doc.addImage(img, "PNG", 14, 15, 36, 12);
  } catch (err) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("NIVASA", 14, 24);
  }

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("RENT INVOICE", 145, 24);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  // 2. Invoice Details & Tenant Details
  doc.setFontSize(9);
  
  // Left: Invoice Info
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("INVOICE DETAILS", 14, 44);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Billing Month:", 14, 50);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(invoice.month_year, 38, 50);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Date:", 14, 56);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), 38, 56);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Landlord:", 14, 62);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(landlordName, 38, 62);

  // Right: Tenant Info
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("BILL TO (TENANT)", 110, 44);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Name:", 110, 50);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(tenant.name, 130, 50);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Building:", 110, 56);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(room.buildingName || "N/A", 130, 56);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Room No:", 110, 62);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(room.number || "N/A", 130, 62);

  // 3. Detailed Invoice Table (Rent, Electricity, Laundry, Food, Previous Dues)
  const formatInr = (val: number) => `Rs ${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const tableBody: any[] = [];
  // Base Rent
  tableBody.push(["Base Rent", "1", formatInr(invoice.base_rent), formatInr(invoice.base_rent)]);
  // Electricity
  if (invoice.electricity_cost > 0) {
    tableBody.push(["Electricity Charges", "1", formatInr(invoice.electricity_cost), formatInr(invoice.electricity_cost)]);
  }
  // Addons
  if (invoice.add_ons && invoice.add_ons.length > 0) {
    invoice.add_ons.forEach((a: any) => {
      tableBody.push([a.name, "1", formatInr(a.cost), formatInr(a.cost)]);
    });
  }
  // Previous Dues
  if (invoice.previous_dues > 0) {
    tableBody.push(["Previous Outstanding Dues", "1", formatInr(invoice.previous_dues), formatInr(invoice.previous_dues)]);
  }

  autoTable(doc, {
    startY: 72,
    head: [["Item Description", "Qty", "Rate", "Total Amount"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      fontSize: 10,
      fontStyle: "bold",
      halign: "left"
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" }
    }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Summary & UPI Link/QR Code
  doc.setFillColor(lightGrayBg[0], lightGrayBg[1], lightGrayBg[2]);
  doc.rect(14, nextY, 90, 24, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TOTAL DUE", 18, nextY + 8);

  doc.setFontSize(16);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(formatInr(invoice.total_due), 18, nextY + 18);

  // If UPI details are present, draw payment instructions and QR Code
  if (upiId) {
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(landlordName)}&am=${invoice.total_due.toFixed(2)}&tn=${encodeURIComponent(invoice.month_year.replace(/\s+/g, '_'))}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("PAYMENT INSTRUCTIONS", 110, nextY + 4);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text("Scan the QR code below or tap", 110, nextY + 10);
    doc.text("the link inside WhatsApp to pay.", 110, nextY + 14);

    try {
      const qrImg = await loadImage(qrUrl);
      doc.addImage(qrImg, "PNG", 110, nextY + 18, 30, 30);
    } catch (err) {
      console.warn("Failed to load QR code inside PDF invoice:", err);
    }
  }

  // Signature Block
  const finalY = upiId ? nextY + 52 : nextY + 28;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.line(14, finalY + 10, 70, finalY + 10); // Signature line
  doc.text("Issuer / Landlord Signature", 14, finalY + 15);

  // 5. Footer Notes
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("This is an official rent invoice generated by Nivasa.", 14, 275);
  doc.text("Please complete the payment to avoid late fees.", 14, 280);

  // Save the PDF
  const safeTenantName = tenant.name.replace(/\s+/g, "_");
  const invoiceFilename = `Invoice_${safeTenantName}_${invoice.month_year.replace(/\s+/g, "_")}.pdf`;
  doc.save(invoiceFilename);
}
