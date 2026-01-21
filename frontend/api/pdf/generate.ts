import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PDFDocument } from "pdf-lib";
import { generatePdfDocument } from "../_lib/pdfGenerator.js";
import { isEmailConfigured, sendCertificateEmail } from "../_lib/emailSender.js";
import { createEmailJob, finalizeEmailJob, getEmailJob, updateEmailJobStatus } from "../_lib/emailJobs.js";
import type { GenerationRequest } from "../_lib/types.js";

export const config = {
  runtime: "nodejs",
};

function fillTemplate(template: string, row: Record<string, string>): string {
  const normalized = new Map<string, string>();
  Object.entries(row).forEach(([key, value]) => {
    normalized.set(key.trim().toLowerCase(), value ?? "");
  });
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    const token = String(key).trim().toLowerCase();
    const value = normalized.get(token);
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

function buildEmailStatusCsv(
  rows: Array<{ row: number; email: string; status: string; error: string }>,
) {
  const headers = ["row", "email", "status", "error"];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const line = [
      String(row.row),
      `"${(row.email || "").replace(/"/g, '""')}"`,
      row.status || "",
      `"${(row.error || "").replace(/"/g, '""')}"`,
    ];
    lines.push(line.join(","));
  });
  return lines.join("\n");
}

function parseEmails(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const payload = req.body as GenerationRequest;
    const { templateDataUrl, templateWidth, templateHeight, variables, rows, options } = payload;

    if (!templateDataUrl || !templateWidth || !templateHeight) {
      return res.status(400).json({ error: "Template data is required." });
    }
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "Excel rows are required." });
    }
    if (!variables || variables.length === 0) {
      return res.status(400).json({ error: "At least one variable is required." });
    }
    if (rows.length > 1000) {
      return res.status(400).json({ error: "Maximum 1000 rows per batch." });
    }
    if (!options) {
      return res.status(400).json({ error: "PDF options are required." });
    }

    const individual: { filename: string; data: string }[] = [];
    const emailStatuses: Array<{ row: number; email: string; status: string; error: string }> = [];
    const includeIndividual = options.outputFormat !== "merged";
    const includeMerged = options.outputFormat !== "individual";
    const emailConfigured = isEmailConfigured();
    const shouldSendEmail = Boolean(options.sendEmail && emailConfigured);
    const shouldCreateIndividual = includeIndividual || shouldSendEmail;
    const emailQueue: Array<{
      rowIndex: number;
      recipients: string[];
      filename: string;
      pdfBuffer: Uint8Array;
      rowData: Record<string, string>;
    }> = [];
    let emailJobId: string | null = null;

    const pdfDoc = await generatePdfDocument(
      templateDataUrl,
      templateWidth,
      templateHeight,
      variables,
      rows,
      options.quality,
      options.includeIndex,
    );

    if (shouldCreateIndividual) {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const rawFilename =
          options.attachmentName || row.__filename || row[options.filenameColumn || ""] || "";
        const safeName = String(rawFilename || "")
          .trim()
          .replace(/[\\/:*?"<>|]/g, "")
          .replace(/\s+/g, "_")
          .slice(0, 60);
        const filenameSuffix = safeName || `certificate_${index + 1}`;
        const prefix = options.filename ? `${options.filename}_` : "";
        const filename = `${prefix}${filenameSuffix}.pdf`;

        const singlePdf = await PDFDocument.create();
        const [page] = await singlePdf.copyPages(pdfDoc, [index]);
        singlePdf.addPage(page);
        const pdfBuffer = await singlePdf.save();

        if (includeIndividual) {
          individual.push({
            filename,
            data: Buffer.from(pdfBuffer).toString("base64"),
          });
        }

        if (shouldSendEmail) {
          const rawTo = row.__email || row[options.emailColumn || ""] || "";
          const recipients = parseEmails(rawTo);
          if (recipients.length === 0) {
            emailStatuses.push({
              row: index + 1,
              email: "",
              status: "skipped",
              error: "Missing email",
            });
            continue;
          }

          const invalidEmails = recipients.filter((email) => !isValidEmail(email));
          if (invalidEmails.length > 0) {
            emailStatuses.push({
              row: index + 1,
              email: recipients.join(", "),
              status: "failed",
              error: `Invalid email(s): ${invalidEmails.join(", ")}`,
            });
            continue;
          }

          emailQueue.push({
            rowIndex: index,
            recipients,
            filename,
            pdfBuffer,
            rowData: row,
          });
          emailStatuses.push({
            row: index + 1,
            email: recipients.join(", "),
            status: "queued",
            error: "",
          });
        }
      }
    }

    const response: {
      individual?: { filename: string; data: string }[];
      merged?: { filename: string; data: string };
      emailReport?: { filename: string; data: string };
    } = {};

    if (includeIndividual) {
      response.individual = individual;
    }

    if (includeMerged) {
      const mergedBuffer = await pdfDoc.save();
      const mergedName = options.filename
        ? `${options.filename}_all_certificates.pdf`
        : "all_certificates.pdf";
      response.merged = {
        filename: mergedName,
        data: Buffer.from(mergedBuffer).toString("base64"),
      };
    }

    if (shouldSendEmail) {
      const csv = buildEmailStatusCsv(emailStatuses);
      response.emailReport = {
        filename: `${options.filename}_email_status.csv`,
        data: Buffer.from(csv, "utf8").toString("base64"),
      };
    }

    if (shouldSendEmail) {
      const reportName = options.filename
        ? `${options.filename}_email_status.csv`
        : "email_status.csv";
      const job = createEmailJob(emailStatuses, emailQueue.length, reportName);
      emailJobId = job.id;
      response.emailJobId = emailJobId;
    }

    res.status(200).json(response);

    if (shouldSendEmail && emailQueue.length > 0 && emailJobId) {
      setImmediate(async () => {
        for (const item of emailQueue) {
          const to = item.recipients.join(", ");
          if (!to) continue;
          try {
            await sendCertificateEmail({
              to,
              subject: fillTemplate(
                options.emailSubject || "Your certificate",
                item.rowData,
              ),
              body: fillTemplate(
                options.emailBody || "Please find your certificate attached.",
                item.rowData,
              ),
              cc: options.emailCc,
              bcc: options.emailBcc,
              attachment: { filename: item.filename, content: item.pdfBuffer },
            });
            updateEmailJobStatus(emailJobId, item.rowIndex + 1, "sent", "");
          } catch (err) {
            updateEmailJobStatus(
              emailJobId,
              item.rowIndex + 1,
              "failed",
              err instanceof Error ? err.message : "Unknown error",
            );
            // eslint-disable-next-line no-console
            console.error(
              `Email failed for row ${item.rowIndex + 1}:`,
              err instanceof Error ? err.message : err,
            );
          }
        }
        const job = getEmailJob(emailJobId);
        if (job) {
          const finalCsv = buildEmailStatusCsv(job.statuses);
          finalizeEmailJob(emailJobId, Buffer.from(finalCsv, "utf8").toString("base64"));
        }
      });
    }

    return;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("PDF generation failed:", error);
    return res.status(500).json({
      error: "PDF generation failed.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
