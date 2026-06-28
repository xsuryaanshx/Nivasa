import * as XLSX from "xlsx";
import { nivasaApi } from "./api";

export function downloadExcel(data: any[], filename: string) {
  if (!data || !data.length) return;

  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert JSON data to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
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

export async function shareOrPreviewFile(filename: string, blob: Blob) {
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
