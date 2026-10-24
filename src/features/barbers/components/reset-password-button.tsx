"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { resetBarberPassword } from "../actions";
import type { BarberProfile } from "../queries";

export function ResetPasswordButton({ profile }: { profile: BarberProfile }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      try {
        const result = await resetBarberPassword(profile.id);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`Clave de ${profile.full_name} blanqueada.`);
        setOpen(false);
      } catch {
        toast.error("No se pudo blanquear la clave. Intentá nuevamente.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" disabled={!profile.hasPassword} />}>
        Blanquear clave
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogTitle>¿Blanquear la clave de {profile.full_name}?</DialogTitle>
        <DialogDescription>
          Se eliminará su PIN actual. La próxima vez que ingrese, deberá elegir uno nuevo de 4 dígitos.
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={pending} onClick={reset}>{pending ? "Blanqueando…" : "Blanquear clave"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
