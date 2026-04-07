import { loadWeightRows } from "@/lib/weight-data";
import { WeightPageClient } from "@/components/weight/weight-page-client";

export const dynamic = "force-dynamic";

export default async function WeightPage() {
  const rows = await loadWeightRows();
  return <WeightPageClient initialRows={rows} />;
}
