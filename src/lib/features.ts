// Interruptores simples de módulos (principio 4 de CLAUDE.md). El schema ya
// soporta todos estos módulos; acá se controla si tienen UI habilitada.
// Cambiar un valor no requiere migraciones ni tocar el resto del código.
export const features = {
  clients: true,
  barbers: true,
  services: true,
  visits: true,

  // Próximo tramo:
  alerts: false,
  retail: false,
  tipsAndCommissions: false,
  loyalty: false,
  waitlist: false,
  notifications: false,
  branches: false,
} as const;

export type FeatureKey = keyof typeof features;
