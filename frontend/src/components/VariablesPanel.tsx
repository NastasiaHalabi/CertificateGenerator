import { useMemo, useState } from "react";
import type { TextVariable } from "../types/variable.types";

interface VariablesPanelProps {
  variables: TextVariable[];
  selectedVariableId: string | null;
  onSelect: (id: string | null) => void;
  onAddVariable: (name: string) => void;
  onQuickAdd: (name: string) => void;
  onDeleteVariable: (id: string) => void;
  onDuplicateVariable: (id: string) => void;
}

const DEFAULT_VARIABLES = ["name", "date", "course", "instructor"];

/**
 * Panel for managing available and placed variables.
 */
export function VariablesPanel({
  variables,
  selectedVariableId,
  onSelect,
  onAddVariable,
  onQuickAdd,
  onDeleteVariable,
  onDuplicateVariable,
}: VariablesPanelProps) {
  const [customName, setCustomName] = useState("");

  const availableVariables = useMemo(() => {
    const existing = new Set(variables.map((variable) => variable.name.toLowerCase()));
    return DEFAULT_VARIABLES.filter((name) => !existing.has(name.toLowerCase()));
  }, [variables]);

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    onAddVariable(customName.trim());
    setCustomName("");
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Variables</h2>
      <p className="text-sm text-slate-500">Drag variables onto the canvas or click to add.</p>

      <div className="mt-4 space-y-2">
        {availableVariables.map((name) => (
          <button
            key={name}
            type="button"
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/variable-name", name)}
            onClick={() => onQuickAdd(name)}
            className="flex w-full cursor-grab items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span>{name}</span>
            <span className="text-xs text-slate-400">Click to add</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium text-slate-500">Add custom variable</label>
        <div className="mt-2 flex gap-2">
          <input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="e.g., student_id"
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-700">Placed variables</h3>
        <div className="mt-2 space-y-2">
          {variables.length === 0 && (
            <p className="text-xs text-slate-500">No variables placed yet.</p>
          )}
          {variables.map((variable) => (
            <button
              key={variable.id}
              type="button"
              onClick={() => onSelect(variable.id)}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm ${
                selectedVariableId === variable.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{variable.name}</span>
              <span className="text-xs opacity-70">{variable.text}</span>
            </button>
          ))}
        </div>

        {selectedVariableId && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onDuplicateVariable(selectedVariableId)}
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onDeleteVariable(selectedVariableId)}
              className="flex-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
