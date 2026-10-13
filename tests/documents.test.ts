import assert from 'node:assert/strict';
import test from 'node:test';
import { documentExtension, validDocument } from '../features/documents/validation.ts';

void test('accepts supported documents with matching binary signatures', async () => {
  const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'contrato.pdf', { type: 'application/pdf' });
  const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'planta.png', { type: 'image/png' });
  assert.equal(await validDocument(pdf), true);
  assert.equal(await validDocument(png), true);
  assert.equal(documentExtension(pdf.type), 'pdf');
  assert.equal(documentExtension(png.type), 'png');
});

void test('rejects mismatched, empty and oversized document uploads', async () => {
  const fakePdf = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'falso.pdf', { type: 'application/pdf' });
  const empty = new File([], 'vazio.pdf', { type: 'application/pdf' });
  const oversized = new File([new Uint8Array(10_000_001)], 'grande.pdf', { type: 'application/pdf' });
  assert.equal(await validDocument(fakePdf), false);
  assert.equal(await validDocument(empty), false);
  assert.equal(await validDocument(oversized), false);
});
