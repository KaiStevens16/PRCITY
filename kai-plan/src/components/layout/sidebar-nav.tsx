"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV_LINKS } from "@/lib/app-nav";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[13.5rem] shrink-0 flex-col border-r border-border/60 bg-card/50 px-2 py-6 backdrop-blur-sm md:flex">
      <div className="mb-8 px-3">
        <Link href="/" className="block transition-opacity hover:opacity-90">
          <p className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            PR CITY
          </p>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-1">
        {APP_NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-secondary text-foreground shadow-sm ring-1 ring-white/8"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
