import { z } from 'zod';

export const requestKinds = ['MATERIAL', 'FERRAMENTA'] as const;
export const requestUnits = ['unidade', 'caixa', 'metro', 'saco', 'litro', 'outro'] as const;
export const requestStatuses = ['NOVO', 'EM_ANALISE', 'APROVADO', 'RECUSADO', 'ENTREGUE'] as const;

const quantity = z.string().regex(/^\d{1,5}(?:[.,]\d{1,3})?$/).transform((value) => Number(value.replace(',', '.'))).pipe(z.number().positive().max(10000));
const date = z.iso.date();

export const supplyRequestSchema = z.object({
  requesterName: z.string().trim().min(2).max(160),
  workSite: z.string().trim().min(2).max(160),
  kind: z.enum(requestKinds),
  itemName: z.string().trim().min(2).max(160),
  quantity,
  unit: z.enum(requestUnits),
  neededOn: date,
  priority: z.enum(['NORMAL', 'URGENTE']),
  notes: z.string().trim().max(1000),
  startedAt: z.coerce.number().int().positive(),
  website: z.string().max(0),
});

export function parseSupplyRequest(form: FormData, now = Date.now()) {
  const parsed = supplyRequestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return null;
  const elapsed = now - parsed.data.startedAt;
  return elapsed >= 4_000 && elapsed <= 86_400_000 ? parsed.data : null;
}
