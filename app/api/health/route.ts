import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export function GET() {
  // Liveness não consulta nem expõe dados da base de dados.
  return NextResponse.json({ status: 'ok', databaseConfigured: Boolean(getSupabaseAdmin()) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
