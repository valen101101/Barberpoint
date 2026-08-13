"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const serviceSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: z.string().trim().optional(),
});

const priceSchema = z.object({
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
});

export async function createService(formData: FormData) {
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    redirect(
      `/servicios/nuevo?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/servicios/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/servicios");
  redirect(`/servicios/${data.id}`);
}

export async function updateService(id: string, formData: FormData) {
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    redirect(
      `/servicios/${id}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/servicios/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/servicios");
  revalidatePath(`/servicios/${id}`);
  redirect(`/servicios/${id}`);
}

export async function setServiceActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ active })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/servicios");
}

// Inserta un precio nuevo. El trigger close_previous_service_price en
// schema.sql cierra automáticamente el precio vigente anterior — acá nunca
// se edita un precio existente.
export async function addServicePrice(serviceId: string, formData: FormData) {
  const parsed = priceSchema.safeParse({ price: formData.get("price") });

  if (!parsed.success) {
    redirect(
      `/servicios/${serviceId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("service_prices").insert({
    service_id: serviceId,
    price: parsed.data.price,
  });

  if (error) {
    redirect(
      `/servicios/${serviceId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/servicios");
  revalidatePath(`/servicios/${serviceId}`);
}
