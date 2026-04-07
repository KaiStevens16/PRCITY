import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { ensureProgramState } from "@/lib/ensure-program-state";
import { getSoloUserId } from "@/lib/solo-user";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const userId = getSoloUserId();
  await ensureProgramState(supabase, userId);

  return <AppShell>{children}</AppShell>;
}
