import { Router } from "express";
import { PDFDocument } from "pdf-lib";
import { generatePdfDocument } from "../utils/pdfGenerator";
import { isEmailConfigured, sendCertificateEmail } from "../utils/emailSender";
import { GenerationRequest } from "../types";

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

const router = Router();

router.post("/generate", async (req, res) => {
  try {
    const payload = req.body as GenerationRequest;
    const {
      templateDataUrl,
      templateWidth,
      templateHeight,
      variables,
      rows,
      options,
    } = payload;

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
    const includeIndividual = options.outputFormat !== "merged";
    const includeMerged = options.outputFormat !== "individual";
    const shouldCreateIndividual = includeIndividual;

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

      }
    }

    const response: {
      individual?: { filename: string; data: string }[];
      merged?: { filename: string; data: string };
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

    return res.json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("PDF generation failed:", error);
    return res.status(500).json({ error: "PDF generation failed." });
  }
});

router.post("/send-emails", async (req, res) => {
  try {
    const payload = req.body as GenerationRequest;
    const {
      templateDataUrl,
      templateWidth,
      templateHeight,
      variables,
      rows,
      options,
    } = payload;

    if (!templateDataUrl || !templateWidth || !templateHeight) {
      return res.status(400).json({ error: "Template data is required." });
    }
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "Excel rows are required." });
    }
    if (!variables || variables.length === 0) {
      return res.status(400).json({ error: "At least one variable is required." });
    }
    if (!options) {
      return res.status(400).json({ error: "Email options are required." });
    }

    const emailConfigured = isEmailConfigured();
    if (!options.sendEmail || !emailConfigured) {
      return res.status(400).json({ error: "Email sending is not configured." });
    }

    const emailStatuses: Array<{ row: number; email: string; status: string; error: string }> = [];
    const pdfDoc = await generatePdfDocument(
      templateDataUrl,
      templateWidth,
      templateHeight,
      variables,
      rows,
      options.quality,
      options.includeIndex,
    );

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

      const singlePdf = await PDFDocument.create();
      const [page] = await singlePdf.copyPages(pdfDoc, [index]);
      singlePdf.addPage(page);
      const pdfBuffer = await singlePdf.save();

      try {
        await sendCertificateEmail({
          to: recipients.join(", "),
          subject: fillTemplate(options.emailSubject || "Your certificate", row),
          body: fillTemplate(options.emailBody || "Please find your certificate attached.", row),
          cc: options.emailCc,
          bcc: options.emailBcc,
          attachment: { filename, content: pdfBuffer },
        });
        emailStatuses.push({
          row: index + 1,
          email: recipients.join(", "),
          status: "sent",
          error: "",
        });
      } catch (err) {
        emailStatuses.push({
          row: index + 1,
          email: recipients.join(", "),
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const csv = buildEmailStatusCsv(emailStatuses);
    const reportName = options.filename
      ? `${options.filename}_email_status.csv`
      : "email_status.csv";
    return res.json({
      emailReport: {
        filename: reportName,
        data: Buffer.from(csv, "utf8").toString("base64"),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Email sending failed:", error);
    return res.status(500).json({ error: "Email sending failed." });
  }
});

export default router;
