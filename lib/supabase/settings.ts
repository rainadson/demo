import { z } from 'zod';
const settingsSchema = z.object({ url: z.url(), key: z.string().min(20) });
export function supabaseSettings() {
  const parsed = settingsSchema.safeParse({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY });
  return parsed.success ? parsed.data : null;
}
