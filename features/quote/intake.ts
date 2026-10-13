import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { company } from '@/lib/config';

const quoteSchema = z.object({
  service: z.string().min(1).max(80),
  propertyType: z.string().min(1).max(80),
  location: z.string().min(2).max(160),
  area: z.string().max(40),
  description: z.string().min(20).max(3000),
  desiredDate: z.string().max(80),
  currentState: z.string().max(120),
  budgetBand: z.string().min(1).max(80),
  name: z.string().min(2).max(160),
  phone: z.string().min(6).max(40),
  email: z.email().max(254),
  contactPreference: z.enum(['telefone', 'email', 'whatsapp']),
  consent: z.literal('on'),
  startedAt: z.coerce.number().int().positive(),
  website: z.string().max(0),
});

export type QuoteState = {
  status: 'idle' | 'error' | 'success';
  message: string;
  reference?: string;
};
type InternalQuoteState =
  | QuoteState
  | { status: 'unavailable'; message: string };
const allowedMime = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

async function matchesMagic(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...values: number[]) =>
    values.every((value, index) => bytes[index] === value);
  if (file.type === 'image/jpeg') return starts(0xff, 0xd8, 0xff);
  if (file.type === 'image/png')
    return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (file.type === 'application/pdf')
    return starts(0x25, 0x50, 0x44, 0x46, 0x2d);
  if (file.type === 'image/webp')
    return (
      starts(0x52, 0x49, 0x46, 0x46) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  return false;
}

export async function processQuote(
  formData: FormData,
  source: string,
): Promise<InternalQuoteState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([key]) => key !== 'attachments'),
  );
  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success)
    return {
      status: 'error',
      message: 'Reveja os campos assinalados e tente novamente.',
    };
  if (Date.now() - parsed.data.startedAt < 4_000)
    return { status: 'error', message: 'Aguarde um momento antes de enviar.' };
  const files = formData
    .getAll('attachments')
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (
    files.length > 5 ||
    files.some(
      (file) =>
        file.size > 4_000_000 ||
        file.name.length > 255 ||
        !allowedMime.has(file.type),
    ) ||
    files.reduce((sum, file) => sum + file.size, 0) > 4_000_000 ||
    !(await Promise.all(files.map(matchesMagic))).every(Boolean)
  )
    return {
      status: 'error',
      message:
        'Envie até 5 ficheiros JPG, PNG, WebP ou PDF válidos, com 4 MB no total.',
    };
  const admin = getSupabaseAdmin();
  if (!admin)
    return {
      status: 'unavailable',
      message: 'O envio ainda não está disponível. Tente novamente mais tarde.',
    };
  const fingerprint = createHash('sha256')
    .update(
      `${admin.rateLimitSalt}:${source}:${parsed.data.email.toLowerCase()}`,
    )
    .digest('hex');
  const { data: allowed, error: limitError } = await admin.db.rpc(
    'register_lead_attempt',
    { request_key: fingerprint, allowed_attempts: 5 },
  );
  if (limitError || !allowed)
    return {
      status: 'error',
      message: 'Foram enviados vários pedidos. Tente novamente amanhã.',
    };
  const reference = `${company.quoteReferencePrefix}-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const { data: lead, error } = await admin.db
    .from('leads')
    .insert({
      company_id: admin.companyId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email.toLowerCase(),
      source: 'WEBSITE',
      service: parsed.data.service,
      location: parsed.data.location,
      consent_at: new Date().toISOString(),
      consent_version: company.consentVersion,
      details: {
        reference,
        propertyType: parsed.data.propertyType,
        area: parsed.data.area,
        description: parsed.data.description,
        desiredDate: parsed.data.desiredDate,
        currentState: parsed.data.currentState,
        budgetBand: parsed.data.budgetBand,
        contactPreference: parsed.data.contactPreference,
      },
    })
    .select('id')
    .single();
  if (error || !lead)
    return {
      status: 'error',
      message: 'Não foi possível guardar o pedido. Tente novamente.',
    };
  for (const file of files) {
    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${admin.companyId}/${lead.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.db.storage
      .from('lead-attachments')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError)
      return {
        status: 'success',
        message:
          `A ${company.shortName} recebeu o seu pedido, mas não foi possível guardar um dos anexos. Confirmaremos consigo a informação em falta.`,
        reference,
      };
    const { error: attachmentError } = await admin.db
      .from('lead_attachments')
      .insert({
        company_id: admin.companyId,
        lead_id: lead.id,
        storage_path: path,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });
    if (attachmentError) {
      await admin.db.storage.from('lead-attachments').remove([path]);
      return {
        status: 'success',
        message:
          `A ${company.shortName} recebeu o seu pedido, mas não foi possível guardar um dos anexos. Confirmaremos consigo a informação em falta.`,
        reference,
      };
    }
  }
  return {
    status: 'success',
    message:
      `Obrigado por apresentar o seu projeto à ${company.shortName}. Vamos analisar as suas necessidades e entrar em contacto para esclarecer os próximos passos.`,
    reference,
  };
}
