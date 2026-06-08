import { AppShell } from "@/components/layout/app-shell";
import { getCachedProgramState } from "@/lib/cached-queries";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getCachedProgramState();

  return <AppShell>{children}</AppShell>;
}
