'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { processSupplyRequest, type SupplyRequestState } from './intake';
import { requestStatuses } from './validation';

export async function submitSupplyRequest(_previous: SupplyRequestState, form: FormData): Promise<SupplyRequestState> {
  const requestHeaders = await headers();
  const source = requestHeaders.get('cf-connecting-ip') ?? requestHeaders.get('x-real-ip') ?? 'unknown';
  const result = await processSupplyRequest(form, source);
  if (result.status !== 'unavailable') return result;

  const backend = process.env.BACKEND_URL;
  if (!backend) return { status: 'error', message: 'O envio está temporariamente indisponível.' };
  try {
    const origin = new URL(backend);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/')
      throw new Error('Destino inválido');
    const response = await fetch(new URL('/api/supply-requests', origin), {
      method: 'POST', body: form, cache: 'no-store',
    });
    if (!response.ok) throw new Error('Destino indisponível');
    const remote = (await response.json()) as SupplyRequestState;
    if (remote.status === 'success' || remote.status === 'error') return remote;
  } catch { /* A resposta pública nunca revela detalhes da integração. */ }
  return { status: 'error', message: 'O envio está temporariamente indisponível. Tente novamente.' };
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(requestStatuses),
  managerNote: z.string().trim().max(1000),
});

export async function updateSupplyRequest(form: FormData) {
  const identity = await requirePermission('purchases');
  const parsed = statusSchema.safeParse({
    id: form.get('id'), status: form.get('status'), managerNote: form.get('manager_note'),
  });
  if (!parsed.success) throw new Error('Dados inválidos.');
  const db = await getSupabase();
  if (!db) throw new Error('Serviço indisponível.');
  const { data, error } = await db.from('supply_requests').update({
    status: parsed.data.status,
    manager_note: parsed.data.managerNote,
    reviewed_by: identity.id,
    reviewed_at: new Date().toISOString(),
  }).eq('company_id', identity.companyId).eq('id', parsed.data.id).select('id').single();
  if (error || !data) throw new Error('Não foi possível atualizar o pedido.');
  revalidatePath('/crm/pedidos-material');
}
