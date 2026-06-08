"use server";

import { createClient } from "@/lib/supabase/server";
import {
  fetchExerciseNameCatalog,
  filterExerciseNames,
} from "@/lib/exercise-catalog";

let cachedNames: string[] | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

async function getCatalog(): Promise<string[]> {
  const now = Date.now();
  if (cachedNames && now - cacheAt < CACHE_MS) return cachedNames;
  const supabase = createClient();
  cachedNames = await fetchExerciseNameCatalog(supabase);
  cacheAt = now;
  return cachedNames;
}

export async function searchExerciseNames(query: string): Promise<string[]> {
  const catalog = await getCatalog();
  return filterExerciseNames(catalog, query, 24);
}
