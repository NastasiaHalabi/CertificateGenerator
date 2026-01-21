import { randomUUID } from "crypto";

export type EmailStatusEntry = {
  row: number;
  email: string;
  status: "queued" | "sent" | "failed" | "skipped";
  error: string;
};

export type EmailJob = {
  id: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  done: boolean;
  statuses: EmailStatusEntry[];
  reportFilename: string;
  reportBase64?: string;
  createdAt: number;
};

const EMAIL_JOB_TTL_MS = 30 * 60 * 1000;
const emailJobs = new Map<string, EmailJob>();

/**
 * Create a new email job and store it in memory.
 */
export function createEmailJob(statuses: EmailStatusEntry[], total: number, reportFilename: string) {
  const jobId = randomUUID();
  const skipped = statuses.filter((entry) => entry.status === "skipped").length;
  const job: EmailJob = {
    id: jobId,
    total,
    sent: 0,
    failed: 0,
    skipped,
    done: total === 0,
    statuses,
    reportFilename,
    createdAt: Date.now(),
  };
  emailJobs.set(jobId, job);

  if (job.done) {
    setTimeout(() => emailJobs.delete(jobId), EMAIL_JOB_TTL_MS);
  }

  return job;
}

/**
 * Get a stored email job by id.
 */
export function getEmailJob(jobId: string) {
  return emailJobs.get(jobId);
}

/**
 * Update job progress after sending an email.
 */
export function updateEmailJobStatus(
  jobId: string,
  row: number,
  status: "sent" | "failed",
  error: string,
) {
  const job = emailJobs.get(jobId);
  if (!job) return;
  const entry = job.statuses.find((item) => item.row === row);
  if (entry) {
    entry.status = status;
    entry.error = error;
  }
  if (status === "sent") {
    job.sent += 1;
  } else {
    job.failed += 1;
  }
}

/**
 * Finalize a job with a completed report.
 */
export function finalizeEmailJob(jobId: string, reportBase64: string) {
  const job = emailJobs.get(jobId);
  if (!job) return;
  job.done = true;
  job.reportBase64 = reportBase64;
  setTimeout(() => emailJobs.delete(jobId), EMAIL_JOB_TTL_MS);
}
