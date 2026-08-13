import { dateFormatter, parseDateOnly, priceFormatter } from "@/lib/format";
import type { DailyTotal } from "@/features/analytics/aggregate";

// Gráfico de barras simple, sin librerías: una serie (facturación por día),
// así que no hace falta leyenda — el título de la card ya dice qué es. El
// tooltip es puro CSS (group-hover), no necesita "use client".
export function RevenueBarChart({ data }: { data: DailyTotal[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div>
      <div className="flex h-48 items-end gap-[3px]">
        {data.map((d) => {
          const heightPct = (d.revenue / max) * 100;
          return (
            <div
              key={d.date}
              className="group relative flex h-full flex-1 flex-col justify-end"
            >
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs shadow-md ring-1 ring-foreground/10 group-hover:block">
                <p className="font-medium text-popover-foreground">
                  {dateFormatter.format(parseDateOnly(d.date))}
                </p>
                <p className="text-muted-foreground">
                  {d.count} corte{d.count === 1 ? "" : "s"} —{" "}
                  {priceFormatter.format(d.revenue)}
                </p>
              </div>
              <div
                className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                style={{
                  height: `${heightPct}%`,
                  minHeight: d.revenue > 0 ? "2px" : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % labelStep === 0 || i === data.length - 1 ? (
              <span className="text-[0.6rem] whitespace-nowrap text-muted-foreground">
                {dateFormatter.format(parseDateOnly(d.date)).slice(0, 5)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
