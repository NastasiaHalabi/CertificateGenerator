import type { TextVariable } from "../types/variable.types";

interface SelectedVariablesBarProps {
  variables: TextVariable[];
  selectedVariableId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Shows placed variables as quick-select chips above the properties panel.
 */
export function SelectedVariablesBar({
  variables,
  selectedVariableId,
  onSelect,
}: SelectedVariablesBarProps) {
  if (variables.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500 shadow-sm">
        No variables placed yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">Selected Variables</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {variables.map((variable) => {
          const isActive = variable.id === selectedVariableId;
          return (
            <button
              key={variable.id}
              type="button"
              onClick={() => onSelect(variable.id)}
              className={`rounded-md border px-3 py-1 text-xs ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {variable.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
