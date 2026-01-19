export interface ExcelData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}
