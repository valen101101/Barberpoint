import type { PaymentMethod } from "@/types/database";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

export const PAYMENT_METHOD_OPTIONS = Object.entries(
  PAYMENT_METHOD_LABELS,
).map(([value, label]) => ({ value: value as PaymentMethod, label }));
