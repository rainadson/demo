import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseSettings } from './settings';
export async function getSupabase() {
  const settings = supabaseSettings();
  if (!settings) return null;
  const jar = await cookies();
  return createServerClient(settings.url, settings.key, {
    cookies: {
      getAll() { return jar.getAll(); },
      setAll(values) {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })); }
        catch { /* Server Components cannot write cookies; actions own session updates. */ }
      },
    },
  });
}
