import { z } from 'zod';
const itemSchema = z.object({
  quantity: z.number().positive().max(1000000),
  materialCents: z.number().int().nonnegative(),
  labourCents: z.number().int().nonnegative(),
  otherCents: z.number().int().nonnegative(),
  markupPercent: z.number().min(0).max(10000),
  vatPercent: z.number().min(0).max(100),
});
export type QuoteItem = z.infer<typeof itemSchema>;
function money(value: number): number {
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded))
    throw new Error('Valor monetário fora do limite.');
  return rounded;
}
export function calculateQuote(items: QuoteItem[]) {
  const lines = items.map((value) => {
    const item = itemSchema.parse(value);
    const unitCost = money(
      item.materialCents + item.labourCents + item.otherCents,
    );
    const unitPrice = money(unitCost * (1 + item.markupPercent / 100));
    const cost = money(unitCost * item.quantity);
    const net = money(unitPrice * item.quantity);
    const vat = money((net * item.vatPercent) / 100);
    return { unitPrice, cost, net, vat, gross: money(net + vat) };
  });
  const sum = (field: 'cost' | 'net' | 'vat' | 'gross') =>
    money(lines.reduce((total, line) => total + line[field], 0));
  const cost = sum('cost'),
    net = sum('net'),
    vat = sum('vat'),
    gross = sum('gross');
  return {
    lines,
    cost,
    net,
    vat,
    gross,
    marginCents: net - cost,
    marginPercent: net === 0 ? 0 : ((net - cost) / net) * 100,
  };
}
export function projectMargin(
  contractedCents: number,
  actualCostsCents: number[],
) {
  z.number().int().nonnegative().parse(contractedCents);
  actualCostsCents.forEach((cost) =>
    z.number().int().nonnegative().parse(cost),
  );
  const cost = money(actualCostsCents.reduce((a, b) => a + b, 0));
  return {
    cost,
    marginCents: contractedCents - cost,
    marginPercent:
      contractedCents === 0
        ? null
        : ((contractedCents - cost) / contractedCents) * 100,
  };
}

export function projectFinancialSnapshot(input: {
  contractedCents: number;
  estimatedCostCents: number;
  expenseCents: number[];
  scheduledCents: number[];
  paymentCents: number[];
}) {
  const values = [
    input.contractedCents,
    input.estimatedCostCents,
    ...input.expenseCents,
    ...input.scheduledCents,
    ...input.paymentCents,
  ];
  values.forEach((value) => z.number().int().nonnegative().parse(value));
  const actualCostCents = money(
    input.expenseCents.reduce((total, value) => total + value, 0),
  );
  const scheduledCents = money(
    input.scheduledCents.reduce((total, value) => total + value, 0),
  );
  const receivedCents = money(
    input.paymentCents.reduce((total, value) => total + value, 0),
  );
  const currentMarginCents = money(input.contractedCents - actualCostCents);
  return {
    actualCostCents,
    scheduledCents,
    receivedCents,
    receivableCents: money(Math.max(0, scheduledCents - receivedCents)),
    budgetVarianceCents: money(input.estimatedCostCents - actualCostCents),
    currentMarginCents,
    currentMarginPercent:
      input.contractedCents === 0
        ? null
        : (currentMarginCents / input.contractedCents) * 100,
    collectionPercent:
      scheduledCents === 0
        ? 0
        : Math.min(100, (receivedCents / scheduledCents) * 100),
  };
}
