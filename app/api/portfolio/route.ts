import { NextResponse } from 'next/server';
import { readPortfolioFromDatabase } from '@/lib/portfolio';

export async function GET() {
  if (process.env.APP_ROLE !== 'backend')
    return NextResponse.json([], { status: 503 });
  return NextResponse.json(await readPortfolioFromDatabase(), {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
