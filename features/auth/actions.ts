'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/server';
import { getIdentity } from '@/lib/auth/session';
const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) });
export type LoginState = { error: string | null };
export async function signIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const result = loginSchema.safeParse({ email: form.get('email'), password: form.get('password') });
  if (!result.success) return { error: 'Verifique o email e a palavra-passe.' };
  const db = await getSupabase();
  if (!db) return { error: 'O acesso ainda não está configurado.' };
  try {
    const { error } = await db.auth.signInWithPassword(result.data);
    if (error) return { error: 'Não foi possível iniciar sessão. Verifique os dados de acesso.' };
  } catch { return { error: 'Serviço temporariamente indisponível. Tente novamente.' }; }
  const identity = await getIdentity();
  if (!identity) { await db.auth.signOut(); return { error: 'A conta não tem acesso ativo. Contacte o administrador.' }; }
  redirect(identity.role === 'CLIENTE' ? '/cliente' : '/crm');
}
export async function signOut() {
  const db = await getSupabase();
  if (db) await db.auth.signOut();
  redirect('/login');
}
