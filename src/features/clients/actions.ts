"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type { ChannelType } from "@/types/database";

const editClientSchema = z.object({
  first_name: z.string().trim().min(1, "El nombre es obligatorio"),
  last_name: z.string().trim().min(1, "El apellido es obligatorio"),
  notes: z.string().trim().optional(),
  preferred_style: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
});

// El alta también pide WhatsApp o Instagram (no hace falta cargar los dos,
// pero al menos uno) para no terminar con clientes sin ninguna forma de
// contactarlos.
const newClientSchema = editClientSchema
  .extend({
    preferred_barber_id: z.string().trim().optional(),
  })
  .refine((data) => Boolean(data.whatsapp) || Boolean(data.instagram), {
    message: "Completá WhatsApp o Instagram (al menos uno de los dos)",
    path: ["whatsapp"],
  });

const CHANNEL_TYPES: ChannelType[] = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "phone",
  "email",
  "other",
];

const channelSchema = z.object({
  channel_type: z.enum(CHANNEL_TYPES as [ChannelType, ...ChannelType[]]),
  value: z.string().trim().min(1, "El valor es obligatorio"),
  is_primary: z.boolean(),
});

// Crea o actualiza el canal de un tipo dado (whatsapp/instagram) para un
// cliente. Si el valor viene vacío, borra el canal si existía. Se usa desde
// el form único de "Datos del cliente" en vez de por el flujo genérico de
// "agregar canal", para que editar WhatsApp/Instagram sea directo.
async function upsertPrimaryChannel(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  clientId: string,
  channelType: "whatsapp" | "instagram",
  value: string | undefined,
) {
  const { data: existing } = await supabase
    .from("client_contact_channels")
    .select("id")
    .eq("client_id", clientId)
    .eq("channel_type", channelType)
    .maybeSingle();

  if (!value) {
    if (existing) {
      await supabase
        .from("client_contact_channels")
        .delete()
        .eq("id", existing.id);
    }
    return;
  }

  if (existing) {
    await supabase
      .from("client_contact_channels")
      .update({ value })
      .eq("id", existing.id);
    return;
  }

  const { data: anyPrimary } = await supabase
    .from("client_contact_channels")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_primary", true)
    .maybeSingle();

  await supabase.from("client_contact_channels").insert({
    client_id: clientId,
    channel_type: channelType,
    value,
    is_primary: !anyPrimary,
  });
}

export async function addClient(formData: FormData) {
  const parsed = newClientSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    notes: formData.get("notes"),
    preferred_style: formData.get("preferred_style"),
    whatsapp: formData.get("whatsapp"),
    instagram: formData.get("instagram"),
    preferred_barber_id: formData.get("preferred_barber_id"),
  });

  if (!parsed.success) {
    redirect(
      `/clientes/nuevo?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      notes: parsed.data.notes || null,
      preferred_style: parsed.data.preferred_style || null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/clientes/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  const channels = [
    parsed.data.whatsapp
      ? { channel_type: "whatsapp" as const, value: parsed.data.whatsapp }
      : null,
    parsed.data.instagram
      ? { channel_type: "instagram" as const, value: parsed.data.instagram }
      : null,
  ].filter((c) => c !== null);

  if (channels.length > 0) {
    const { error: channelsError } = await supabase
      .from("client_contact_channels")
      .insert(
        channels.map((c, index) => ({
          client_id: data.id,
          channel_type: c.channel_type,
          value: c.value,
          is_primary: index === 0,
        })),
      );

    if (channelsError) {
      redirect(
        `/clientes/nuevo?error=${encodeURIComponent(channelsError.message)}`,
      );
    }
  }

  if (parsed.data.preferred_barber_id) {
    await supabase.from("client_barber_preferences").insert({
      client_id: data.id,
      barber_id: parsed.data.preferred_barber_id,
    });
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const parsed = editClientSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    notes: formData.get("notes"),
    preferred_style: formData.get("preferred_style"),
    whatsapp: formData.get("whatsapp"),
    instagram: formData.get("instagram"),
  });

  if (!parsed.success) {
    redirect(
      `/clientes/${id}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      notes: parsed.data.notes || null,
      preferred_style: parsed.data.preferred_style || null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/clientes/${id}?error=${encodeURIComponent(error.message)}`);
  }

  await upsertPrimaryChannel(supabase, id, "whatsapp", parsed.data.whatsapp);
  await upsertPrimaryChannel(supabase, id, "instagram", parsed.data.instagram);

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function setClientActive(id: string, active: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ active })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

export async function addContactChannel(clientId: string, formData: FormData) {
  const parsed = channelSchema.safeParse({
    channel_type: formData.get("channel_type"),
    value: formData.get("value"),
    is_primary: formData.get("is_primary") === "on",
  });

  if (!parsed.success) {
    redirect(
      `/clientes/${clientId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const supabase = await createSupabaseServerClient();

  // Solo puede haber un canal marcado como principal por cliente
  // (uq_client_contact_channels_primary en schema.sql).
  if (parsed.data.is_primary) {
    await supabase
      .from("client_contact_channels")
      .update({ is_primary: false })
      .eq("client_id", clientId)
      .eq("is_primary", true);
  }

  const { error } = await supabase.from("client_contact_channels").insert({
    client_id: clientId,
    channel_type: parsed.data.channel_type,
    value: parsed.data.value,
    is_primary: parsed.data.is_primary,
  });

  if (error) {
    redirect(
      `/clientes/${clientId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteContactChannel(
  clientId: string,
  channelId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_contact_channels")
    .delete()
    .eq("id", channelId);

  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}

export async function addPreferredBarber(clientId: string, formData: FormData) {
  const barberId = String(formData.get("barber_id") ?? "");
  if (!barberId) {
    redirect(`/clientes/${clientId}?error=${encodeURIComponent("Elegí un barbero")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_barber_preferences")
    .upsert(
      { client_id: clientId, barber_id: barberId },
      { onConflict: "client_id,barber_id" },
    );

  if (error) {
    redirect(
      `/clientes/${clientId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/clientes/${clientId}`);
}

export async function removePreferredBarber(
  clientId: string,
  preferenceId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_barber_preferences")
    .delete()
    .eq("id", preferenceId);

  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}
