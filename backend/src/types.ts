export interface TextVariable {
  id: string;
  name: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  rotation: number;
  textAlign: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  layer?: "front" | "back";
  wrapText?: boolean;
  wrapWidth?: number;
}

export interface PDFGenerationOptions {
  outputFormat: "individual" | "merged" | "both";
  filename: string;
  quality: "low" | "medium" | "high";
  includeIndex: boolean;
  sendEmail?: boolean;
  emailSubject?: string;
  emailBody?: string;
  emailCc?: string;
  emailBcc?: string;
  emailColumn?: string;
  filenameColumn?: string;
  attachmentName?: string;
}

export interface GenerationRequest {
  templateDataUrl: string;
  templateWidth: number;
  templateHeight: number;
  variables: TextVariable[];
  rows: Record<string, string>[];
  options: PDFGenerationOptions;
}
