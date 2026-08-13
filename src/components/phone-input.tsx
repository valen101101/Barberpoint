"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

// Formatea a medida que se escribe: "341 282-3726" (código de área de 3
// dígitos + 3 dígitos + guion + 4 dígitos). Es solo un formato visual para
// que sea más fácil de leer/tipear — no valida que sea un teléfono real.
function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6, 10);

  let result = area;
  if (mid) result += ` ${mid}`;
  if (last) result += `-${last}`;
  return result;
}

export function PhoneInput({
  id,
  name,
  placeholder = "341 282-3726",
  defaultValue = "",
}: {
  id?: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(formatPhone(defaultValue));

  return (
    <Input
      id={id}
      name={name}
      inputMode="numeric"
      autoComplete="tel"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
    />
  );
}
