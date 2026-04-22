#!/usr/bin/env node
/**
 * One long-format CSV: `record_type` = `daily` | `heart_rate`.
 * Daily rows join sleep + full daily_activity + daily_readiness payloads (flattened, openapi-aligned).
 * Heart rows are discrete samples from oura_heart_rate_samples.
 *
 * Run from repo root with env loaded, e.g.:
 *   set -a && . ./.env.local && set +a && node scripts/export-oura-unified-long-csv.mjs
 *
 * Requires migration 20260419120000_oura_activity_readiness_heartrate.sql applied, then Oura sync.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.KAI_PLAN_USER_ID;

if (!url || !key || !userId) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or KAI_PLAN_USER_ID");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function dayKey(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return /^(\d{4}-\d{2}-\d{2})/.exec(s)?.[1] ?? null;
}

async function fetchAll(fromTable, selectCols, orderCol) {
  const rows = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from(fromTable)
      .select(selectCols)
      .eq("user_id", userId)
      .order(orderCol, { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return rows;
}

/** Flatten nested JSON for CSV (shallow + stringify deeper objects). */
function flattenPayload(prefix, payload, out) {
  if (!payload || typeof payload !== "object") return;
  for (const [k, v] of Object.entries(payload)) {
    if (k === "meta") continue;
    const col = `${prefix}_${k}`;
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      try {
        out[col] = JSON.stringify(v);
      } catch {
        out[col] = "";
      }
    } else {
      out[col] = v;
    }
  }
}

const SLEEP_COLS =
  "day, sleep_score, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, light_sleep_seconds, awake_seconds, time_in_bed_seconds, efficiency, latency_seconds, bedtime_start, bedtime_end, contributors_json, average_hrv, average_heart_rate, lowest_heart_rate, sleep_heart_rate_samples, sleep_hrv_samples, updated_at";

(async () => {
  const [sleepRows, actRows, readinessRows] = await Promise.all([
    fetchAll("oura_daily_sleep", SLEEP_COLS, "day"),
    fetchAll("oura_daily_activity", "day, payload, updated_at", "day"),
    fetchAll("oura_daily_readiness", "day, payload, updated_at", "day"),
  ]);

  const sleepByDay = new Map();
  for (const r of sleepRows) {
    const d = dayKey(r.day);
    if (d) sleepByDay.set(d, r);
  }
  const actByDay = new Map();
  for (const r of actRows) {
    const d = dayKey(r.day);
    if (d) actByDay.set(d, r);
  }
  const readByDay = new Map();
  for (const r of readinessRows) {
    const d = dayKey(r.day);
    if (d) readByDay.set(d, r);
  }

  const allDays = [...new Set([...sleepByDay.keys(), ...actByDay.keys(), ...readByDay.keys()])].sort();

  const dailyObjects = [];
  for (const day of allDays) {
    const s = sleepByDay.get(day) ?? {};
    const a = actByDay.get(day);
    const rd = readByDay.get(day);

    const row = {
      record_type: "daily",
      calendar_day: day,
      sleep_updated_at: s.updated_at ?? "",
      sleep_score: s.sleep_score ?? "",
      sleep_total_sleep_seconds: s.total_sleep_seconds ?? "",
      sleep_deep_sleep_seconds: s.deep_sleep_seconds ?? "",
      sleep_rem_sleep_seconds: s.rem_sleep_seconds ?? "",
      sleep_light_sleep_seconds: s.light_sleep_seconds ?? "",
      sleep_awake_seconds: s.awake_seconds ?? "",
      sleep_time_in_bed_seconds: s.time_in_bed_seconds ?? "",
      sleep_efficiency: s.efficiency ?? "",
      sleep_latency_seconds: s.latency_seconds ?? "",
      sleep_bedtime_start: s.bedtime_start ?? "",
      sleep_bedtime_end: s.bedtime_end ?? "",
      sleep_contributors_json: s.contributors_json ?? "",
      sleep_average_hrv: s.average_hrv ?? "",
      sleep_average_heart_rate: s.average_heart_rate ?? "",
      sleep_lowest_heart_rate: s.lowest_heart_rate ?? "",
      sleep_hr_samples_json: s.sleep_heart_rate_samples ?? "",
      sleep_hrv_samples_json: s.sleep_hrv_samples ?? "",
    };

    if (a?.payload) flattenPayload("activity", a.payload, row);
    if (a?.updated_at) row.activity_row_updated_at = a.updated_at;

    if (rd?.payload) flattenPayload("readiness", rd.payload, row);
    if (rd?.updated_at) row.readiness_row_updated_at = rd.updated_at;

    dailyObjects.push(row);
  }

  const hrRows = await fetchAll(
    "oura_heart_rate_samples",
    "sample_at, bpm, source, updated_at",
    "sample_at"
  );

  const heartObjects = hrRows.map((r) => {
    const ts = r.sample_at;
    const dayUtc = typeof ts === "string" ? ts.slice(0, 10) : "";
    return {
      record_type: "heart_rate",
      calendar_day: dayUtc,
      sample_timestamp_utc: ts ?? "",
      bpm: r.bpm ?? "",
      heart_source: r.source ?? "",
      heart_sample_updated_at: r.updated_at ?? "",
    };
  });

  const keySet = new Set();
  for (const o of dailyObjects) for (const k of Object.keys(o)) keySet.add(k);
  for (const o of heartObjects) for (const k of Object.keys(o)) keySet.add(k);

  const header = [...keySet].sort((a, b) => {
    const pri = (x) => {
      if (x === "record_type") return 0;
      if (x === "calendar_day") return 1;
      if (x === "sample_timestamp_utc") return 2;
      return 10;
    };
    const pa = pri(a);
    const pb = pri(b);
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });

  const lines = [header.join(",")];
  for (const o of dailyObjects) {
    lines.push(header.map((h) => csvEscape(o[h])).join(","));
  }
  for (const o of heartObjects) {
    lines.push(header.map((h) => csvEscape(o[h])).join(","));
  }

  const outPath = path.join(process.cwd(), "oura-unified-export.csv");
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log("Wrote", outPath);
  console.log("daily_rows", dailyObjects.length, "heart_rows", heartObjects.length);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
