import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentBarber, listBarberProfiles } from "@/features/barbers/queries";
import { canResetPasswords } from "@/features/barbers/permissions";
import { ResetPasswordButton } from "@/features/barbers/components/reset-password-button";

export default async function UsuariosPage() {
  if (!canResetPasswords(await getCurrentBarber())) redirect("/visitas");
  const profiles = await listBarberProfiles();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Usuarios" description="Blanqueá el PIN de un usuario para que pueda crear uno nuevo al ingresar." />
      <div className="divide-y rounded-xl border bg-card">
        {profiles.map((profile) => (
          <div key={profile.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{profile.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {profile.hasPassword ? "PIN configurado" : "Pendiente de crear un PIN"}
              </p>
            </div>
            <ResetPasswordButton profile={profile} />
          </div>
        ))}
      </div>
    </div>
  );
}
