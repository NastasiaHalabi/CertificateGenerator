import { useState } from "react";
import type { ExcelData } from "../types/excel.types";
import { useExcelReader } from "../hooks/useExcelReader";

interface ExcelImporterProps {
  excelData: ExcelData | null;
  onImport: (data: ExcelData | null) => void;
}

const MAX_EXCEL_SIZE = 5 * 1024 * 1024;

/**
 * Excel importer with preview and validation.
 */
export function ExcelImporter({ excelData, onImport }: ExcelImporterProps) {
  const { readExcelFile } = useExcelReader();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExcelUpload = async (file: File | null) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    try {
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ];
      const isValidType =
        validTypes.includes(file.type) ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.name.endsWith(".csv");

      if (!isValidType) {
        throw new Error("Invalid file format. Upload .xlsx, .xls, or .csv.");
      }
      if (file.size > MAX_EXCEL_SIZE) {
        throw new Error("Excel file too large. Maximum size is 5MB.");
      }
      const data = await readExcelFile(file);
      onImport(data);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Excel import failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Excel Import</h2>
          <p className="text-sm text-slate-500">Upload an Excel file to populate variables.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          {isLoading ? "Importing..." : "Upload Excel"}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => handleExcelUpload(event.target.files?.[0] || null)}
          />
        </label>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            className="ml-3 text-red-700 underline"
            onClick={() => setError(null)}
          >
            Retry
          </button>
        </div>
      )}

      {excelData && (
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <div>Rows: {excelData.rowCount} • Columns: {excelData.headers.length}</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Sample columns: {excelData.headers.slice(0, 4).join(", ")}
            {excelData.headers.length > 4 ? "..." : ""}
          </div>
        </div>
      )}
    </section>
  );
}
