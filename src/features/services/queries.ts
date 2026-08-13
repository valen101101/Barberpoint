import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type ServiceWithCurrentPrice = Tables<"services"> & {
  current_price: number | null;
};

export async function listServicesWithCurrentPrice(): Promise<
  ServiceWithCurrentPrice[]
> {
  const supabase = await createClient();
  const [{ data: services, error: servicesError }, { data: prices, error: pricesError }] =
    await Promise.all([
      supabase.from("services").select("*").order("name"),
      supabase.from("service_prices").select("service_id, price").is("valid_to", null),
    ]);

  if (servicesError) throw servicesError;
  if (pricesError) throw pricesError;

  const priceByService = new Map(prices.map((p) => [p.service_id, p.price]));

  return services.map((service) => ({
    ...service,
    current_price: priceByService.get(service.id) ?? null,
  }));
}

export async function getService(
  id: string,
): Promise<Tables<"services"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCurrentServicePrice(
  serviceId: string,
): Promise<Tables<"service_prices"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_prices")
    .select("*")
    .eq("service_id", serviceId)
    .is("valid_to", null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listServicePriceHistory(
  serviceId: string,
): Promise<Tables<"service_prices">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_prices")
    .select("*")
    .eq("service_id", serviceId)
    .order("valid_from", { ascending: false });

  if (error) throw error;
  return data;
}
