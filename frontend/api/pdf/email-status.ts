import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEmailJob } from "../_lib/emailJobs.js";

/**
 * Return email job progress and final report when completed.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const jobId = req.query.jobId;
  if (!jobId || typeof jobId !== "string") {
    return res.status(400).json({ error: "Job id is required." });
  }

  const job = getEmailJob(jobId);
  if (!job) {
    return res.status(404).json({ error: "Email job not found." });
  }

  return res.status(200).json({
    jobId: job.id,
    total: job.total,
    sent: job.sent,
    failed: job.failed,
    skipped: job.skipped,
    done: job.done,
    report: job.done && job.reportBase64
      ? { filename: job.reportFilename, data: job.reportBase64 }
      : undefined,
  });
}
