"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBarber } from "@/features/barbers/queries";
import type { PaymentMethod } from "@/types/database";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "transfer", "card", "other"];

const visitSchema = z.object({
  client_id: z.uuid("Elegí un cliente"),
  service_id: z.uuid("Elegí un servicio"),
  payment_method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  notes: z.string().trim().optional(),
});

export async function createVisit(formData: FormData) {
  const parsed = visitSchema.safeParse({
    client_id: formData.get("client_id"),
    service_id: formData.get("service_id"),
    payment_method: formData.get("payment_method"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirect(`/visitas?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  // El barbero no se elige de una lista: es el que está logueado. Además de
  // más simple, evita que se pueda falsear el barbero desde el formulario.
  const barber = await getCurrentBarber();
  if (!barber) {
    redirect(
      `/visitas?error=${encodeURIComponent("No se encontró un barbero vinculado a tu cuenta")}`,
    );
  }

  const supabase = await createClient();

  // El precio se congela acá: se lee el precio vigente del servicio en este
  // momento y se copia a la visita. Un cambio de precio posterior no toca
  // este registro (regla clave de CLAUDE.md, sección 4.2).
  const { data: currentPrice, error: priceError } = await supabase
    .from("service_prices")
    .select("id, price")
    .eq("service_id", parsed.data.service_id)
    .is("valid_to", null)
    .maybeSingle();

  if (priceError) {
    redirect(`/visitas?error=${encodeURIComponent(priceError.message)}`);
  }

  if (!currentPrice) {
    redirect(
      `/visitas?error=${encodeURIComponent("Ese servicio todavía no tiene un precio cargado")}`,
    );
  }

  const { error } = await supabase.from("visits").insert({
    client_id: parsed.data.client_id,
    barber_id: barber.id,
    service_id: parsed.data.service_id,
    service_price_id: currentPrice.id,
    price_charged: currentPrice.price,
    payment_method: parsed.data.payment_method,
    notes: parsed.data.notes || null,
  });

  if (error) {
    redirect(`/visitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/visitas");
  redirect("/visitas");
}
