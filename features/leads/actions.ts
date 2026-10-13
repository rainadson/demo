'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';

const statuses = [
  'NOVO',
  'CONTACTADO',
  'QUALIFICADO',
  'VISITA_AGENDADA',
  'VISITA_REALIZADA',
  'ORCAMENTO',
  'PROPOSTA_ENVIADA',
  'NEGOCIACAO',
  'GANHO',
  'PERDIDO',
] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null);

export async function createLead(formData: FormData) {
  const input = z.object({
    name: z.string().trim().min(2).max(200),
    phone: optionalText(40),
    email: z.union([z.email().max(254), z.literal('')]).transform((value) => value || null),
    service: z.string().trim().min(2).max(200),
    location: optionalText(300),
    priority: z.enum(['BAIXA', 'NORMAL', 'ALTA']),
    next_action: optionalText(300),
    next_action_at: z.union([z.iso.datetime({ local: true }), z.literal('')]).transform((value) => value || null),
    description: optionalText(3000),
  }).parse(Object.fromEntries(formData));
  const valueEntry = formData.get('estimated_value');
  const rawValue = (typeof valueEntry === 'string' ? valueEntry : '').trim().replace(',', '.');
  const estimatedValue = rawValue ? Number(rawValue) : 0;
  if (!Number.isFinite(estimatedValue) || estimatedValue < 0 || estimatedValue > 100_000_000)
    throw new Error('Valor estimado inválido.');

  const identity = await requirePermission('leads');
  const db = await getSupabase();
  if (!db) throw new Error('Supabase não configurado.');
  const { data, error } = await db.from('leads').insert({
    company_id: identity.companyId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    source: 'MANUAL',
    service: input.service,
    location: input.location,
    estimated_value_cents: Math.round(estimatedValue * 100),
    assigned_to: identity.id,
    priority: input.priority,
    next_action: input.next_action,
    next_action_at: input.next_action_at ? new Date(input.next_action_at).toISOString() : null,
    details: input.description ? { description: input.description } : {},
    created_by: identity.id,
  }).select('id').single();
  if (error || !data) throw new Error('Não foi possível criar o lead.');
  revalidatePath('/crm');
  revalidatePath('/crm/leads');
  redirect(`/crm/leads/${data.id}`);
}

export async function updateLead(formData: FormData) {
  const input = z.object({
    id: z.uuid(), name: z.string().trim().min(2).max(200), phone: optionalText(40),
    email: z.union([z.email().max(254), z.literal('')]).transform((value) => value || null),
    service: z.string().trim().min(2).max(200), location: optionalText(300),
    priority: z.enum(['BAIXA', 'NORMAL', 'ALTA']), next_action: optionalText(300),
    next_action_at: z.union([z.iso.datetime({ local: true }), z.literal('')]).transform((value) => value || null),
    description: optionalText(3000),
  }).parse(Object.fromEntries(formData));
  const valueEntry = formData.get('estimated_value');
  const rawValue = (typeof valueEntry === 'string' ? valueEntry : '').trim().replace(',', '.');
  const estimatedValue = rawValue ? Number(rawValue) : 0;
  if (!Number.isFinite(estimatedValue) || estimatedValue < 0 || estimatedValue > 100_000_000)
    throw new Error('Valor estimado inválido.');
  const identity = await requirePermission('leads');
  const db = await getSupabase();
  if (!db) throw new Error('Supabase não configurado.');
  const { id, description, next_action_at, ...values } = input;
  const { error } = await db.from('leads').update({
    ...values, estimated_value_cents: Math.round(estimatedValue * 100),
    next_action_at: next_action_at ? new Date(next_action_at).toISOString() : null,
    details: description ? { description } : {},
  }).eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar o lead.');
  revalidatePath('/crm'); revalidatePath('/crm/leads'); revalidatePath(`/crm/leads/${id}`);
}

export async function deleteLead(formData: FormData) {
  const id = z.uuid().parse(formData.get('id'));
  const identity = await requirePermission('leads');
  const db = await getSupabase();
  if (!db) throw new Error('Supabase não configurado.');
  const { error } = await db.from('leads').delete().eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Este lead possui visitas ou orçamentos associados e não pode ser excluído.');
  revalidatePath('/crm'); revalidatePath('/crm/leads'); redirect('/crm/leads');
}
export async function changeLeadStatus(formData: FormData) {
  const input = z
    .object({ leadId: z.uuid(), status: z.enum(statuses) })
    .parse({ leadId: formData.get('leadId'), status: formData.get('status') });
  const identity = await requirePermission('leads');
  const db = await getSupabase();
  if (!db) throw new Error('Supabase não configurado.');
  const { error } = await db
    .from('leads')
    .update({ status: input.status })
    .eq('id', input.leadId)
    .eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível alterar a etapa.');
  revalidatePath('/crm');
  revalidatePath('/crm/leads');
  revalidatePath(`/crm/leads/${input.leadId}`);
}
export async function addLeadNote(formData: FormData) {
  const input = z
    .object({ leadId: z.uuid(), body: z.string().trim().min(1).max(5000) })
    .parse({ leadId: formData.get('leadId'), body: formData.get('body') });
  const identity = await requirePermission('leads');
  const db = await getSupabase();
  if (!db) throw new Error('Supabase não configurado.');
  const { error } = await db
    .from('lead_activities')
    .insert({
      company_id: identity.companyId,
      lead_id: input.leadId,
      kind: 'NOTA',
      body: input.body,
      created_by: identity.id,
    });
  if (error) throw new Error('Não foi possível guardar a nota.');
  revalidatePath(`/crm/leads/${input.leadId}`);
}
