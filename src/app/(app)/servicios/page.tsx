import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { listServicesWithCurrentPrice } from "@/features/services/queries";

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export default async function ServiciosPage() {
  const services = await listServicesWithCurrentPrice();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Servicios"
        description="Precios versionados: subir un precio nunca altera los cortes ya cobrados."
        action={
          <Button render={<Link href="/servicios/nuevo"><Plus className="size-4" />Nuevo servicio</Link>} />
        }
      />

      {services.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Todavía no hay servicios cargados"
          description="Agregá el primero para poder registrar cortes."
          action={
            <Button size="sm" render={<Link href="/servicios/nuevo">Nuevo servicio</Link>} />
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio vigente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    {service.current_price != null ? (
                      <span className="font-medium text-primary">
                        {priceFormatter.format(service.current_price)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Sin precio cargado
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={service.active ? "default" : "secondary"}>
                      {service.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <Link href={`/servicios/${service.id}`}>Ver / editar</Link>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
