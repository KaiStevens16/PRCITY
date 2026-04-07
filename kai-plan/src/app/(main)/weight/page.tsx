import { loadWeightRows } from "@/lib/weight-data";
import { WeightPageClient } from "@/components/weight/weight-page-client";

export const dynamic = "force-dynamic";

export default function WeightPage() {
  const { rows } = loadWeightRows();
  return <WeightPageClient initialRows={rows} />;
}
