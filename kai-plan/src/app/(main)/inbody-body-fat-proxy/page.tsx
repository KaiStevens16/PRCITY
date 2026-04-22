import { InbodyProxyPageClient } from "@/components/inbody/inbody-proxy-page-client";
import { loadInbodyProxyRows } from "@/lib/inbody-proxy-data";

export const dynamic = "force-dynamic";

export default async function InbodyBodyFatProxyPage() {
  const rows = await loadInbodyProxyRows();
  return <InbodyProxyPageClient initialRows={rows} />;
}
