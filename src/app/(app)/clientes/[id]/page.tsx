import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InitialsAvatar } from "@/components/initials-avatar";
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
import {
  addContactChannel,
  addPreferredBarber,
  deleteContactChannel,
  removePreferredBarber,
  setClientActive,
  updateClient,
} from "@/features/clients/actions";
import {
  CHANNEL_TYPE_LABELS,
  OTHER_CHANNEL_TYPE_OPTIONS,
} from "@/features/clients/constants";
import {
  getClient,
  listClientBarberPreferences,
  listClientContactChannels,
} from "@/features/clients/queries";

export default async function ClienteDetallePage({
  params,
  searchParams,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const search = await searchParams;
  const error = typeof search.error === "string" ? search.error : null;

  const [client, channels, preferences, activeBarbers] = await Promise.all([
    getClient(id),
    listClientContactChannels(id),
    listClientBarberPreferences(id),
    listActiveBarbers(),
  ]);

  if (!client) notFound();

  const fullName = `${client.first_name} ${client.last_name}`;
  const whatsapp = channels.find((c) => c.channel_type === "whatsapp");
  const instagram = channels.find((c) => c.channel_type === "instagram");
  const otherChannels = channels.filter(
    (c) => c.channel_type !== "whatsapp" && c.channel_type !== "instagram",
  );
  const preferredBarberIds = new Set(preferences.map((p) => p.barber_id));
  const availableBarbers = activeBarbers.filter(
    (b) => !preferredBarberIds.has(b.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/clientes"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clientes
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <InitialsAvatar name={fullName} className="size-11 text-sm" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
            <p className="text-sm text-muted-foreground">
              Legajo #{String(client.client_number).padStart(4, "0")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={client.active ? "default" : "secondary"}>
            {client.active ? "Activo" : "Inactivo"}
          </Badge>
          {!client.is_generic && (
            <form action={setClientActive.bind(null, client.id, !client.active)}>
              <Button type="submit" variant="outline" size="sm">
                {client.active ? "Dar de baja" : "Reactivar"}
              </Button>
            </form>
          )}
        </div>
      </div>

      {client.is_generic ? (
        <p className="text-sm text-muted-foreground">
          Este es el cliente comodín para cortes casuales (legajo 0000) — no
          se puede dar de baja.
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos del cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={updateClient.bind(null, client.id)}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    defaultValue={client.first_name}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    defaultValue={client.last_name}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="whatsapp" className="text-xs font-normal text-muted-foreground">
                    WhatsApp
                  </Label>
                  <PhoneInput
                    id="whatsapp"
                    name="whatsapp"
                    defaultValue={whatsapp?.value ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="instagram" className="text-xs font-normal text-muted-foreground">
                    Instagram
                  </Label>
                  <InstagramInput
                    id="instagram"
                    name="instagram"
                    defaultValue={instagram?.value ?? ""}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="preferred_style">Estilo preferido</Label>
                <Input
                  id="preferred_style"
                  name="preferred_style"
                  defaultValue={client.preferred_style ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" name="notes" defaultValue={client.notes ?? ""} />
              </div>
              <Button type="submit" className="w-fit">
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Otros canales de contacto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              WhatsApp e Instagram se editan en &quot;Datos del cliente&quot;.
              Acá se pueden sumar otros, como Facebook o un teléfono fijo.
            </p>
            <ul className="flex flex-col gap-2">
              {otherChannels.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Sin otros canales cargados.
                </li>
              ) : (
                otherChannels.map((channel) => (
                  <li
                    key={channel.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">
                        {CHANNEL_TYPE_LABELS[channel.channel_type]}
                      </span>
                      {": "}
                      {channel.value}
                      {channel.is_primary ? (
                        <Badge variant="outline" className="ml-2">
                          Principal
                        </Badge>
                      ) : null}
                    </span>
                    <form
                      action={deleteContactChannel.bind(
                        null,
                        client.id,
                        channel.id,
                      )}
                    >
                      <Button type="submit" variant="ghost" size="sm">
                        Quitar
                      </Button>
                    </form>
                  </li>
                ))
              )}
            </ul>

            <form
              action={addContactChannel.bind(null, client.id)}
              className="flex flex-col gap-2 border-t pt-4"
            >
              <div className="flex gap-2">
                <Select
                  name="channel_type"
                  defaultValue={OTHER_CHANNEL_TYPE_OPTIONS[0].value}
                  items={OTHER_CHANNEL_TYPE_OPTIONS}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OTHER_CHANNEL_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input name="value" placeholder="Valor" required />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_primary" className="size-4" />
                Marcar como principal
              </label>
              <Button type="submit" variant="outline" className="w-fit">
                Agregar canal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Barberos preferidos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Es solo una recomendación para la UI — cualquier barbero puede
            atender a este cliente.
          </p>
          <ul className="flex flex-wrap gap-2">
            {preferences.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Sin barberos preferidos asignados.
              </li>
            ) : (
              preferences.map((pref) => (
                <li key={pref.id}>
                  <form
                    action={removePreferredBarber.bind(
                      null,
                      client.id,
                      pref.id,
                    )}
                  >
                    <Badge variant="outline" className="gap-2">
                      {pref.barber?.full_name ?? "Barbero eliminado"}
                      <button
                        type="submit"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Quitar preferencia"
                      >
                        ×
                      </button>
                    </Badge>
                  </form>
                </li>
              ))
            )}
          </ul>

          {availableBarbers.length > 0 ? (
            <form
              action={addPreferredBarber.bind(null, client.id)}
              className="flex items-center gap-2"
            >
              <Select
                name="barber_id"
                items={availableBarbers.map((barber) => ({
                  value: barber.id,
                  label: barber.full_name,
                }))}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Elegir barbero" />
                </SelectTrigger>
                <SelectContent>
                  {availableBarbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" variant="outline">
                Agregar
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
