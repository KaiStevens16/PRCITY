import { loadWeightRows } from "@/lib/weight-data";
import { loadDexaScans } from "@/lib/dexa-data";
import { WeightPageClient } from "@/components/weight/weight-page-client";

export const dynamic = "force-dynamic";

export default async function WeightPage() {
  const [rows, dexaScans] = await Promise.all([loadWeightRows(), loadDexaScans()]);
  return <WeightPageClient initialRows={rows} initialDexaScans={dexaScans} />;
}
