import { loadReadingRows } from "@/lib/reading-data";
import { ReadingPageClient } from "@/components/reading/reading-page-client";

export const dynamic = "force-dynamic";

export default async function ReadingPage() {
  const rows = await loadReadingRows();
  return <ReadingPageClient initialRows={rows} />;
}
