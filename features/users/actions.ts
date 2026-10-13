'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { roles } from '@/lib/auth/permissions';
import { requirePermission } from '@/lib/auth/session';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function adminContext() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Administração de utilizadores indisponível neste servidor.');
  return admin;
}

export async function createUser(form: FormData) {
  const identity = await requirePermission('settings');
  const input = z.object({
    full_name: z.string().trim().min(2).max(200),
    email: z.email().max(254),
    password: z.string().min(10).max(128),
    role: z.enum(roles),
  }).parse(Object.fromEntries(form));
  const admin = adminContext();
  if (admin.companyId !== identity.companyId) throw new Error('Empresa inválida.');
  const { data, error } = await admin.db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? 'Não foi possível criar o utilizador.');
  const profile = await admin.db.from('profiles').insert({
    id: data.user.id,
    company_id: identity.companyId,
    full_name: input.full_name,
    role: input.role,
    active: true,
  });
  if (profile.error) {
    await admin.db.auth.admin.deleteUser(data.user.id);
    throw new Error('Não foi possível atribuir o perfil ao utilizador.');
  }
  revalidatePath('/crm/configuracoes');
}

export async function updateUser(form: FormData) {
  const identity = await requirePermission('settings');
  const input = z.object({
    id: z.uuid(),
    full_name: z.string().trim().min(2).max(200),
    email: z.email().max(254),
    role: z.enum(roles),
    new_password: z.union([z.string().min(10).max(128), z.literal('')]),
  }).parse(Object.fromEntries(form));
  const active = form.get('active') === 'on';
  if (input.id === identity.id && (!active || input.role !== 'ADMIN'))
    throw new Error('Não pode remover o seu próprio acesso administrativo.');
  const admin = adminContext();
  const { data: target } = await admin.db.from('profiles').select('id').eq('id', input.id).eq('company_id', identity.companyId).single();
  if (!target) throw new Error('Utilizador não encontrado.');
  const authChanges: { email: string; email_confirm: boolean; password?: string } = { email: input.email, email_confirm: true };
  if (input.new_password) authChanges.password = input.new_password;
  const authResult = await admin.db.auth.admin.updateUserById(input.id, authChanges);
  if (authResult.error) throw new Error('Não foi possível atualizar o acesso do utilizador.');
  const { error } = await admin.db.from('profiles').update({ full_name: input.full_name, role: input.role, active, updated_at: new Date().toISOString() }).eq('id', input.id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível atualizar o perfil do utilizador.');
  revalidatePath('/crm/configuracoes');
}

export async function removeUserAccess(form: FormData) {
  const identity = await requirePermission('settings');
  const id = z.uuid().parse(form.get('id'));
  if (id === identity.id) throw new Error('Não pode remover o seu próprio acesso.');
  const admin = adminContext();
  const { error } = await admin.db.from('profiles').update({ active: false, updated_at: new Date().toISOString() }).eq('id', id).eq('company_id', identity.companyId);
  if (error) throw new Error('Não foi possível remover o acesso.');
  revalidatePath('/crm/configuracoes');
}
