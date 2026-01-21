export interface CertificateTemplate {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  wasResized?: boolean;
  originalWidth?: number;
  originalHeight?: number;
  wasUpscaled?: boolean;
}
