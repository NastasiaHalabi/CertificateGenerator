declare module "arabic-reshaper" {
  interface ArabicReshaper {
    convertArabic(text: string): string;
  }
  const reshaper: ArabicReshaper;
  export default reshaper;
}

declare module "bidi-js" {
  interface EmbeddingLevelsResult {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }
  interface Bidi {
    getEmbeddingLevels(text: string, explicitDirection?: "ltr" | "rtl"): EmbeddingLevelsResult;
    getReorderedString(
      text: string,
      embedLevelsResult: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): string;
  }
  const bidiFactory: () => Bidi;
  export default bidiFactory;
}
