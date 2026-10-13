'use server';
import { headers } from 'next/headers';
import { processQuote, type QuoteState } from './intake';

export type { QuoteState } from './intake';

export async function submitQuote(
  _previous: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  const requestHeaders = await headers();
  const source =
    requestHeaders.get('cf-connecting-ip') ??
    requestHeaders.get('x-real-ip') ??
    'unknown';
  const result = await processQuote(formData, source);
  if (result.status !== 'unavailable') return result;

  const endpoint = process.env.QUOTE_INTAKE_URL;
  if (!endpoint)
    return {
      status: 'error',
      message: 'O envio ainda não está disponível. Tente novamente mais tarde.',
    };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('intake unavailable');
    return (await response.json()) as QuoteState;
  } catch {
    return {
      status: 'error',
      message: 'O envio ainda não está disponível. Tente novamente mais tarde.',
    };
  }
}
