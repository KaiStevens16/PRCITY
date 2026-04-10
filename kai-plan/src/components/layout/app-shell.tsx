import Link from "next/link";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="relative flex min-h-12 items-center justify-center border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:hidden">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <MobileNav />
          </div>
          <Link
            href="/"
            className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-lg font-bold tracking-tight text-transparent transition-opacity hover:opacity-90 active:opacity-80"
          >
            PR CITY
          </Link>
        </header>
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
        <footer className="shrink-0 border-t border-border/25 px-4 py-2 sm:px-6 md:px-8">
          <div className="mx-auto flex max-w-6xl justify-center gap-3 text-[10px] leading-none text-muted-foreground/45">
            <Link href="/privacy" className="hover:text-muted-foreground/65">
              Privacy
            </Link>
            <span className="text-muted-foreground/25" aria-hidden>
              ·
            </span>
            <Link href="/terms" className="hover:text-muted-foreground/65">
              Terms
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
