import nodemailer from "nodemailer";

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  attachment: { filename: string; content: Uint8Array | Buffer };
}

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_SERVER;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port: Number(port),
    user,
    pass,
    from,
  };
}

export function isEmailConfigured(): boolean {
  return Boolean(getEmailConfig());
}

/**
 * Send an email with a PDF attachment using SMTP.
 */
export async function sendCertificateEmail(payload: EmailPayload) {
  const config = getEmailConfig();
  if (!config) {
    throw new Error("Email is not configured.");
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
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
