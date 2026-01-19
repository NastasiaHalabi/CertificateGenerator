export type FontWeight =
  | "normal"
  | "bold"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

export type FontStyle = "normal" | "italic";
export type TextAlign = "left" | "center" | "right";

export interface TextVariable {
  id: string;
  name: string;
  x: number;
  y: number;
  text: string;
  useSampleText: boolean;
  fontSize: number;
  fontFamily: string;
  fontWeight: FontWeight;
  fontStyle: FontStyle;
  color: string;
  rotation: number;
  textAlign: TextAlign;
  letterSpacing: number;
  lineHeight: number;
  locked: boolean;
}
