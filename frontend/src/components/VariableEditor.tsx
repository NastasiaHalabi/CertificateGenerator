import { useEffect, useMemo, useState } from "react";
import type { TextVariable } from "../types/variable.types";

interface VariableEditorProps {
  variable: TextVariable | null;
  templateWidth?: number;
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
export function VariableEditor({ variable, templateWidth, onChange }: VariableEditorProps) {
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
  const measuredWidth = useMemo(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return 0;
    const weight =
      variable.fontWeight === "bold" ? "700" : variable.fontWeight === "normal" ? "400" : variable.fontWeight;
    const style = variable.fontStyle === "italic" ? "italic" : "normal";
    context.font = `${style} ${weight} ${variable.fontSize}px ${variable.fontFamily}`;
    return context.measureText(draftText || variable.text || "").width;
  }, [
    draftText,
    variable.fontFamily,
    variable.fontSize,
    variable.fontStyle,
    variable.fontWeight,
    variable.text,
  ]);
  const isTooWide =
    Boolean(templateWidth && templateWidth > 0) && !variable.wrapText && measuredWidth > (templateWidth || 0);

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

        <div>
          <label className="text-xs font-medium text-slate-500">Layer</label>
          <select
            value={variable.layer}
            onChange={(event) => onChange({ layer: event.target.value as TextVariable["layer"] })}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="front">Front</option>
            <option value="back">Back</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500">Text Wrapping</label>
          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={variable.wrapText}
              onChange={(event) =>
                onChange({
                  wrapText: event.target.checked,
                  wrapWidth: event.target.checked ? variable.wrapWidth || 600 : variable.wrapWidth,
                })
              }
            />
            Wrap text
          </div>
          {variable.wrapText && (
            <input
              type="number"
              min={100}
              value={Math.round(variable.wrapWidth)}
              onChange={(event) => onChange({ wrapWidth: Number(event.target.value) })}
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Wrap width (px)"
            />
          )}
          {isTooWide && (
            <p className="mt-2 text-xs text-amber-600">
              Text is too wide for the template. Enable wrapping or reduce font size.
            </p>
          )}
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

      </div>
    </section>
  );
}
