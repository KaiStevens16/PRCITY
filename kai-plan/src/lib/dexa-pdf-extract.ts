/**
 * PDF text extraction for DEXA uploads. Primary: pdf-parse; fallback: pdfjs getTextContent
 * (some Next/serverless environments fail the bundled pdf-parse path).
 */

export function isPdfBuffer(buf: Buffer): boolean {
  if (buf.length < 5) return false;
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractWithPdfJs(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  try {
    let out = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      for (const item of tc.items) {
        if (item && typeof item === "object" && "str" in item && typeof item.str === "string") {
          out += item.str;
        }
        out += " ";
      }
      out += "\n";
      page.cleanup();
    }
    return out;
  } finally {
    await pdf.destroy().catch(() => {});
  }
}

export async function extractDexaPdfText(buffer: Buffer): Promise<string> {
  try {
    return await extractWithPdfParse(buffer);
  } catch {
    return await extractWithPdfJs(buffer);
  }
}
