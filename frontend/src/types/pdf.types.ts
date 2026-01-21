export type OutputFormat = "individual" | "merged" | "both";
export type PdfQuality = "low" | "medium" | "high";

export interface PDFGenerationOptions {
  outputFormat: OutputFormat;
  filename: string;
  quality: PdfQuality;
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
