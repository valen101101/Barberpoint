"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

function formatThousands(digits: string) {
  if (!digits) return "";
  return Number(digits).toLocaleString("es-AR");
}

export function PriceInput({
  id,
  name,
  defaultValue = "",
  required = false,
  className,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  const [digits, setDigits] = useState(defaultValue.replace(/\D/g, ""));

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="14.000"
        value={formatThousands(digits)}
        onChange={(e) => setDigits(e.target.value.replace(/\D/g, ""))}
        required={required}
        className={`pl-6 ${className ?? ""}`}
      />
      <input type="hidden" name={name} value={digits} />
    </div>
  );
}
