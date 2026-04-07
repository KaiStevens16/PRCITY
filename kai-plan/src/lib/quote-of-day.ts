import quotesJson from "../../data/quotes.json";

export type QuoteEntry = {
  quote: string;
  author: string;
  source: string;
};

const quotes = quotesJson as QuoteEntry[];

/** FNV-1a-ish 32-bit mix → stable non-negative index for a date string (YYYY-MM-DD). */
function indexForDateKey(dateKey: string): number {
  if (!quotes.length) return 0;
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % quotes.length;
}

export function quoteOfDay(dateKey: string): QuoteEntry {
  if (!quotes.length) {
    return {
      quote: "Show up. Stack the reps.",
      author: "PR CITY",
      source: "Default",
    };
  }
  return quotes[indexForDateKey(dateKey)]!;
}
