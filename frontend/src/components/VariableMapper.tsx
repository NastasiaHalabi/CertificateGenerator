import type { ExcelData } from "../types/excel.types";
import type { VariableMapping } from "../types/mapping.types";
import type { TextVariable } from "../types/variable.types";
import { buildAutoMappings, validateMappings } from "../utils/mapping";

interface VariableMapperProps {
  variables: TextVariable[];
  excelData: ExcelData | null;
  mappings: VariableMapping[];
  onChange: (mappings: VariableMapping[]) => void;
  previewFirstRow: boolean;
  onTogglePreview: (value: boolean) => void;
}

/**
 * Map canvas variables to Excel columns for PDF generation.
 */
export function VariableMapper({
  variables,
  excelData,
  mappings,
  onChange,
  previewFirstRow,
  onTogglePreview,
}: VariableMapperProps) {
  const unmapped = validateMappings(variables, mappings);

  if (!excelData) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Import an Excel file to configure variable mappings.
      </section>
    );
  }

  const handleAutoMap = () => {
    onChange(buildAutoMappings(variables, excelData));
  };

  const handleMappingChange = (variableName: string, excelColumn: string) => {
    const updated = mappings.map((mapping) =>
      mapping.variableName === variableName ? { ...mapping, excelColumn } : mapping,
    );
    onChange(updated);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Excel Column Mapping</h2>
          <p className="text-sm text-slate-500">Match canvas variables to Excel columns.</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600"
          onClick={handleAutoMap}
        >
          Auto-map
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={previewFirstRow}
          onChange={(event) => onTogglePreview(event.target.checked)}
        />
        Preview first row on canvas
      </label>

      {unmapped.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Unmapped variables: {unmapped.join(", ")}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {variables.map((variable) => {
          const mapping = mappings.find((map) => map.variableName === variable.name);
          return (
            <div key={variable.id} className="grid grid-cols-[1fr_2fr] gap-3 text-sm">
              <div className="rounded-md border border-slate-200 px-3 py-2 text-slate-700">
                {variable.name}
              </div>
              <select
                value={mapping?.excelColumn || ""}
                onChange={(event) => handleMappingChange(variable.name, event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2"
              >
                <option value="">Select column</option>
                {excelData.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
