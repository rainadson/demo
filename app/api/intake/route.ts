import { NextResponse } from 'next/server';
import { processQuote } from '@/features/quote/intake';

export async function POST(request: Request) {
  try {
    const forwarded = request.headers
      .get('x-forwarded-for')
      ?.split(',')[0]
      ?.trim();
    const result = await processQuote(
      await request.formData(),
      forwarded ?? 'unknown',
    );
    if (result.status === 'unavailable')
      return NextResponse.json(
        { status: 'error', message: result.message },
        { status: 503 },
      );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Não foi possível receber o pedido.' },
      { status: 400 },
    );
  }
}
