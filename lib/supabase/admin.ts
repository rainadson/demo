import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const adminSchema = z.object({
  url: z.url(),
  serviceKey: z.string().min(20),
  companyId: z.uuid(),
  rateLimitSalt: z.string().min(24),
});

export function getSupabaseAdmin() {
  const parsed = adminSchema.safeParse({
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    companyId: process.env.ALICERCE_COMPANY_ID,
    rateLimitSalt: process.env.LEAD_RATE_LIMIT_SALT,
  });
  if (!parsed.success) return null;
  return {
    companyId: parsed.data.companyId,
    rateLimitSalt: parsed.data.rateLimitSalt,
    db: createClient(parsed.data.url, parsed.data.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}
