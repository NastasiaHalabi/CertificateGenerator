import { useCallback, useState } from "react";
import type { CertificateTemplate } from "../types/template.types";
import { loadTemplateFile } from "../utils/templateLoader";

interface TemplateUploaderProps {
  template: CertificateTemplate | null;
  onUpload: (template: CertificateTemplate | null) => void;
}

/**
 * Handles certificate template upload and validation.
 */
export function TemplateUploader({ template, onUpload }: TemplateUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setIsLoading(true);
      setError(null);

      try {
        const nextTemplate = await loadTemplateFile(file);
        onUpload(nextTemplate);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Template upload failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [onUpload],
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Template Upload</h2>
          <p className="text-sm text-slate-500">Upload a JPG or PNG certificate template.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          {isLoading ? "Uploading..." : "Upload Template"}
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            className="hidden"
            onChange={(event) => handleFileUpload(event.target.files?.[0] || null)}
          />
        </label>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            className="ml-3 text-red-700 underline"
            onClick={() => setError(null)}
          >
            Retry
          </button>
        </div>
      )}

      {template && (
        <div className="mt-4 text-sm text-slate-600">
          <p>Dimensions: {template.width} x {template.height}px</p>
          <p className="mt-1">Filename: {template.file.name}</p>
        </div>
      )}
    </section>
  );
}
