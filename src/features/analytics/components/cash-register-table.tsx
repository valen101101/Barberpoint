import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PAYMENT_METHODS_ORDER,
  type BarberPaymentBreakdown,
} from "@/features/analytics/aggregate";
import { PAYMENT_METHOD_LABELS } from "@/features/visits/constants";
import { priceFormatter } from "@/lib/format";
import type { PaymentMethod } from "@/types/database";

// "Cierre de caja": cuánto generó cada barbero, desglosado por efectivo,
// transferencia, etc. — para poder controlar cada uno por separado.
export function CashRegisterTable({ rows }: { rows: BarberPaymentBreakdown[] }) {
  const totalsByMethod: Record<PaymentMethod, number> = {
    cash: 0,
    transfer: 0,
    card: 0,
    other: 0,
  };
  let totalCount = 0;
  let grandTotal = 0;

  for (const row of rows) {
    totalCount += row.count;
    grandTotal += row.total;
    for (const method of PAYMENT_METHODS_ORDER) {
      totalsByMethod[method] += row.byMethod[method];
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Barbero</TableHead>
          <TableHead className="text-right">Cortes</TableHead>
          {PAYMENT_METHODS_ORDER.map((method) => (
            <TableHead key={method} className="text-right">
              {PAYMENT_METHOD_LABELS[method]}
            </TableHead>
          ))}
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.barberId}>
            <TableCell className="font-medium">{row.barberLabel}</TableCell>
            <TableCell className="text-right text-muted-foreground">
              {row.count}
            </TableCell>
            {PAYMENT_METHODS_ORDER.map((method) => (
              <TableCell key={method} className="text-right text-muted-foreground">
                {row.byMethod[method] > 0
                  ? priceFormatter.format(row.byMethod[method])
                  : "—"}
              </TableCell>
            ))}
            <TableCell className="text-right font-medium text-primary">
              {priceFormatter.format(row.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell className="text-right">{totalCount}</TableCell>
          {PAYMENT_METHODS_ORDER.map((method) => (
            <TableCell key={method} className="text-right">
              {priceFormatter.format(totalsByMethod[method])}
            </TableCell>
          ))}
          <TableCell className="text-right text-primary">
            {priceFormatter.format(grandTotal)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
