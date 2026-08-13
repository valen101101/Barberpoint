import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type VisitWithDetails = Tables<"visits"> & {
  client: Pick<Tables<"clients">, "id" | "first_name" | "last_name"> | null;
  barber: Pick<Tables<"barbers">, "id" | "full_name"> | null;
  service: Pick<Tables<"services">, "id" | "name"> | null;
};

export async function listRecentVisits(
  limit = 25,
): Promise<VisitWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select(
      "*, client:clients(id, first_name, last_name), barber:barbers(id, full_name), service:services(id, name)",
    )
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
