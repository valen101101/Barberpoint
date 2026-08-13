import type { VisitWithDetails } from "@/features/visits/queries";
import { PAYMENT_METHOD_LABELS } from "@/features/visits/constants";
import type { PaymentMethod } from "@/types/database";

export const PAYMENT_METHODS_ORDER: PaymentMethod[] = [
  "cash",
  "transfer",
  "card",
  "other",
];

export type DailyTotal = {
  date: string;
  count: number;
  revenue: number;
};

export function groupByDate(visits: VisitWithDetails[]): DailyTotal[] {
  const byDate = new Map<string, DailyTotal>();

  for (const visit of visits) {
    const existing = byDate.get(visit.visit_date);
    if (existing) {
      existing.count += 1;
      existing.revenue += visit.price_charged;
    } else {
      byDate.set(visit.visit_date, {
        date: visit.visit_date,
        count: 1,
        revenue: visit.price_charged,
      });
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export type BreakdownItem = {
  key: string;
  label: string;
  count: number;
  revenue: number;
};

function groupBy(
  visits: VisitWithDetails[],
  keyOf: (visit: VisitWithDetails) => string,
  labelOf: (visit: VisitWithDetails) => string,
): BreakdownItem[] {
  const byKey = new Map<string, BreakdownItem>();

  for (const visit of visits) {
    const key = keyOf(visit);
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      existing.revenue += visit.price_charged;
    } else {
      byKey.set(key, {
        key,
        label: labelOf(visit),
        count: 1,
        revenue: visit.price_charged,
      });
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.revenue - a.revenue);
}

export function groupByPaymentMethod(visits: VisitWithDetails[]): BreakdownItem[] {
  return groupBy(
    visits,
    (v) => v.payment_method,
    (v) => PAYMENT_METHOD_LABELS[v.payment_method],
  );
}

export function groupByBarber(visits: VisitWithDetails[]): BreakdownItem[] {
  return groupBy(
    visits,
    (v) => v.barber_id,
    (v) => v.barber?.full_name ?? "Barbero eliminado",
  );
}

export function groupByService(visits: VisitWithDetails[]): BreakdownItem[] {
  return groupBy(
    visits,
    (v) => v.service_id,
    (v) => v.service?.name ?? "Servicio eliminado",
  );
}

export function totalRevenue(visits: VisitWithDetails[]): number {
  return visits.reduce((sum, v) => sum + v.price_charged, 0);
}

// Para el "cierre de caja": cuánto generó cada barbero, desglosado por
// forma de pago. Permite controlar por separado el efectivo y las
// transferencias de cada uno.
export type BarberPaymentBreakdown = {
  barberId: string;
  barberLabel: string;
  count: number;
  byMethod: Record<PaymentMethod, number>;
  total: number;
};

export function groupByBarberAndPaymentMethod(
  visits: VisitWithDetails[],
): BarberPaymentBreakdown[] {
  const byBarber = new Map<string, BarberPaymentBreakdown>();

  for (const visit of visits) {
    let entry = byBarber.get(visit.barber_id);
    if (!entry) {
      entry = {
        barberId: visit.barber_id,
        barberLabel: visit.barber?.full_name ?? "Barbero eliminado",
        count: 0,
        byMethod: { cash: 0, transfer: 0, card: 0, other: 0 },
        total: 0,
      };
      byBarber.set(visit.barber_id, entry);
    }
    entry.count += 1;
    entry.byMethod[visit.payment_method] += visit.price_charged;
    entry.total += visit.price_charged;
  }

  return Array.from(byBarber.values()).sort((a, b) => b.total - a.total);
}
