import { redirect } from "next/navigation";
import { Scissors, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileTabBar, SidebarNav } from "@/components/app-nav";
import { signOut } from "@/app/login/actions";
import { getCurrentBarber } from "@/features/barbers/queries";
import { canResetPasswords } from "@/features/barbers/permissions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const barber = await getCurrentBarber();

  if (!barber) {
    redirect("/login");
  }
  if (!barber.active) {
    redirect("/cuenta-inactiva");
  }

  const firstName = barber.full_name.split(" ")[0];

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:flex md:h-screen">
        <div className="flex flex-col gap-1 px-5 py-5">
          <div className="flex items-center gap-2">
            <Scissors className="size-5 text-sidebar-primary" />
            <span className="font-heading text-lg font-semibold tracking-tight text-sidebar-foreground">
              Barberpoint
            </span>
          </div>
          <p className="truncate text-xs text-sidebar-foreground/60">
            Hola, {firstName}!
          </p>
        </div>
        <div className="flex-1 px-3">
          <SidebarNav canManageUsers={canResetPasswords(barber)} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <LogOut className="size-4.5" />
              Salir
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3.5 md:hidden">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Scissors className="size-5 text-sidebar-primary" />
              <span className="font-heading text-lg font-semibold tracking-tight text-sidebar-foreground">
                Barberpoint
              </span>
            </div>
            <p className="truncate text-xs text-sidebar-foreground/60">
              Hola, {firstName}!
            </p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Salir"
              className="text-sidebar-foreground/70"
            >
              <LogOut className="size-4.5" />
            </Button>
          </form>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>

        <MobileTabBar canManageUsers={canResetPasswords(barber)} />
      </div>
    </div>
  );
}
