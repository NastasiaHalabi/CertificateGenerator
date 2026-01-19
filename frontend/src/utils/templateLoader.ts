import type { CertificateTemplate } from "../types/template.types";

const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

/**
 * Load and validate a certificate template file.
 */
export async function loadTemplateFile(file: File): Promise<CertificateTemplate> {
  const validTypes = ["image/jpeg", "image/png"];
  const isValidType =
    validTypes.includes(file.type) ||
    file.name.endsWith(".jpg") ||
    file.name.endsWith(".jpeg") ||
    file.name.endsWith(".png");

  if (!isValidType) {
    throw new Error("Invalid file format. Upload a JPG or PNG template.");
  }
  if (file.size > MAX_TEMPLATE_SIZE) {
    throw new Error("File too large. Maximum size is 10MB.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read template file."));
    reader.readAsDataURL(file);
  });

  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error("Template image could not be loaded."));
    image.src = dataUrl;
  });

  if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
    throw new Error("Template must be at least 800x600 pixels.");
  }

  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: dataUrl,
    width: dimensions.width,
    height: dimensions.height,
  };
}
