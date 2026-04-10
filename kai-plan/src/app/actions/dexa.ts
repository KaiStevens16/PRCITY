"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { parseDexaReportText, type ParsedDexaBca } from "@/lib/dexa-parse";
import { randomUUID } from "crypto";

const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = "dexa-scans";

async function extractPdfText(buffer: Buffer): Promise<string> {
  /** Dynamic import so pdfjs-dist never loads on routes that only import other Dexa actions (e.g. weight autosave + RSC). */
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

function readOptionalNum(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export async function previewDexaPdf(formData: FormData): Promise<
  | { error: string }
  | {
      ok: true;
      parsed: ParsedDexaBca | null;
      hint: string | null;
    }
> {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { error: "Choose a PDF file." };
  }
  if (file.type !== "application/pdf") {
    return { error: "File must be a PDF." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "PDF must be 10 MB or smaller." };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    text = await extractPdfText(buf);
  } catch {
    return {
      error: "Could not read that PDF. Try another file or enter values manually.",
    };
  }
  const parsed = parseDexaReportText(text);
  return {
    ok: true,
    parsed,
    hint:
      parsed == null
        ? "Could not find the standard BCA table in this PDF. Enter the date and body fat below."
        : null,
  };
}

export async function saveDexaScan(formData: FormData): Promise<
  { error: string } | { ok: true }
> {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { error: "Missing PDF file. Choose the file again." };
  }
  if (file.type !== "application/pdf") {
    return { error: "File must be a PDF." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "PDF must be 10 MB or smaller." };
  }

  const scanDate = String(formData.get("scanDate") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scanDate)) {
    return { error: "Scan date must be YYYY-MM-DD." };
  }

  const bfRaw = String(formData.get("bodyFatPct") ?? "").trim();
  const bodyFatPct = parseFloat(bfRaw);
  if (!Number.isFinite(bodyFatPct) || bodyFatPct < 0 || bodyFatPct > 100) {
    return { error: "Body fat % must be a number between 0 and 100." };
  }

  const total_mass_lb = readOptionalNum(formData, "totalMassLb");
  const fat_mass_lb = readOptionalNum(formData, "fatMassLb");
  const lean_mass_lb = readOptionalNum(formData, "leanMassLb");
  const bmc_lb = readOptionalNum(formData, "bmcLb");
  const fat_free_lb = readOptionalNum(formData, "fatFreeLb");

  const buf = Buffer.from(await file.arrayBuffer());
  const supabase = createClient();
  const userId = getSoloUserId();
  const id = randomUUID();
  const path = `${userId}/${id}.pdf`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) {
    return { error: upErr.message };
  }

  const { error: insErr } = await supabase.from("dexa_scans").insert({
    id,
    user_id: userId,
    scan_date: scanDate,
    body_fat_pct: bodyFatPct,
    total_mass_lb,
    fat_mass_lb,
    lean_mass_lb,
    bmc_lb,
    fat_free_lb,
    storage_path: path,
    original_filename: file.name.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 200),
  });

  if (insErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: insErr.message };
  }

  revalidatePath("/weight");
  return { ok: true };
}

export async function deleteDexaScan(scanId: string): Promise<
  { error: string } | { ok: true }
> {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: row, error: selErr } = await supabase
    .from("dexa_scans")
    .select("storage_path")
    .eq("id", scanId)
    .eq("user_id", userId)
    .single();

  if (selErr || !row) {
    return { error: "Scan not found." };
  }

  const { error: delErr } = await supabase
    .from("dexa_scans")
    .delete()
    .eq("id", scanId)
    .eq("user_id", userId);

  if (delErr) {
    return { error: delErr.message };
  }

  await supabase.storage.from(BUCKET).remove([row.storage_path]);

  revalidatePath("/weight");
  return { ok: true };
}

export async function getDexaScanPdfUrl(
  storagePath: string
): Promise<{ error: string } | { url: string }> {
  const userId = getSoloUserId();
  const prefix = `${userId}/`;
  if (!storagePath.startsWith(prefix) || storagePath.includes("..")) {
    return { error: "Invalid file." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Could not open PDF." };
  }

  return { url: data.signedUrl };
}
