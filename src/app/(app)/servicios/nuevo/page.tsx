import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createService } from "@/features/services/actions";

export default async function NuevoServicioPage({
  searchParams,
}: PageProps<"/servicios/nuevo">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <Link
        href="/servicios"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Servicios
      </Link>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Nuevo servicio
      </h1>
      <p className="text-sm text-muted-foreground">
        El precio se carga en el siguiente paso, una vez creado el servicio.
      </p>
      <Card>
        <CardContent>
          <form action={createService} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-fit">
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
