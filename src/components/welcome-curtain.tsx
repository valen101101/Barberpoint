"use client";

import { useEffect } from "react";
import { Scissors } from "lucide-react";

// Overlay efímero (~800ms, ver la animación "curtain" en globals.css) que
// se muestra apenas se loguea alguien, antes de navegar a la app.
export function WelcomeCurtain({
  name,
  onDone,
}: {
  name: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="animate-curtain fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background">
      <Scissors className="size-7 text-primary" />
      <p className="font-heading text-3xl font-semibold tracking-tight">
        ¡Hola, {name}!
      </p>
    </div>
  );
}
