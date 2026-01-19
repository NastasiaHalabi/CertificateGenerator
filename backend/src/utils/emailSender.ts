import nodemailer from "nodemailer";

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  attachment: { filename: string; content: Uint8Array | Buffer };
}

function getEnvValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Send an email with a PDF attachment using SMTP.
 */
export async function sendCertificateEmail(payload: EmailPayload) {
  const transporter = nodemailer.createTransport({
    host: getEnvValue("SMTP_SERVER"),
    port: Number(getEnvValue("SMTP_PORT")),
    secure: false,
    auth: {
      user: getEnvValue("SMTP_USER"),
      pass: getEnvValue("SMTP_PASS"),
    },
  });

  const from = getEnvValue("MAIL_FROM");

  await transporter.sendMail({
    from,
    to: payload.to,
    cc: payload.cc ? payload.cc.split(/[;,]/).map((item) => item.trim()).filter(Boolean).join(",") : undefined,
    bcc: payload.bcc ? payload.bcc.split(/[;,]/).map((item) => item.trim()).filter(Boolean).join(",") : undefined,
    subject: payload.subject,
    text: payload.body,
    attachments: [
      {
        filename: payload.attachment.filename,
        content: Buffer.isBuffer(payload.attachment.content)
          ? payload.attachment.content
          : Buffer.from(payload.attachment.content),
        contentType: "application/pdf",
      },
    ],
  });
}
