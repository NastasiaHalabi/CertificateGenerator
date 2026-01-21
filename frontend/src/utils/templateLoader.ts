import type { CertificateTemplate } from "../types/template.types";

const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;
const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 600;

interface LoadedImage {
  element: HTMLImageElement;
  width: number;
  height: number;
}

/**
 * Load an image element from a data URL.
 */
async function loadImage(dataUrl: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ element: image, width: image.width, height: image.height });
    image.onerror = () => reject(new Error("Template image could not be loaded."));
    image.src = dataUrl;
  });
}

/**
 * Resize an image to the target dimensions using a canvas.
 */
function resizeImageToTarget(
  image: HTMLImageElement,
  mimeType: string,
): { previewUrl: string } {
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to resize template image.");
  }
  context.drawImage(image, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  const outputType = mimeType === "image/png" ? "image/png" : "image/jpeg";
  return {
    previewUrl: canvas.toDataURL(outputType, 0.95),
  };
}

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

  const imageInfo = await loadImage(dataUrl);
  const shouldResize =
    imageInfo.width < TARGET_WIDTH || imageInfo.height < TARGET_HEIGHT;
  const wasUpscaled = shouldResize;
  const resizedPreviewUrl = shouldResize
    ? resizeImageToTarget(imageInfo.element, file.type)
    : { previewUrl: dataUrl };
  const outputWidth = shouldResize ? TARGET_WIDTH : imageInfo.width;
  const outputHeight = shouldResize ? TARGET_HEIGHT : imageInfo.height;

  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: resizedPreviewUrl.previewUrl,
    width: outputWidth,
    height: outputHeight,
    wasResized: shouldResize,
    originalWidth: imageInfo.width,
    originalHeight: imageInfo.height,
    wasUpscaled,
  };
}
