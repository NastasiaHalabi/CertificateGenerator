import type { TextVariable } from "../types/variable.types";

/**
 * Create a new text variable with default styling.
 */
export function createTextVariable(name: string, x: number, y: number): TextVariable {
  return {
    id: crypto.randomUUID(),
    name,
    x,
    y,
    text: name,
    useSampleText: false,
    fontSize: 36,
    fontFamily: "Arial",
    fontWeight: "400",
    fontStyle: "normal",
    color: "#111827",
    rotation: 0,
    textAlign: "left",
    letterSpacing: 0,
    lineHeight: 1.2,
    locked: false,
  };
}
