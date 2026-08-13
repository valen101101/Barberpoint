"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

// Le pone el "@" solo a medida que se escribe (no hace falta tipearlo) y
// filtra caracteres que un usuario de Instagram no puede tener.
function formatInstagram(raw: string) {
  const cleaned = raw.replace(/[^a-zA-Z0-9._]/g, "");
  return cleaned ? `@${cleaned}` : "";
}

export function InstagramInput({
  id,
  name,
  placeholder = "@usuario",
  defaultValue = "",
}: {
  id?: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(formatInstagram(defaultValue));

  return (
    <Input
      id={id}
      name={name}
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(formatInstagram(e.target.value))}
    />
  );
}
