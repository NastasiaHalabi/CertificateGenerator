import { Router } from "express";
import { generatePdfBuffer } from "../utils/pdfGenerator";
import { mergePdfBuffers } from "../utils/pdfMerger";
import { sendCertificateEmail } from "../utils/emailSender";
import { GenerationRequest } from "../types";

function fillTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = row[String(key).trim()];
    return value !== undefined && value !== null && String(value) !== "" ? String(value) : match;
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

    if (!options?.filename) {
      return res.status(400).json({ error: "PDF options are required." });
    }

    const buffers: Uint8Array[] = [];
    const individual: { filename: string; data: string }[] = [];
    const emailStatuses: Array<{ row: number; email: string; status: string; error: string }> = [];
    const includeIndividual = options.outputFormat !== "merged";
    const includeMerged = options.outputFormat !== "individual";
    const shouldSendEmail = Boolean(options.sendEmail);

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rawFilename = row.__filename || row[options.filenameColumn || ""] || "";
      const safeName = String(rawFilename || "")
        .trim()
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
      const filenameSuffix = safeName || `certificate_${index + 1}`;
      const filename = `${options.filename}_${filenameSuffix}.pdf`;
      const pdfBuffer = await generatePdfBuffer(
        templateDataUrl,
        templateWidth,
        templateHeight,
        variables,
        row,
        options.quality,
        index,
        options.includeIndex,
      );
      buffers.push(pdfBuffer);

      if (includeIndividual) {
        individual.push({
          filename,
          data: Buffer.from(pdfBuffer).toString("base64"),
        });
      }

      if (shouldSendEmail) {
        const to = row.__email || row[options.emailColumn || ""] || "";
        if (to) {
          try {
            await sendCertificateEmail({
              to,
              subject: fillTemplate(options.emailSubject || "Your certificate", row),
              body: fillTemplate(options.emailBody || "Please find your certificate attached.", row),
              cc: options.emailCc,
              bcc: options.emailBcc,
              attachment: { filename, content: pdfBuffer },
            });
            emailStatuses.push({ row: index + 1, email: to, status: "sent", error: "" });
          } catch (err) {
            emailStatuses.push({
              row: index + 1,
              email: to,
              status: "failed",
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }
        } else {
          emailStatuses.push({ row: index + 1, email: "", status: "skipped", error: "Missing email" });
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
      const mergedBuffer = await mergePdfBuffers(buffers);
      response.merged = {
        filename: `${options.filename}_all_certificates.pdf`,
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

    return res.json(response);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("PDF generation failed:", error);
    return res.status(500).json({ error: "PDF generation failed." });
  }
});

export default router;
