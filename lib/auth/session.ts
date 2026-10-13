import { redirect } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/server';
import { isRole, canAccess, type Identity, type Resource } from './permissions';
export async function getIdentity(): Promise<Identity | null> {
  const db = await getSupabase();
  if (!db) return null;
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await db.from('profiles').select('id,company_id,role,full_name').eq('id', user.id).eq('active', true).single();
  if (!profile || !isRole(profile.role)) return null;
  return { id: user.id, companyId: profile.company_id, role: profile.role, fullName: profile.full_name };
}
export async function requireIdentity(portal: 'crm' | 'cliente') {
  const identity = await getIdentity();
  if (!identity) redirect('/login');
  if (portal === 'crm' && identity.role === 'CLIENTE') redirect('/cliente');
  if (portal === 'cliente' && identity.role !== 'CLIENTE') redirect('/crm');
  return identity;
}
export async function requirePermission(resource: Resource) {
  const identity = await requireIdentity('crm');
  if (!canAccess(identity.role, resource)) throw new Error('Acesso não autorizado.');
  return identity;
}
