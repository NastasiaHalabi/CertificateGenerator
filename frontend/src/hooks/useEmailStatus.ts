import { useEffect, useRef, useState } from "react";

interface EmailStatusReport {
  filename: string;
  data: string;
}

interface EmailStatusResponse {
  jobId: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  done: boolean;
  report?: EmailStatusReport;
}

/**
 * Poll email status updates until the job completes.
 */
export function useEmailStatus(jobId: string | null, pollIntervalMs = 2000) {
  const [status, setStatus] = useState<EmailStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      setError(null);
      return undefined;
    }

    let isActive = true;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/pdf/email-status?jobId=${encodeURIComponent(jobId)}`);
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error || "Failed to fetch email status.");
        }
        const data = (await response.json()) as EmailStatusResponse;
        if (!isActive) return;
        setStatus(data);
        setError(null);
        if (!data.done) {
          timeoutRef.current = window.setTimeout(pollStatus, pollIntervalMs);
        }
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Failed to fetch email status.");
        timeoutRef.current = window.setTimeout(pollStatus, pollIntervalMs * 2);
      }
    };

    pollStatus();

    return () => {
      isActive = false;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [jobId, pollIntervalMs]);

  return { status, error };
}
