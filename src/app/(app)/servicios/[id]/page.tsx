import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/price-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  addServicePrice,
  setServiceActive,
  updateService,
} from "@/features/services/actions";
import {
  getService,
  listServicePriceHistory,
} from "@/features/services/queries";

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});
const dateFormatter = new Intl.DateTimeFormat("es-AR");

export default async function ServicioDetallePage({
  params,
  searchParams,
}: PageProps<"/servicios/[id]">) {
  const { id } = await params;
  const search = await searchParams;
  const error = typeof search.error === "string" ? search.error : null;

  const [service, priceHistory] = await Promise.all([
    getService(id),
    listServicePriceHistory(id),
  ]);

  if (!service) notFound();

  const currentPrice = priceHistory.find((p) => p.valid_to === null) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/servicios"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Servicios
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={service.active ? "default" : "secondary"}>
            {service.active ? "Activo" : "Inactivo"}
          </Badge>
          <form
            action={setServiceActive.bind(null, service.id, !service.active)}
          >
            <Button type="submit" variant="outline" size="sm">
              {service.active ? "Dar de baja" : "Reactivar"}
            </Button>
          </form>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos del servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={updateService.bind(null, service.id)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" defaultValue={service.name} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={service.description ?? ""}
                />
              </div>
              <Button type="submit" className="w-fit">
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precio vigente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="font-heading text-3xl font-semibold text-primary">
              {currentPrice ? priceFormatter.format(currentPrice.price) : "—"}
            </p>
            <form
              action={addServicePrice.bind(null, service.id)}
              className="flex items-end gap-2"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="price">Nuevo precio</Label>
                <PriceInput id="price" name="price" required className="w-40" />
              </div>
              <Button type="submit">Actualizar precio</Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Al cargar un precio nuevo se cierra automáticamente la vigencia
              del anterior. Los cortes ya registrados no cambian.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Historial de precios</h2>
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Precio</TableHead>
                <TableHead>Vigente desde</TableHead>
                <TableHead>Vigente hasta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Todavía no hay precios cargados.
                  </TableCell>
                </TableRow>
              ) : (
                priceHistory.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {priceFormatter.format(p.price)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateFormatter.format(new Date(`${p.valid_from}T00:00:00`))}
                    </TableCell>
                    <TableCell>
                      {p.valid_to ? (
                        <span className="text-muted-foreground">
                          {dateFormatter.format(new Date(`${p.valid_to}T00:00:00`))}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-primary">
                          Vigente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
