import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadReceiptPdf(p: any, landlordName: string = "Nivasa Landlord") {
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

  // 1. Header (Brand Name & Document Title)
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(14, 15, 6, 12, "F"); // Brand color accent block

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("NIVASA", 24, 24);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text("Premium Property Management", 24, 29);

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
