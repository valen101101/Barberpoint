import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signOut } from "@/app/login/actions";
import { getCurrentBarber } from "@/features/barbers/queries";

export default async function CuentaInactivaPage() {
  const barber = await getCurrentBarber();
  if (barber?.active) {
    redirect("/visitas");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Cuenta desactivada
            </h1>
            <p className="text-sm text-muted-foreground">
              Tu acceso a Barberpoint está desactivado. Hablá con el dueño
              del local si te parece que es un error.
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Salir
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
