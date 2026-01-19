import { useEffect, useState } from "react";
import type { TextVariable } from "../types/variable.types";

interface VariableEditorProps {
  variable: TextVariable | null;
  onChange: (updates: Partial<TextVariable>) => void;
}

const FONT_FAMILIES = [
  "Public Sans",
  "Arial",
  "Times New Roman",
  "Helvetica",
  "Georgia",
  "Courier New",
];

const FONT_WEIGHTS = [
  { value: "400", label: "Regular" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
];

/**
 * Editor panel for updating text variable styling and positioning.
 */
export function VariableEditor({ variable, onChange }: VariableEditorProps) {
  if (!variable) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Select a variable on the canvas to edit its properties.
      </section>
    );
  }

  const normalizedWeight =
    variable.fontWeight === "normal"
      ? "400"
      : variable.fontWeight === "bold"
        ? "700"
        : variable.fontWeight;

  const [draftText, setDraftText] = useState(variable.text);

  useEffect(() => {
    setDraftText(variable.text);
  }, [variable.id, variable.text]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (draftText !== variable.text) {
        onChange({ text: draftText });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [draftText, onChange, variable.text]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Variable Properties</h2>
      <div className="mt-4 grid gap-4 text-sm">
        <div>
          <label className="text-xs font-medium text-slate-500">Sample Text</label>
          <input
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">Font Family</label>
          <select
            value={variable.fontFamily}
            onChange={(event) => onChange({ fontFamily: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          >
            {FONT_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Font Size</label>
            <input
              type="number"
              min={8}
              max={200}
              value={variable.fontSize}
              onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Rotation</label>
            <input
              type="number"
              min={-360}
              max={360}
              value={variable.rotation}
              onChange={(event) => onChange({ rotation: Number(event.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Letter Spacing</label>
            <input
              type="number"
              min={0}
              value={variable.letterSpacing}
              onChange={(event) => onChange({ letterSpacing: Number(event.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Line Height (multiplier)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={variable.lineHeight}
              onChange={(event) => onChange({ lineHeight: Number(event.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Position X</label>
            <input
              type="number"
              value={Math.round(variable.x)}
              onChange={(event) => onChange({ x: Number(event.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Position Y</label>
            <input
              type="number"
              value={Math.round(variable.y)}
              onChange={(event) => onChange({ y: Number(event.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Font Weight</label>
            <select
              value={normalizedWeight}
              onChange={(event) =>
                onChange({ fontWeight: event.target.value as TextVariable["fontWeight"] })
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            >
              {FONT_WEIGHTS.map((weight) => (
                <option key={weight.value} value={weight.value}>
                  {weight.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={variable.fontStyle === "italic"}
              onChange={(event) => onChange({ fontStyle: event.target.checked ? "italic" : "normal" })}
            />
            Italic
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Text Color</label>
            <input
              type="color"
              value={variable.color}
              onChange={(event) => onChange({ color: event.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 p-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Alignment</label>
            <select
              value={variable.textAlign}
              onChange={(event) =>
                onChange({ textAlign: event.target.value as TextVariable["textAlign"] })
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={variable.locked}
            onChange={(event) => onChange({ locked: event.target.checked })}
          />
          Lock position
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={variable.useSampleText}
            onChange={(event) => onChange({ useSampleText: event.target.checked })}
          />
          Use sample text in PDFs
        </label>
      </div>
    </section>
  );
}
