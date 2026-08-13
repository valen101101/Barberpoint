import Link from "next/link";
import { Plus, Users } from "lucide-react";
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
import { InitialsAvatar } from "@/components/initials-avatar";
import { PageHeader } from "@/components/page-header";
import { listClients } from "@/features/clients/queries";

export default async function ClientesPage() {
  const clients = await listClients();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Ficha y seguimiento de cada cliente."
        action={
          <Button render={<Link href="/clientes/nuevo"><Plus className="size-4" />Nuevo cliente</Link>} />
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no hay clientes cargados"
          description="Agregá el primero para empezar a registrar cortes."
          action={
            <Button size="sm" render={<Link href="/clientes/nuevo">Nuevo cliente</Link>} />
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Legajo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const fullName = `${client.first_name} ${client.last_name}`;
                return (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar name={fullName} />
                      {fullName}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    #{String(client.client_number).padStart(4, "0")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.active ? "default" : "secondary"}>
                      {client.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <Link href={`/clientes/${client.id}`}>Ver / editar</Link>
                      }
                    />
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
