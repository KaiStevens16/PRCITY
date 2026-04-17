/**
 * PDF text extraction for DEXA uploads using `unpdf` (serverless-safe PDF.js build).
 * Avoids `pdf-parse` / raw `pdfjs-dist` on Node, where `DOMMatrix` is often missing (e.g. Vercel).
 */

import { extractText } from "unpdf";

export function isPdfBuffer(buf: Buffer): boolean {
  if (buf.length < 5) return false;
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

export async function extractDexaPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return text;
}
