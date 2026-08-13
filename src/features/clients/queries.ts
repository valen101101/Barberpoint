import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

// Lista para /clientes (administración). Excluye al cliente genérico: no es
// un cliente real que se pueda editar/dar de baja desde ahí.
export async function listClients(): Promise<Tables<"clients">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("is_generic", false)
    .order("last_name")
    .order("first_name");

  if (error) throw error;
  return data;
}

// Lista para el selector de Visitas: incluye al cliente genérico a
// propósito, para que buscar el legajo 0000 lo encuentre. El genérico va
// primero en la lista (antes que el orden alfabético) para que aparezca
// arriba de entrada en el combobox, sin tener que buscarlo.
export async function listActiveClients(): Promise<Tables<"clients">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("active", true)
    .order("is_generic", { ascending: false })
    .order("last_name")
    .order("first_name");

  if (error) throw error;
  return data;
}

// Vista previa del legajo que le va a quedar al próximo cliente que se
// registre. Es solo informativo: el número real lo asigna la secuencia de
// la base al insertar, así que puede diferir si dos altas ocurren a la vez.
export async function getNextClientNumberPreview(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("client_number")
    .eq("is_generic", false)
    .order("client_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.client_number ?? 0) + 1;
}

export async function getClient(
  id: string,
): Promise<Tables<"clients"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listClientContactChannels(
  clientId: string,
): Promise<Tables<"client_contact_channels">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_contact_channels")
    .select("*")
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false });

  if (error) throw error;
  return data;
}

export type ClientBarberPreferenceWithBarber =
  Tables<"client_barber_preferences"> & {
    barber: Pick<Tables<"barbers">, "id" | "full_name"> | null;
  };

export async function listClientBarberPreferences(
  clientId: string,
): Promise<ClientBarberPreferenceWithBarber[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_barber_preferences")
    .select("*, barber:barbers(id, full_name)")
    .eq("client_id", clientId);

  if (error) throw error;
  return data;
}
