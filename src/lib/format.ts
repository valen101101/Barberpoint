export const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export const dateFormatter = new Intl.DateTimeFormat("es-AR");

export const dateFormatterLong = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

// Los campos `date` de Postgres (visit_date) llegan como "YYYY-MM-DD". Sin
// especificar la hora, `new Date("YYYY-MM-DD")` se interpreta en UTC y
// puede mostrar el día anterior según el huso horario del navegador/server.
export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}
