import { useCallback, useState } from "react";
import type { PDFGenerationOptions } from "../types/pdf.types";
import type { CertificateTemplate } from "../types/template.types";
import type { TextVariable } from "../types/variable.types";
import type { ExcelData } from "../types/excel.types";
import type { VariableMapping } from "../types/mapping.types";
import { applyMappings } from "../utils/mapping";

interface GenerateResult {
  individual?: { filename: string; data: string }[];
  merged?: { filename: string; data: string };
  emailReport?: { filename: string; data: string };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Call backend PDF generation endpoint and expose loading state.
 */
export function usePDFGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      template: CertificateTemplate,
      variables: TextVariable[],
      excelData: ExcelData,
      mappings: VariableMapping[],
      options: PDFGenerationOptions,
    ): Promise<GenerateResult> => {
      setIsGenerating(true);
      setProgress(0);
      setError(null);

      try {
        const mappedRows = applyMappings(variables, excelData, mappings, {
          emailColumn: options.emailColumn,
          filenameColumn: options.filenameColumn,
        });
        const payload = {
          templateDataUrl: template.previewUrl,
          templateWidth: template.width,
          templateHeight: template.height,
          variables,
          rows: mappedRows,
          options,
        };

        const apiBase = API_BASE_URL || window.location.origin;
        const response = await fetch(`${apiBase}/api/pdf/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("PDF generation failed.");
        }

        const data = (await response.json()) as GenerateResult;
        setProgress(100);
        return data;
      } catch (err) {
        console.error(err);
        setError("PDF generation failed. Please try again.");
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return { generate, isGenerating, progress, error };
}
