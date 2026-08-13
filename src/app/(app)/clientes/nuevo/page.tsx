import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InstagramInput } from "@/components/instagram-input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listActiveBarbers } from "@/features/barbers/queries";
import { addClient } from "@/features/clients/actions";
import { getNextClientNumberPreview } from "@/features/clients/queries";

export default async function NuevoClientePage({
  searchParams,
}: PageProps<"/clientes/nuevo">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const [nextClientNumber, barbers] = await Promise.all([
    getNextClientNumberPreview(),
    listActiveBarbers(),
  ]);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <Link
        href="/clientes"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clientes
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Nuevo cliente
        </h1>
        <Badge variant="outline" className="text-primary">
          Le va a quedar el legajo #{String(nextClientNumber).padStart(4, "0")}
        </Badge>
      </div>
      <Card>
        <CardContent>
          <form action={addClient} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input id="first_name" name="first_name" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input id="last_name" name="last_name" required />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Contacto</Label>
              <p className="text-xs text-muted-foreground">
                Completá WhatsApp o Instagram (al menos uno de los dos). Otros
                canales se pueden agregar después desde la ficha del cliente.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="whatsapp" className="text-xs font-normal text-muted-foreground">
                    WhatsApp
                  </Label>
                  <PhoneInput id="whatsapp" name="whatsapp" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="instagram" className="text-xs font-normal text-muted-foreground">
                    Instagram
                  </Label>
                  <InstagramInput id="instagram" name="instagram" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="preferred_style">Estilo preferido</Label>
              <Input id="preferred_style" name="preferred_style" />
            </div>

            {barbers.length > 0 ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="preferred_barber_id">
                  Barbero preferido (opcional)
                </Label>
                <Select
                  name="preferred_barber_id"
                  items={barbers.map((barber) => ({
                    value: barber.id,
                    label: barber.full_name,
                  }))}
                >
                  <SelectTrigger id="preferred_barber_id" className="w-full">
                    <SelectValue placeholder="Sin preferencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Es solo una recomendación — cualquier barbero puede
                  atenderlo igual.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" />
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
