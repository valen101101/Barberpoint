import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSessionBarberId } from "@/lib/session";
import type { Tables } from "@/types/database";

export async function listActiveBarbers(): Promise<Tables<"barbers">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("active", true)
    .order("full_name");

  if (error) throw error;
  return data;
}

// El barbero de la sesión actual (cookie propia, ver src/lib/session.ts).
// Null si no hay sesión o si el barbero de esa sesión ya no existe.
export async function getCurrentBarber(): Promise<Tables<"barbers"> | null> {
  const barberId = await getSessionBarberId();
  if (!barberId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("id", barberId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type BarberProfile = {
  id: string;
  full_name: string;
  hasPassword: boolean;
};

// Para el selector de perfiles de /login. Nunca incluye password_hash en
// la respuesta — solo si existe o no.
export async function listBarberProfiles(): Promise<BarberProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbers")
    .select("id, full_name, password_hash")
    .eq("active", true)
    .order("full_name");

  if (error) throw error;
  return data.map((barber) => ({
    id: barber.id,
    full_name: barber.full_name,
    hasPassword: barber.password_hash !== null,
  }));
}
