import { useCallback } from "react";
import * as XLSX from "xlsx";
import type { ExcelData } from "../types/excel.types";

/**
 * Provide an Excel reader utility with validation and parsing.
 */
export function useExcelReader() {
  const readExcelFile = useCallback(async (file: File): Promise<ExcelData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as string[][];

          const headers = (jsonData[0] || []).map((header) => String(header).trim());
          if (headers.length === 0 || headers.some((header) => !header)) {
            throw new Error("Excel file must include a header row.");
          }

          const uniqueHeaders = new Set(headers.map((header) => header.toLowerCase()));
          if (uniqueHeaders.size !== headers.length) {
            throw new Error("Excel column names must be unique.");
          }

          const rows = (jsonData.slice(1) || []).filter((row) => row.some((cell) => String(cell).trim() !== ""));
          if (rows.length === 0) {
            throw new Error("Excel file must include at least one data row.");
          }

          const dataRows = rows.map((row) => {
            const record: Record<string, string> = {};
            headers.forEach((header, idx) => {
              record[header] = row[idx] ? String(row[idx]) : "";
            });
            return record;
          });

          resolve({ headers, rows: dataRows, rowCount: dataRows.length });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Could not read Excel file."));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  return { readExcelFile };
}
