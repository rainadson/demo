import { NextResponse } from 'next/server';
import { processSupplyRequest } from '@/features/supply-requests/intake';

export async function POST(request: Request) {
  if (process.env.APP_ROLE !== 'backend')
    return NextResponse.json({ status: 'error', message: 'Serviço indisponível.' }, { status: 503 });
  try {
    const source = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const result = await processSupplyRequest(await request.formData(), source);
    return NextResponse.json(result, {
      status: result.status === 'unavailable' ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Não foi possível receber o pedido.' }, { status: 400 });
  }
}
