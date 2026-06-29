import * as XLSX from "xlsx";
import { nivasaApi } from "./api";

export function downloadExcel(data: any[], filename: string, title?: string) {
  if (!data || !data.length) return;

  const displayTitle = title || filename.replace(".xlsx", "").replace(/_/g, " ");

  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert JSON data to worksheet starting at row 4 (A4)
  const ws = XLSX.utils.json_to_sheet(data, { origin: "A4" });

  // Add Nivasa branding and metadata at the top
  XLSX.utils.sheet_add_aoa(ws, [
    [`NIVASA - ${displayTitle.toUpperCase()}`],
    [`Generated on: ${new Date().toLocaleDateString()} | System: Nivasa`]
  ], { origin: "A1" });

  // Merge the header columns (A1-G1 and A2-G2)
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push(
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
  );

  // Auto-fit column widths to prevent text cut-off
  const keys = Object.keys(data[0]);
  const colWidths = keys.map(key => {
    let maxLen = key.length;
    data.forEach(row => {
      const val = row[key];
      if (val !== null && val !== undefined) {
        const strVal = String(val);
        if (strVal.length > maxLen) {
          maxLen = strVal.length;
        }
      }
    });
    return { wch: Math.max(maxLen + 3, 10) };
  });
  ws["!cols"] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  
  // Generate and download Excel file
  // Ensure filename ends with .xlsx
  const finalFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  nivasaApi.logFeatureUsage("excel_exports", "download_excel", { filename: finalFilename });
  
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  shareOrPreviewFile(finalFilename, blob);
}

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(blob);
  });
};

export async function shareOrPreviewFile(filename: string, blob: Blob) {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      const base64String = base64Data.split(',')[1];
      
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64String,
        directory: Directory.Cache
      });
      
      await Share.share({
        title: filename,
        url: savedFile.uri,
      });
      return;
    } catch (e) {
      console.error("Capacitor native share failed:", e);
    }
  }

  if (navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return; // Success
      } catch (err) {
        console.log("Share cancelled or failed:", err);
      }
    }
  }

  // Fallback to preview/download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
