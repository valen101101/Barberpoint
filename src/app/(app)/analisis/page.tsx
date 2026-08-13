import Link from "next/link";
import { CalendarDays, ChartColumn, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { CashRegisterTable } from "@/features/analytics/components/cash-register-table";
import { RevenueBarChart } from "@/features/analytics/components/revenue-bar-chart";
import {
  groupByBarberAndPaymentMethod,
  groupByDate,
  totalRevenue,
} from "@/features/analytics/aggregate";
import { listVisitsInRange } from "@/features/analytics/queries";
import { dateFormatter, parseDateOnly, priceFormatter } from "@/lib/format";

const RANGE_OPTIONS = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
] as const;
const DEFAULT_RANGE = "30";

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function AnalisisPage({
  searchParams,
}: PageProps<"/analisis">) {
  const params = await searchParams;
  const rangeParam = typeof params.range === "string" ? params.range : DEFAULT_RANGE;
  const days = RANGE_OPTIONS.some((o) => o.value === rangeParam)
    ? Number(rangeParam)
    : Number(DEFAULT_RANGE);

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const startDate = toISODate(start);
  const endDate = toISODate(end);

  const visits = await listVisitsInRange(startDate, endDate);
  const dailyWithVisits = groupByDate(visits);
  const dailyByDate = new Map(dailyWithVisits.map((d) => [d.date, d]));

  // Serie completa del rango, con los días sin cortes en cero — para que el
  // gráfico no "salte" fechas.
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISODate(d);
    return dailyByDate.get(iso) ?? { date: iso, count: 0, revenue: 0 };
  });

  const revenue = totalRevenue(visits);
  const count = visits.length;
  const avgTicket = count > 0 ? revenue / count : 0;
  const cashRegisterRows = groupByBarberAndPaymentMethod(visits);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Análisis"
        description="Facturación día a día."
        action={
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={days === Number(option.value) ? "default" : "outline"}
                size="sm"
                render={<Link href={`/analisis?range=${option.value}`}>{option.label}</Link>}
              />
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <CalendarDays className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">{count}</p>
              <p className="text-xs text-muted-foreground">Cortes en el período</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <Wallet className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">
                {priceFormatter.format(revenue)}
              </p>
              <p className="text-xs text-muted-foreground">Facturado</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <Receipt className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">
                {priceFormatter.format(avgTicket)}
              </p>
              <p className="text-xs text-muted-foreground">Ticket promedio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturación por día</CardTitle>
        </CardHeader>
        <CardContent>
          {revenue === 0 ? (
            <EmptyState
              icon={ChartColumn}
              title="Sin datos en este período"
              description="Todavía no hay cortes registrados en el rango elegido."
            />
          ) : (
            <RevenueBarChart data={series} />
          )}
        </CardContent>
      </Card>

      {cashRegisterRows.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Cierre de caja por barbero</h2>
          <p className="text-xs text-muted-foreground">
            Total del período elegido, desglosado por forma de pago. Para el
            cierre de un día puntual, entrá al detalle de ese día.
          </p>
          <Card className="overflow-hidden py-0">
            <CashRegisterTable rows={cashRegisterRows} />
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Detalle por día</h2>
        {dailyWithVisits.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Sin días con cortes en este período"
          />
        ) : (
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cortes</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...dailyWithVisits].reverse().map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/analisis/${day.date}`}
                        className="hover:underline"
                      >
                        {dateFormatter.format(parseDateOnly(day.date))}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {day.count}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {priceFormatter.format(day.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
