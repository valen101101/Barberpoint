import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Scissors,
  Wallet,
} from "lucide-react";
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
import { InitialsAvatar } from "@/components/initials-avatar";
import { CashRegisterTable } from "@/features/analytics/components/cash-register-table";
import {
  groupByBarberAndPaymentMethod,
  groupByService,
  totalRevenue,
} from "@/features/analytics/aggregate";
import { listVisitsInRange } from "@/features/analytics/queries";
import { PAYMENT_METHOD_LABELS } from "@/features/visits/constants";
import {
  dateFormatterLong,
  parseDateOnly,
  priceFormatter,
  timeFormatter,
} from "@/lib/format";

function shiftDate(iso: string, deltaDays: number) {
  const date = parseDateOnly(iso);
  date.setDate(date.getDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function BreakdownCard({
  title,
  items,
}: {
  title: string;
  items: { key: string; label: string; count: number; revenue: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {item.label}{" "}
                  <span className="text-muted-foreground">({item.count})</span>
                </span>
                <span className="font-medium text-primary">
                  {priceFormatter.format(item.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AnalisisDiaPage({
  params,
}: PageProps<"/analisis/[date]">) {
  const { date } = await params;

  const visits = await listVisitsInRange(date, date);
  const revenue = totalRevenue(visits);
  const count = visits.length;
  const avgTicket = count > 0 ? revenue / count : 0;

  const cashRegisterRows = groupByBarberAndPaymentMethod(visits);
  const byService = groupByService(visits);

  const prevDate = shiftDate(date, -1);
  const nextDate = shiftDate(date, 1);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/analisis"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Análisis
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight capitalize">
          {dateFormatterLong.format(parseDateOnly(date))}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            render={
              <Link href={`/analisis/${prevDate}`} aria-label="Día anterior">
                <ChevronLeft className="size-4" />
              </Link>
            }
          />
          <Button
            variant="outline"
            size="icon"
            render={
              <Link href={`/analisis/${nextDate}`} aria-label="Día siguiente">
                <ChevronRight className="size-4" />
              </Link>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <Scissors className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">{count}</p>
              <p className="text-xs text-muted-foreground">Cortes</p>
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

      {count === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin cortes este día"
          description="No se registraron visitas en esta fecha."
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">Cierre de caja</h2>
            <Card className="overflow-hidden py-0">
              <CashRegisterTable rows={cashRegisterRows} />
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <BreakdownCard title="Por servicio" items={byService} />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">Detalle de visitas</h2>
            <Card className="overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Barbero</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((visit) => {
                    const clientName = visit.client
                      ? `${visit.client.first_name} ${visit.client.last_name}`
                      : null;
                    return (
                      <TableRow key={visit.id}>
                        <TableCell className="text-muted-foreground">
                          {timeFormatter.format(new Date(visit.created_at))}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar
                              name={clientName ?? "?"}
                              className="size-7 text-[0.65rem]"
                            />
                            {clientName ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {visit.barber?.full_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {visit.service?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {PAYMENT_METHOD_LABELS[visit.payment_method]}
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {priceFormatter.format(visit.price_charged)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
