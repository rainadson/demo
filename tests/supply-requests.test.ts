import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSupplyRequest } from '../features/supply-requests/validation.ts';

const now = Date.parse('2026-09-22T12:00:00Z');
function request(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    requesterName: 'João Silva', workSite: 'Obra Centro',
    kind: 'MATERIAL', itemName: 'Cimento', quantity: '2.5', unit: 'saco',
    neededOn: '2026-09-23', priority: 'NORMAL', notes: '',
    startedAt: String(now - 5000), website: '', ...overrides,
  })) form.set(key, value);
  return form;
}

void test('accepts a complete employee material request', () => {
  const parsed = parseSupplyRequest(request(), now);
  assert.equal(parsed?.quantity, 2.5);
  assert.equal(parsed?.kind, 'MATERIAL');
});

void test('rejects bot fields, premature submissions and invalid quantities', () => {
  assert.equal(parseSupplyRequest(request({ website: 'spam' }), now), null);
  assert.equal(parseSupplyRequest(request({ startedAt: String(now - 1000) }), now), null);
  assert.equal(parseSupplyRequest(request({ quantity: '0' }), now), null);
  assert.equal(parseSupplyRequest(request({ quantity: '1e9' }), now), null);
});

void test('rejects unrecognized type and malformed date', () => {
  assert.equal(parseSupplyRequest(request({ kind: 'COMPRA' }), now), null);
  assert.equal(parseSupplyRequest(request({ neededOn: 'amanhã' }), now), null);
});
