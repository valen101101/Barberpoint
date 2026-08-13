"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createSessionCookie, destroySessionCookie } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";

const authenticateSchema = z.object({
  barberId: z.uuid(),
  password: z.string().regex(/^\d{4}$/, "El PIN tiene que ser de 4 dígitos"),
});

export type AuthenticateResult =
  | { success: true }
  | { success: false; error: string };

// No hace redirect() a propósito: el ProfilePicker necesita el resultado
// para poder mostrar la animación de bienvenida antes de navegar.
export async function authenticate(
  barberId: string,
  password: string,
): Promise<AuthenticateResult> {
  const parsed = authenticateSchema.safeParse({ barberId, password });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: barber, error } = await supabase
    .from("barbers")
    .select("id, password_hash, active")
    .eq("id", parsed.data.barberId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!barber || !barber.active) {
    return { success: false, error: "Ese perfil ya no está disponible" };
  }

  if (barber.password_hash === null) {
    // Primer login: la contraseña que mandó pasa a ser la definitiva.
    const hash = await hashPassword(parsed.data.password);
    const { error: updateError } = await supabase
      .from("barbers")
      .update({ password_hash: hash })
      .eq("id", barber.id);

    if (updateError) return { success: false, error: updateError.message };
  } else {
    const valid = await verifyPassword(parsed.data.password, barber.password_hash);
    if (!valid) {
      return { success: false, error: "PIN incorrecto" };
    }
  }

  await createSessionCookie(barber.id);
  return { success: true };
}

export async function signOut() {
  await destroySessionCookie();
  redirect("/login");
}
