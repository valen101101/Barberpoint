import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { VisitWithDetails } from "@/features/visits/queries";

export async function listVisitsInRange(
  startDate: string,
  endDate: string,
): Promise<VisitWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select(
      "*, client:clients(id, first_name, last_name), barber:barbers(id, full_name), service:services(id, name)",
    )
    .gte("visit_date", startDate)
    .lte("visit_date", endDate)
    .order("visit_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}
