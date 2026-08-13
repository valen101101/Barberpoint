import { Scissors } from "lucide-react";
import { ProfilePicker } from "@/features/barbers/components/profile-picker";
import { listBarberProfiles } from "@/features/barbers/queries";

// La lista de barberos cambia con el tiempo (altas por SQL) — nunca se
// prerenderiza en build, se lee fresca en cada visita.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profiles = await listBarberProfiles();

  return (
    <div className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_85%),transparent)]"
      />

      <div className="relative flex w-full min-w-0 flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
            <Scissors className="size-5 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Barberpoint
          </h1>
          <p className="text-sm text-muted-foreground">¿Quién sos?</p>
        </div>

        <ProfilePicker profiles={profiles} />
      </div>
    </div>
  );
}
