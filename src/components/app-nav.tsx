"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, Users, Tag, ChartColumn } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/visitas", label: "Visitas", icon: Scissors },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicios", label: "Servicios", icon: Tag },
  { href: "/analisis", label: "Análisis", icon: ChartColumn },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97]",
              active
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon
              className={cn(
                "size-4.5 transition-transform duration-150",
                active && "scale-110",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-transform duration-150 active:scale-90",
              active
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/60",
            )}
          >
            <item.icon
              className={cn(
                "size-5 transition-transform duration-200",
                active && "scale-110 -translate-y-0.5",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
