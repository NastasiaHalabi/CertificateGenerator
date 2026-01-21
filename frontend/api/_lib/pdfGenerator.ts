import { PDFDocument, PDFFont, StandardFonts, degrees, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import arabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";
import type { GenerationRequest, TextVariable } from "./types.js";

const bidi = bidiFactory();

function dataUrlToBuffer(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

function normalizeFontFamily(
  family: string,
): "helvetica" | "times" | "courier" | "public-sans" {
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

const arabicFontCache: {
  regular?: Uint8Array;
} = {};

async function loadPublicSansFonts() {
  if (publicSansCache.regular && publicSansCache.bold && publicSansCache.extraBold) {
    return publicSansCache;
  }
  try {
    const [regular, bold, extraBold] = await Promise.all([
      readFile(new URL("../assets/fonts/PublicSans-Regular.ttf", import.meta.url)),
      readFile(new URL("../assets/fonts/PublicSans-Bold.ttf", import.meta.url)),
      readFile(new URL("../assets/fonts/PublicSans-ExtraBold.ttf", import.meta.url)),
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

async function loadArabicFont() {
  if (arabicFontCache.regular) return arabicFontCache;
  try {
    const regular = await readFile(
      new URL("../assets/fonts/NotoNaskhArabic-Regular.ttf", import.meta.url),
    );
    arabicFontCache.regular = new Uint8Array(regular);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load Arabic font:", error);
  }
  return arabicFontCache;
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

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function shapeArabicText(text: string): string {
  if (!text) return text;
  return arabicReshaper.convertArabic(text);
}

async function resolveFont(
  pdf: PDFDocument,
  variable: TextVariable,
  fontCache: Map<string, PDFFont>,
  textToRender: string,
): Promise<PDFFont> {
  const family = normalizeFontFamily(variable.fontFamily);
  const isBold = variable.fontWeight === "bold" || Number(variable.fontWeight) >= 600;
  const isItalic = variable.fontStyle === "italic";

  if (containsArabic(textToRender)) {
    const fonts = await loadArabicFont();
    const key = "arabic-regular";
    const cached = fontCache.get(key);
    if (cached) return cached;
    if (!fonts.regular) {
      throw new Error("Arabic font is missing on the server.");
    }
    const embedded = await pdf.embedFont(fonts.regular);
    fontCache.set(key, embedded);
    return embedded;
  }

  if (family === "public-sans") {
    const fonts = await loadPublicSansFonts();
    const weight = resolveWeightLabel(variable.fontWeight);
    const key = `public-sans-${weight}`;
    const cached = fontCache.get(key);
    if (cached) return cached;
    const fontBytes =
      weight === "extraBold" ? fonts.extraBold : weight === "bold" ? fonts.bold : fonts.regular;
    if (fontBytes) {
      const embedded = await pdf.embedFont(fontBytes);
      fontCache.set(key, embedded);
      return embedded;
    }
  }

  if (family === "times") {
    const key =
      isBold && isItalic
        ? StandardFonts.TimesRomanBoldItalic
        : isBold
          ? StandardFonts.TimesRomanBold
          : isItalic
            ? StandardFonts.TimesRomanItalic
            : StandardFonts.TimesRoman;
    if (fontCache.has(key)) return fontCache.get(key)!;
    const embedded = await pdf.embedFont(key);
    fontCache.set(key, embedded);
    return embedded;
  }

  if (family === "courier") {
    const key =
      isBold && isItalic
        ? StandardFonts.CourierBoldOblique
        : isBold
          ? StandardFonts.CourierBold
          : isItalic
            ? StandardFonts.CourierOblique
            : StandardFonts.Courier;
    if (fontCache.has(key)) return fontCache.get(key)!;
    const embedded = await pdf.embedFont(key);
    fontCache.set(key, embedded);
    return embedded;
  }

  const key =
    isBold && isItalic
      ? StandardFonts.HelveticaBoldOblique
      : isBold
        ? StandardFonts.HelveticaBold
        : isItalic
          ? StandardFonts.HelveticaOblique
          : StandardFonts.Helvetica;
  if (fontCache.has(key)) return fontCache.get(key)!;
  const embedded = await pdf.embedFont(key);
  fontCache.set(key, embedded);
  return embedded;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
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

function getAlignedX(variable: TextVariable, textWidth: number, templateWidth: number): number {
  if (variable.textAlign === "center") {
    return variable.x - textWidth / 2;
  }
  if (variable.textAlign === "right") {
    return variable.x - textWidth;
  }
  return Math.min(variable.x, templateWidth);
}

function wrapTextToWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  isArabic: boolean,
): string[] {
  if (!maxWidth || maxWidth <= 0) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const measure = (value: string) => {
    const shaped = isArabic ? shapeArabicText(value) : value;
    return font.widthOfTextAtSize(shaped, fontSize);
  };
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (measure(test) <= maxWidth) {
      current = test;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
    }
    if (measure(word) <= maxWidth) {
      current = word;
      continue;
    }
    let chunk = "";
    for (const char of word) {
      const nextChunk = chunk + char;
      if (measure(nextChunk) <= maxWidth) {
        chunk = nextChunk;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;
  }
  if (current) lines.push(current);
  return lines;
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

  const orderedVariables = [...variables].sort((a, b) => {
    const layerA = a.layer || "front";
    const layerB = b.layer || "front";
    if (layerA === layerB) return 0;
    return layerA === "back" ? -1 : 1;
  });

  for (const variable of orderedVariables) {
    const value = row[variable.name] || variable.text;
    const font = await resolveFont(pdf, variable, fontCache, String(value));
    const fontSize = variable.fontSize;
    const rawLines = String(value).split("\n");
    const lineHeight = (variable.lineHeight || 1.2) * fontSize;
    const color = hexToRgb(variable.color);
    const baselineOffset = fontSize * 0.88;
    let lineIndex = 0;
    rawLines.forEach((line) => {
      const isArabicLine = containsArabic(line);
      const wrappedLines =
        variable.wrapText && variable.wrapWidth
          ? wrapTextToWidth(line, font, fontSize, variable.wrapWidth, isArabicLine)
          : [line];

      wrappedLines.forEach((wrappedLine) => {
        const shapedLine = isArabicLine ? shapeArabicText(wrappedLine) : wrappedLine;
        const textWidth = font.widthOfTextAtSize(shapedLine, fontSize);
        const x = getAlignedX(variable, textWidth, templateWidth);
        const yFromTop = variable.y + lineIndex * lineHeight;
        const lineBaselineOffset = isArabicLine ? baselineOffset * 0.85 : baselineOffset;
        const y = templateHeight - yFromTop - lineBaselineOffset;
        const isBold = variable.fontWeight === "bold" || Number(variable.fontWeight) >= 700;
        const drawText = (offsetX = 0) =>
          page.drawText(shapedLine, {
            x: x + offsetX,
            y,
            size: fontSize,
            font,
            color: rgb(color.r, color.g, color.b),
            rotate: degrees(variable.rotation),
          });

        drawText();
        if (isArabicLine && isBold) {
          drawText(0.6);
        }
        if (isArabicLine && Number(variable.fontWeight) >= 800) {
          drawText(1.1);
        }
        lineIndex += 1;
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
