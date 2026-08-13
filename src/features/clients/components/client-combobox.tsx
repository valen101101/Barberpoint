"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InitialsAvatar } from "@/components/initials-avatar";
import type { Tables } from "@/types/database";

// Rango Unicode "Combining Diacritical Marks" (U+0300–U+036F), lo que
// `.normalize("NFD")` separa de una vocal con tilde — se usa para poder
// buscar "Perez" y encontrar "Pérez".
const COMBINING_DIACRITICS = new RegExp("[̀-ͯ]", "g");

function normalize(value: string) {
  return value.normalize("NFD").replace(COMBINING_DIACRITICS, "").toLowerCase();
}

function clientLabel(client: Tables<"clients">) {
  return `${client.first_name} ${client.last_name}`;
}

function clientMatchesQuery(client: Tables<"clients">, rawQuery: string) {
  const query = rawQuery.trim();
  if (!query) return true;

  const legajo = String(client.client_number).padStart(4, "0");
  if (legajo.includes(query)) return true;

  return normalize(clientLabel(client)).includes(normalize(query));
}

export function ClientCombobox({
  clients,
  name = "client_id",
  required = false,
  id,
}: {
  clients: Tables<"clients">[];
  name?: string;
  required?: boolean;
  id?: string;
}) {
  return (
    <Combobox
      items={clients}
      name={name}
      required={required}
      filter={clientMatchesQuery}
      itemToStringValue={(client: Tables<"clients">) => client.id}
      itemToStringLabel={(client: Tables<"clients">) => clientLabel(client)}
    >
      <ComboboxInput id={id} placeholder="Buscar por legajo o apellido..." />
      <ComboboxContent>
        <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
        <ComboboxList>
          {(client: Tables<"clients">) => (
            <ComboboxItem key={client.id} value={client}>
              <InitialsAvatar name={clientLabel(client)} className="size-6 text-[0.6rem]" />
              <span className="flex-1">{clientLabel(client)}</span>
              <span className="text-xs text-muted-foreground">
                #{String(client.client_number).padStart(4, "0")}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
