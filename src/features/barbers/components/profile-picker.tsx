"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InitialsAvatar } from "@/components/initials-avatar";
import { Label } from "@/components/ui/label";
import { WelcomeCurtain } from "@/components/welcome-curtain";
import { authenticate } from "@/app/login/actions";
import type { BarberProfile } from "@/features/barbers/queries";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function ProfilePicker({ profiles }: { profiles: BarberProfile[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<BarberProfile | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [curtainName, setCurtainName] = useState<string | null>(null);

  function reset() {
    setSelected(null);
    setPin("");
    setConfirmPin("");
    setError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setError(null);

    if (pin.length !== 4) {
      setError("El PIN tiene que ser de 4 dígitos");
      return;
    }
    if (!selected.hasPassword && pin !== confirmPin) {
      setError("Los PIN no coinciden");
      return;
    }

    startTransition(async () => {
      const result = await authenticate(selected.id, pin);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCurtainName(selected.full_name.split(" ")[0]);
    });
  }

  if (curtainName) {
    return (
      <WelcomeCurtain
        name={curtainName}
        onDone={() => router.push("/visitas")}
      />
    );
  }

  if (!selected) {
    if (profiles.length === 0) {
      return (
        <p className="max-w-xs text-center text-sm text-muted-foreground">
          Todavía no hay barberos cargados. Pedile al dueño que te dé de
          alta.
        </p>
      );
    }

    return (
      <div className="grid w-full min-w-0 max-w-sm grid-cols-2 gap-3 sm:grid-cols-3">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => setSelected(profile)}
            className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all duration-150 hover:-translate-y-1 hover:border-primary/50 hover:bg-accent hover:shadow-lg active:translate-y-0 active:scale-95"
          >
            <InitialsAvatar
              name={profile.full_name}
              className="size-14 text-lg transition-transform duration-150 group-hover:scale-110"
            />
            <span className="text-sm font-medium">{profile.full_name}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent>
        <button
          type="button"
          onClick={reset}
          className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver
        </button>

        <div className="mb-4 flex flex-col items-center gap-2">
          <InitialsAvatar name={selected.full_name} className="size-12 text-base" />
          <p className="font-medium">{selected.full_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <Label htmlFor="pin">
              {selected.hasPassword ? "PIN" : "Creá tu PIN (4 dígitos)"}
            </Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              required
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value))}
              className="w-28 text-center text-2xl tracking-[0.6em]"
            />
          </div>

          {!selected.hasPassword ? (
            <div className="flex flex-col items-center gap-2">
              <Label htmlFor="confirmPin">Confirmar PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                required
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(onlyDigits(e.target.value))}
                className="w-28 text-center text-2xl tracking-[0.6em]"
              />
            </div>
          ) : null}

          {error ? (
            <p className="text-center text-sm text-destructive">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? "Un momento..."
              : selected.hasPassword
                ? "Ingresar"
                : "Crear PIN y entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
