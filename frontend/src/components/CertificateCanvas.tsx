import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { CertificateTemplate } from "../types/template.types";
import type { TextVariable } from "../types/variable.types";
import { useCanvas } from "../hooks/useCanvas";
import { loadTemplateFile } from "../utils/templateLoader";

interface CertificateCanvasProps {
  template: CertificateTemplate | null;
  variables: TextVariable[];
  selectedVariableId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<TextVariable>) => void;
  onPlaceVariable: (name: string, x: number, y: number) => void;
  previewTextMap: Record<string, string> | null;
  zoom: number;
  onTemplateUpload: (template: CertificateTemplate) => void;
}

/**
 * Fabric canvas wrapper that supports drag-and-drop placement.
 */
export function CertificateCanvas({
  template,
  variables,
  selectedVariableId,
  onSelect,
  onUpdate,
  onPlaceVariable,
  previewTextMap,
  zoom,
  onTemplateUpload,
}: CertificateCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragActive, setIsDragActive] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const scale = useMemo(() => {
    if (!template || !containerSize.width || !containerSize.height) return 1;
    const widthScale = containerSize.width / template.width;
    const heightScale = containerSize.height / template.height;
    return Math.min(widthScale, heightScale) * zoom;
  }, [template, containerSize, zoom]);

  const { canvasElementRef } = useCanvas({
    template,
    variables,
    selectedVariableId,
    onSelect,
    onUpdate,
    scale,
    previewTextMap,
  });

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      if (!template) {
        const file = event.dataTransfer.files?.[0];
        if (!file) return;
        setIsUploading(true);
        setTemplateError(null);
        loadTemplateFile(file)
          .then(onTemplateUpload)
          .catch((err) => setTemplateError(err instanceof Error ? err.message : "Upload failed."))
          .finally(() => setIsUploading(false));
        return;
      }
      const variableName = event.dataTransfer.getData("text/variable-name");
      if (!variableName) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const canvasElement = canvasElementRef.current;
      const scaleX = canvasElement ? canvasElement.width / rect.width : 1;
      const scaleY = canvasElement ? canvasElement.height / rect.height : 1;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      onPlaceVariable(variableName, x, y);
    },
    [onPlaceVariable, template, onTemplateUpload],
  );

  const handleTemplateSelect = async (file: File | null) => {
    if (!file) return;
    setIsUploading(true);
    setTemplateError(null);
    try {
      const nextTemplate = await loadTemplateFile(file);
      onTemplateUpload(nextTemplate);
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePanStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isSpacePressed || zoom <= 1 || !containerRef.current) return;
    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: containerRef.current.scrollLeft,
      top: containerRef.current.scrollTop,
    };
  };

  const handlePanMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !containerRef.current) return;
    const deltaX = event.clientX - panStartRef.current.x;
    const deltaY = event.clientY - panStartRef.current.y;
    containerRef.current.scrollLeft = panStartRef.current.left - deltaX;
    containerRef.current.scrollTop = panStartRef.current.top - deltaY;
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative h-[560px] overflow-auto rounded-lg border border-dashed p-3 ${
        isDragActive ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-slate-50"
      }`}
      onMouseDown={handlePanStart}
      onMouseMove={handlePanMove}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragEnter={() => setIsDragActive(true)}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      style={{
        cursor:
          zoom > 1 && isSpacePressed ? (isPanning ? "grabbing" : "grab") : "default",
      }}
    >
      {template ? (
        <div
          className={`flex min-h-full min-w-full ${
            zoom > 1 ? "items-start justify-start" : "items-center justify-center"
          }`}
        >
          <canvas ref={canvasElementRef} className="block shrink-0" />
        </div>
      ) : (
        <div className="flex w-full flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-slate-500">Upload or drag and drop a template to start editing.</p>
          <label className="inline-flex cursor-pointer items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            {isUploading ? "Uploading..." : "Upload Template"}
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => handleTemplateSelect(event.target.files?.[0] || null)}
            />
          </label>
          {templateError && <p className="text-xs text-red-600">{templateError}</p>}
        </div>
      )}
      {template && variables.length === 0 && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-white/80 px-3 py-1 text-xs text-slate-500 shadow-sm">
          Drop variables here
        </div>
      )}
    </div>
  );
}
