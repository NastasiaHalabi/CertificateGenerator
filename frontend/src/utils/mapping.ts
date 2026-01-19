import type { ExcelData } from "../types/excel.types";
import type { VariableMapping } from "../types/mapping.types";
import type { TextVariable } from "../types/variable.types";

/**
 * Auto-map variables to Excel headers by case-insensitive name match.
 */
export function buildAutoMappings(
  variables: TextVariable[],
  excelData: ExcelData | null,
): VariableMapping[] {
  if (!excelData) return [];
  return variables.map((variable) => {
    const match = excelData.headers.find(
      (header) => header.toLowerCase() === variable.name.toLowerCase(),
    );
    return {
      variableName: variable.name,
      excelColumn: match || "",
    };
  });
}

/**
 * Apply mappings to Excel rows to generate per-variable data.
 */
export function applyMappings(
  variables: TextVariable[],
  excelData: ExcelData,
  mappings: VariableMapping[],
  extraColumns?: { emailColumn?: string; filenameColumn?: string },
): Record<string, string>[] {
  return excelData.rows.map((row) => {
    const mapped: Record<string, string> = {};
    variables.forEach((variable) => {
      const mapping = mappings.find((map) => map.variableName === variable.name);
      const column = mapping?.excelColumn || "";
      if (variable.useSampleText) {
        mapped[variable.name] = variable.text;
        return;
      }
      mapped[variable.name] = row[column] || mapping?.defaultValue || variable.text;
    });
    if (extraColumns?.emailColumn) {
      mapped.__email = row[extraColumns.emailColumn] || "";
    }
    if (extraColumns?.filenameColumn) {
      mapped.__filename = row[extraColumns.filenameColumn] || "";
    }
    return mapped;
  });
}

/**
 * Return variable names that have no mapped Excel column.
 */
export function validateMappings(
  variables: TextVariable[],
  mappings: VariableMapping[],
): string[] {
  return variables
    .filter(
      (variable) =>
        !mappings.find(
          (mapping) =>
            mapping.variableName === variable.name && mapping.excelColumn,
        ),
    )
    .map((variable) => variable.name);
}
