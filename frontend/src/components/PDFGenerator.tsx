import { useMemo, useState } from "react";
import JSZip from "jszip";
import type { CertificateTemplate } from "../types/template.types";
import type { TextVariable } from "../types/variable.types";
import type { ExcelData } from "../types/excel.types";
import type { VariableMapping } from "../types/mapping.types";
import { usePDFGenerator } from "../hooks/usePDFGenerator";
import { validateMappings } from "../utils/mapping";
import type { PDFGenerationOptions } from "../types/pdf.types";

interface PDFGeneratorProps {
  template: CertificateTemplate | null;
  variables: TextVariable[];
  excelData: ExcelData | null;
  mappings: VariableMapping[];
  sendEmail: boolean;
  emailSubject: string;
  emailBody: string;
  emailCc: string;
  emailBcc: string;
  emailColumn: string;
  filenameColumn: string;
  attachmentName: string;
}

/**
 * Generate and download PDF certificates from mapped data.
 */
export function PDFGenerator({
  template,
  variables,
  excelData,
  mappings,
  sendEmail,
  emailSubject,
  emailBody,
  emailCc,
  emailBcc,
  emailColumn,
  filenameColumn,
  attachmentName,
}: PDFGeneratorProps) {
  const { generate, isGenerating, progress, error } = usePDFGenerator();
  const [filename, setFilename] = useState("");
  const [quality, setQuality] = useState<PDFGenerationOptions["quality"]>("high");
  const [outputFormat, setOutputFormat] = useState<PDFGenerationOptions["outputFormat"]>("merged");
  const [includeIndex, setIncludeIndex] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);

  const unmapped = useMemo(() => validateMappings(variables, mappings), [variables, mappings]);
  const availableHeaders = excelData?.headers ?? [];
  const defaultEmailColumn = useMemo(
    () => availableHeaders.find((header) => /email/i.test(header)) || "",
    [availableHeaders],
  );
  const defaultNameColumn = useMemo(
    () => availableHeaders.find((header) => /name/i.test(header)) || "",
    [availableHeaders],
  );

  const exceedsLimit = Boolean(excelData && excelData.rowCount > 1000);
  const canGenerate =
    template &&
    variables.length > 0 &&
    excelData &&
    !exceedsLimit &&
    unmapped.length === 0 &&
    (!sendEmail || Boolean(emailColumn || defaultEmailColumn));

  const downloadFile = (filenameValue: string, data: string) => {
    const byteCharacters = atob(data);
    const byteNumbers = Array.from(byteCharacters).map((char) => char.charCodeAt(0));
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameValue;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = (filenameValue: string, data: string) => {
    const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameValue;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    if (!template || !excelData) return;
    setDownloadMessage(null);
    setEmailStatusMessage(null);

    try {
      const result = await generate(template, variables, excelData, mappings, {
        filename: filename.trim(),
        outputFormat,
        quality,
        includeIndex,
        sendEmail,
        emailSubject,
        emailBody,
        emailCc,
        emailBcc,
        emailColumn: emailColumn || defaultEmailColumn,
        filenameColumn: attachmentName ? "" : filenameColumn || defaultNameColumn,
        attachmentName,
      });

      if (result.individual) {
        const zip = new JSZip();
        result.individual.forEach((file) => {
          const bytes = Uint8Array.from(atob(file.data), (char) => char.charCodeAt(0));
          zip.file(file.filename, bytes);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = zipUrl;
        const zipName = filename.trim()
          ? `${filename.trim()}_certificates.zip`
          : "certificates.zip";
        link.download = zipName;
        link.click();
        URL.revokeObjectURL(zipUrl);
      }
      if (result.merged) {
        downloadFile(result.merged.filename, result.merged.data);
      }
      if (result.emailReport) {
        downloadCsv(result.emailReport.filename, result.emailReport.data);
      }
      setDownloadMessage("PDFs downloaded successfully.");

      if (sendEmail) {
        setIsSendingEmails(true);
        setEmailStatusMessage("Please wait until all emails are sent.");
        try {
          const response = await fetch("/api/pdf/send-emails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              templateDataUrl: template.previewUrl,
              templateWidth: template.width,
              templateHeight: template.height,
              variables,
              rows: excelData.rows,
              options: {
                filename: filename.trim(),
                outputFormat,
                quality,
                includeIndex,
                sendEmail,
                emailSubject,
                emailBody,
                emailCc,
                emailBcc,
                emailColumn: emailColumn || defaultEmailColumn,
                filenameColumn: attachmentName ? "" : filenameColumn || defaultNameColumn,
                attachmentName,
              },
            }),
          });

          if (!response.ok) {
            const body = (await response.json()) as { error?: string };
            throw new Error(body.error || "Email sending failed.");
          }

          const emailResult = (await response.json()) as {
            emailReport?: { filename: string; data: string };
          };

          if (emailResult.emailReport) {
            downloadCsv(emailResult.emailReport.filename, emailResult.emailReport.data);
          }
          setEmailStatusMessage("All emails sent. Status report downloaded.");
        } catch (err) {
          console.error(err);
          setEmailStatusMessage(
            err instanceof Error ? err.message : "Failed to send emails.",
          );
        } finally {
          setIsSendingEmails(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {isSendingEmails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-5 text-sm text-slate-700 shadow-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <div>Please wait until all emails are sent.</div>
          </div>
        </div>
      )}
      <h2 className="text-lg font-semibold text-slate-900">Generate Certificates</h2>

      {exceedsLimit && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Maximum 1000 certificates per batch. Reduce your Excel rows to continue.
        </div>
      )}
      {!canGenerate && !exceedsLimit && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Upload a template, place variables, import Excel data, and map all variables before generating.
          {sendEmail && !emailColumn && !defaultEmailColumn
            ? " Select an email column to send emails."
            : ""}
        </div>
      )}

      <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-500">Base filename (optional)</label>
          <input
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            placeholder="e.g., certificates"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Quality</label>
          <select
            value={quality}
            onChange={(event) => setQuality(event.target.value as PDFGenerationOptions["quality"])}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Output format</label>
          <select
            value={outputFormat}
            onChange={(event) => setOutputFormat(event.target.value as PDFGenerationOptions["outputFormat"])}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          >
            <option value="individual">Individual PDFs</option>
            <option value="merged">Merged PDF</option>
            <option value="both">Both</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={includeIndex}
            onChange={(event) => setIncludeIndex(event.target.checked)}
          />
          Include page numbers
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={isGenerating || isSendingEmails}
          onClick={handleGenerate}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isGenerating ? "Generating..." : isSendingEmails ? "Sending emails..." : "Generate Certificates"}
        </button>
        {isGenerating && (
          <div className="text-xs text-slate-500">Progress: {progress}%</div>
        )}
        {sendEmail && isSendingEmails && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            {emailStatusMessage || "Please wait until all emails are sent."}
          </div>
        )}
        {!isSendingEmails && emailStatusMessage && (
          <div className="text-xs text-amber-600">{emailStatusMessage}</div>
        )}
        {error && <div className="text-xs text-red-600">{error}</div>}
        {downloadMessage && <div className="text-xs text-emerald-600">{downloadMessage}</div>}
      </div>
    </section>
  );
}
