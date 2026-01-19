import { PDFDocument, PDFFont, StandardFonts, degrees, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import path from "path";
import { GenerationRequest, TextVariable } from "../types";

function dataUrlToBuffer(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

function normalizeFontFamily(family: string): "helvetica" | "times" | "courier" | "public-sans" {
  const lower = family.toLowerCase();
  if (lower.includes("public sans")) {
    return "public-sans";
  }
  if (lower.includes("times")) {
    return "times";
  }
  if (lower.includes("courier")) {
    return "courier";
  }
  return "helvetica";
}

const publicSansCache: {
  regular?: Uint8Array;
  bold?: Uint8Array;
  extraBold?: Uint8Array;
} = {};

async function loadPublicSansFonts() {
  if (publicSansCache.regular && publicSansCache.bold && publicSansCache.extraBold) {
    return publicSansCache;
  }
  const basePath = path.join(process.cwd(), "assets", "fonts");
  try {
    const [regular, bold, extraBold] = await Promise.all([
      readFile(path.join(basePath, "PublicSans-Regular.ttf")),
      readFile(path.join(basePath, "PublicSans-Bold.ttf")),
      readFile(path.join(basePath, "PublicSans-ExtraBold.ttf")),
    ]);
    publicSansCache.regular = new Uint8Array(regular);
    publicSansCache.bold = new Uint8Array(bold);
    publicSansCache.extraBold = new Uint8Array(extraBold);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load Public Sans fonts:", error);
  }
  return publicSansCache;
}

function resolveWeightLabel(weight: string) {
  if (weight === "bold") return "bold";
  const numeric = Number(weight);
  if (!Number.isNaN(numeric)) {
    if (numeric >= 800) return "extraBold";
    if (numeric >= 700) return "bold";
  }
  return "regular";
}

async function resolveFont(
  pdf: PDFDocument,
  variable: TextVariable,
  fontCache: Map<string, PDFFont>,
): Promise<PDFFont> {
  const family = normalizeFontFamily(variable.fontFamily);
  const isBold = variable.fontWeight === "bold" || Number(variable.fontWeight) >= 600;
  const isItalic = variable.fontStyle === "italic";

  if (family === "public-sans") {
    const fonts = await loadPublicSansFonts();
    const weight = resolveWeightLabel(variable.fontWeight);
    const key = `public-sans-${weight}`;
    const cached = fontCache.get(key);
    if (cached) return cached;
    const fontBytes = weight === "extraBold" ? fonts.extraBold : weight === "bold" ? fonts.bold : fonts.regular;
    if (fontBytes) {
      const embedded = await pdf.embedFont(fontBytes);
      fontCache.set(key, embedded);
      return embedded;
    }
  }

  if (family === "times") {
    const key = isBold && isItalic ? StandardFonts.TimesRomanBoldItalic : isBold ? StandardFonts.TimesRomanBold : isItalic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman;
    if (fontCache.has(key)) return fontCache.get(key)!;
    const embedded = await pdf.embedFont(key);
    fontCache.set(key, embedded);
    return embedded;
  }

  if (family === "courier") {
    const key = isBold && isItalic ? StandardFonts.CourierBoldOblique : isBold ? StandardFonts.CourierBold : isItalic ? StandardFonts.CourierOblique : StandardFonts.Courier;
    if (fontCache.has(key)) return fontCache.get(key)!;
    const embedded = await pdf.embedFont(key);
    fontCache.set(key, embedded);
    return embedded;
  }

  const key = isBold && isItalic ? StandardFonts.HelveticaBoldOblique : isBold ? StandardFonts.HelveticaBold : isItalic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica;
  if (fontCache.has(key)) return fontCache.get(key)!;
  const embedded = await pdf.embedFont(key);
  fontCache.set(key, embedded);
  return embedded;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((ch) => ch + ch)
        .join("")
    : normalized.padEnd(6, "0");
  const num = Number.parseInt(value, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function getAlignedX(
  variable: TextVariable,
  textWidth: number,
  templateWidth: number,
): number {
  if (variable.textAlign === "center") {
    return variable.x - textWidth / 2;
  }
  if (variable.textAlign === "right") {
    return variable.x - textWidth;
  }
  return Math.min(variable.x, templateWidth);
}

function pxToPt(value: number): number {
  // PDF uses points; convert from CSS px (96dpi) to points (72dpi).
  return value * 0.75;
}

/**
 * Generate a single PDF buffer for a row of data.
 */
export async function generatePdfBuffer(
  templateDataUrl: string,
  templateWidth: number,
  templateHeight: number,
  variables: TextVariable[],
  row: Record<string, string>,
  quality: GenerationRequest["options"]["quality"],
  pageIndex: number,
  includeIndex: boolean,
): Promise<Uint8Array> {
  void quality;
  // PDF generation steps: create page, draw template image, then draw text variables.
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontCache = new Map<string, PDFFont>();
  const page = pdf.addPage([templateWidth, templateHeight]);
  const imageBytes = dataUrlToBuffer(templateDataUrl);
  const isPng = templateDataUrl.startsWith("data:image/png");
  const image = isPng ? await pdf.embedPng(imageBytes) : await pdf.embedJpg(imageBytes);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: templateWidth,
    height: templateHeight,
    opacity: 1,
  });

  for (const variable of variables) {
    const value = row[variable.name] || variable.text;
    const font = await resolveFont(pdf, variable, fontCache);
    const fontSize = pxToPt(variable.fontSize);
    const lines = String(value).split("\n");
    const lineHeight = (variable.lineHeight || 1.2) * fontSize;
    const color = hexToRgb(variable.color);

    lines.forEach((line, index) => {
      const textWidth = font.widthOfTextAtSize(line, fontSize);
      const x = getAlignedX(variable, textWidth, templateWidth);
      const yFromTop = variable.y + index * lineHeight;
      const y = templateHeight - yFromTop - fontSize;
      page.drawText(line, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        rotate: degrees(variable.rotation),
      });
    });
  }

  if (includeIndex) {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText(String(pageIndex + 1), {
      x: templateWidth - 24,
      y: 16,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return pdf.save();
}
