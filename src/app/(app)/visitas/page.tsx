import { Scissors, Wallet, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { InitialsAvatar } from "@/components/initials-avatar";
import { PageHeader } from "@/components/page-header";
import { getCurrentBarber } from "@/features/barbers/queries";
import { ClientCombobox } from "@/features/clients/components/client-combobox";
import { listActiveClients } from "@/features/clients/queries";
import { listServicesWithCurrentPrice } from "@/features/services/queries";
import { createVisit } from "@/features/visits/actions";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from "@/features/visits/constants";
import { listRecentVisits } from "@/features/visits/queries";

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});
const dateFormatter = new Intl.DateTimeFormat("es-AR");

export default async function VisitasPage({
  searchParams,
}: PageProps<"/visitas">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  const [clients, barber, services, recentVisits] = await Promise.all([
    listActiveClients(),
    getCurrentBarber(),
    listServicesWithCurrentPrice(),
    listRecentVisits(),
  ]);

  const availableServices = services.filter(
    (s) => s.active && s.current_price != null,
  );

  const today = new Date().toISOString().slice(0, 10);
  const visitsToday = recentVisits.filter((v) => v.visit_date === today);
  const revenueToday = visitsToday.reduce((sum, v) => sum + v.price_charged, 0);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Visitas"
        description="Registrá un corte y el precio se toma solo del valor vigente."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="transition-transform duration-200 hover:-translate-y-0.5">
          <CardContent className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <CalendarDays className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold leading-none">
                {visitsToday.length}
              </p>
              <p className="text-xs text-muted-foreground">Cortes hoy</p>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-transform duration-200 hover:-translate-y-0.5">
          <CardContent className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Wallet className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold leading-none">
                {priceFormatter.format(revenueToday)}
              </p>
              <p className="text-xs text-muted-foreground">Cobrado hoy</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Nueva visita</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createVisit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="client_id">Cliente</Label>
              <ClientCombobox id="client_id" clients={clients} required />
              <p className="text-xs text-muted-foreground">
                Buscá por legajo o apellido. Para un corte casual sin
                registrar a la persona, buscá &quot;0000&quot; (Cliente Genérico).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Atendido por</Label>
              <p className="text-sm font-medium">
                {barber?.full_name ?? "—"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="service_id">Servicio</Label>
              <Select
                name="service_id"
                required
                items={availableServices.map((service) => ({
                  value: service.id,
                  label: `${service.name} — ${priceFormatter.format(service.current_price!)}`,
                }))}
              >
                <SelectTrigger id="service_id" className="w-full">
                  <SelectValue placeholder="Elegir servicio" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} —{" "}
                      {priceFormatter.format(service.current_price!)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                El precio se toma automáticamente del precio vigente del
                servicio al momento de guardar.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="payment_method">Forma de pago</Label>
              <Select
                name="payment_method"
                defaultValue="cash"
                required
                items={PAYMENT_METHOD_OPTIONS}
              >
                <SelectTrigger id="payment_method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              className="w-fit"
              disabled={clients.length === 0 || availableServices.length === 0}
            >
              <Scissors className="size-4" />
              Registrar corte
            </Button>
            {clients.length === 0 || availableServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Hace falta al menos un cliente y un servicio activo con
                precio cargado para poder registrar un corte.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-lg font-medium">Últimas visitas</h2>
        {recentVisits.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title="Todavía no hay visitas registradas"
            description="Los cortes que registres van a aparecer acá."
          />
        ) : (
          <Card className="min-w-0 overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Barbero</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Precio cobrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentVisits.map((visit) => {
                  const clientName = visit.client
                    ? `${visit.client.first_name} ${visit.client.last_name}`
                    : null;
                  return (
                  <TableRow key={visit.id}>
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
                    <TableCell className="text-muted-foreground">
                      {dateFormatter.format(new Date(`${visit.visit_date}T00:00:00`))}
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
        )}
      </div>
    </div>
  );
}
