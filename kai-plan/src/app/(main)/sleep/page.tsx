import { loadOuraConnection, loadOuraSleepSeries } from "@/lib/oura-data";
import { getOuraOAuthEnv } from "@/lib/oura-sync";
import { SleepPageClient } from "@/components/sleep/sleep-page-client";

export const dynamic = "force-dynamic";

export default async function SleepPage({
  searchParams,
}: {
  searchParams: Promise<{
    oura_error?: string;
    oura_connected?: string;
    oura_sleep_error?: string;
  }>;
}) {
  const ouraQuery = await searchParams;
  const ouraConfigured = getOuraOAuthEnv() !== null;
  const [conn, rows] = await Promise.all([loadOuraConnection(), loadOuraSleepSeries()]);

  return (
    <SleepPageClient
      initialRows={rows}
      ouraConfigured={ouraConfigured}
      connected={conn != null}
      ouraQuery={ouraQuery}
    />
  );
}
