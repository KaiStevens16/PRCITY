import { loadOuraConnection, loadOuraStepsSeries } from "@/lib/oura-data";
import { getOuraOAuthEnv } from "@/lib/oura-sync";
import { StepsPageClient } from "@/components/steps/steps-page-client";

export const dynamic = "force-dynamic";

export default async function StepsPage({
  searchParams,
}: {
  searchParams: Promise<{
    oura_error?: string;
    oura_connected?: string;
    oura_sleep_error?: string;
    oura_readiness_error?: string;
    oura_hr_error?: string;
  }>;
}) {
  const ouraQuery = await searchParams;
  const ouraConfigured = getOuraOAuthEnv() !== null;
  /** Always load DB row so we know if a session exists; env vars are checked separately for OAuth routes. */
  const [conn, rows] = await Promise.all([loadOuraConnection(), loadOuraStepsSeries()]);

  return (
    <StepsPageClient
      initialRows={rows}
      ouraConfigured={ouraConfigured}
      connected={conn != null}
      ouraQuery={ouraQuery}
    />
  );
}
