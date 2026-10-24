import "server-only";

// Los perfiles se dan de alta manualmente y no pueden renombrarse desde la app.
// Se admite el apellido y la tilde de Valentín en los nombres existentes.
export function canResetPasswords(
  barber: { full_name: string; active: boolean } | null,
): boolean {
  if (!barber?.active) return false;
  const firstName = barber.full_name.trim().split(/\s+/)[0]
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return firstName === "mirko" || firstName === "valentin";
}
