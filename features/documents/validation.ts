export const documentKinds = [
  'ORCAMENTO',
  'CONTRATO',
  'PLANTA',
  'FATURA',
  'RECIBO',
  'FOTOGRAFIA',
  'LICENCA',
  'RELATORIO',
  'OUTRO',
] as const;

export const documentKindLabels: Record<(typeof documentKinds)[number], string> = {
  ORCAMENTO: 'Orçamento',
  CONTRATO: 'Contrato',
  PLANTA: 'Planta',
  FATURA: 'Fatura',
  RECIBO: 'Recibo',
  FOTOGRAFIA: 'Fotografia',
  LICENCA: 'Licença',
  RELATORIO: 'Relatório',
  OUTRO: 'Outro',
};

export const documentMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const signatures: Record<(typeof documentMimeTypes)[number], number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

export async function validDocument(file: File) {
  if (!documentMimeTypes.includes(file.type as (typeof documentMimeTypes)[number]) ||
      file.size < 1 || file.size > 10_000_000) return false;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'image/webp') {
    return signatures['image/webp'].every((byte, index) => bytes[index] === byte) &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return signatures[file.type as (typeof documentMimeTypes)[number]]
    .every((byte, index) => bytes[index] === byte);
}

export function documentExtension(mimeType: string) {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  throw new Error('Tipo de documento inválido.');
}
