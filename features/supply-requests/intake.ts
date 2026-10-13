import { createHash, randomUUID } from 'node:crypto';
import { company } from '@/lib/config';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { parseSupplyRequest } from './validation';

export type SupplyRequestState = {
  status: 'idle' | 'error' | 'success' | 'unavailable';
  message: string;
  reference?: string;
};

export async function processSupplyRequest(form: FormData, source: string): Promise<SupplyRequestState> {
  const request = parseSupplyRequest(form);
  if (!request) return { status: 'error', message: 'Verifique os campos e tente novamente.' };
  const admin = getSupabaseAdmin();
  if (!admin) return { status: 'unavailable', message: 'O envio está temporariamente indisponível.' };

  const fingerprint = createHash('sha256')
    .update(`${admin.rateLimitSalt}:supply:${source}:${request.requesterName.toLowerCase()}:${request.workSite.toLowerCase()}`)
    .digest('hex');
  try {
    const { data: allowed, error: limitError } = await admin.db.rpc('register_lead_attempt', {
      request_key: fingerprint,
      allowed_attempts: 5,
    });
    if (limitError || !allowed)
      return { status: 'error', message: 'Limite diário de pedidos atingido. Contacte o gestor se for urgente.' };

    const reference = `AR-MAT-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const { error } = await admin.db.from('supply_requests').insert({
      company_id: admin.companyId,
      reference,
      requester_name: request.requesterName,
      work_site: request.workSite,
      kind: request.kind,
      item_name: request.itemName,
      quantity: request.quantity,
      unit: request.unit,
      needed_on: request.neededOn,
      priority: request.priority,
      notes: request.notes,
    });
    if (error) return { status: 'error', message: 'Não foi possível guardar o pedido. Tente novamente.' };
    return {
      status: 'success',
      message: `O pedido foi enviado ao gestor da ${company.shortName}. Guarde a referência para acompanhamento.`,
      reference,
    };
  } catch {
    return { status: 'error', message: 'O envio está temporariamente indisponível. Tente novamente.' };
  }
}
