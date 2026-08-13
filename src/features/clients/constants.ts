import type { ChannelType } from "@/types/database";

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  phone: "Teléfono",
  email: "Email",
  other: "Otro",
};

export const CHANNEL_TYPE_OPTIONS = Object.entries(CHANNEL_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as ChannelType, label }),
);

// WhatsApp e Instagram tienen campos propios (se editan junto con los datos
// del cliente); acá quedan los demás tipos, para el canal "extra" ocasional.
export const OTHER_CHANNEL_TYPE_OPTIONS = CHANNEL_TYPE_OPTIONS.filter(
  (option) => option.value !== "whatsapp" && option.value !== "instagram",
);
