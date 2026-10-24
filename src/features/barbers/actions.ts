"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBarber } from "./queries";
import { canResetPasswords } from "./permissions";

export async function resetBarberPassword(barberId: string) {
  const currentBarber = await getCurrentBarber();
  if (!canResetPasswords(currentBarber)) {
    return { success: false, error: "No tenés permiso para blanquear claves." };
  }
  const parsed = z.uuid().safeParse(barberId);
  if (!parsed.success) {
    return { success: false, error: "El perfil no es válido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("barbers")
    .update({ password_hash: null })
    .eq("id", parsed.data)
    .eq("active", true)
    .not("password_hash", "is", null)
    .select("id")
    .maybeSingle();

  if (error) return { success: false, error: "No se pudo blanquear la clave. Intentá nuevamente." };
  if (!data) return { success: false, error: "El perfil no está disponible o ya tiene la clave blanqueada." };

  revalidatePath("/usuarios");
  revalidatePath("/login");
  return { success: true };
}
