import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  ListTree,
  Scale,
} from "lucide-react";

export type AppNavItem = { href: string; label: string; icon: LucideIcon };

export const APP_NAV_LINKS: AppNavItem[] = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: Activity },
  { href: "/history", label: "History", icon: CalendarDays },
  { href: "/lifts", label: "Lifts", icon: Dumbbell },
  { href: "/program", label: "Protocol", icon: ListTree },
  { href: "/weight", label: "Weight", icon: Scale },
];
