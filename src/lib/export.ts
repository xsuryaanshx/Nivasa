import * as XLSX from "xlsx";

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
  XLSX.writeFile(wb, finalFilename);
}
