import { PDFDocument } from "pdf-lib";

export async function mergePdfBuffers(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const buffer of pdfBuffers) {
    const pdf = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return mergedPdf.save();
}
