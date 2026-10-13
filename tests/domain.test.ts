import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateQuote,
  projectFinancialSnapshot,
  projectMargin,
} from '../lib/domain/money.ts';
import {
  canAccess,
  canAccessAssigned,
  isRole,
  roles,
  resources,
} from '../lib/auth/permissions.ts';
const item = {
  quantity: 2,
  materialCents: 10000,
  labourCents: 5000,
  otherCents: 0,
  markupPercent: 20,
  vatPercent: 23,
};
void test('quote uses cents, quantity, markup, tax and margin on sale price', () => {
  const q = calculateQuote([item]);
  assert.equal(q.cost, 30000);
  assert.equal(q.net, 36000);
  assert.equal(q.vat, 8280);
  assert.equal(q.gross, 44280);
  assert.equal(q.marginCents, 6000);
  assert.ok(Math.abs(q.marginPercent - 16.6666667) < 0.00001);
});
void test('VAT is configured per line, including zero', () => {
  const q = calculateQuote([
    { ...item, vatPercent: 0 },
    { ...item, vatPercent: 6 },
  ]);
  assert.equal(q.vat, 2160);
});
void test('fractional quantities round each line to cents', () => {
  const q = calculateQuote([
    {
      ...item,
      quantity: 1.5,
      materialCents: 101,
      labourCents: 0,
      markupPercent: 0,
    },
  ]);
  assert.equal(q.net, 152);
  assert.equal(q.vat, 35);
  assert.equal(q.gross, 187);
});
void test('invalid quantities, rates, nonfinite and unsafe totals are rejected', () => {
  for (const patch of [
    { quantity: -1 },
    { vatPercent: 101 },
    { materialCents: 1.2 },
    { quantity: NaN },
    { labourCents: Infinity },
    { materialCents: Number.MAX_SAFE_INTEGER },
  ])
    assert.throws(() => calculateQuote([{ ...item, ...patch }]));
});
void test('empty quote and zero revenue do not produce NaN', () => {
  assert.equal(calculateQuote([]).gross, 0);
  assert.equal(calculateQuote([]).marginPercent, 0);
  assert.equal(projectMargin(0, []).marginPercent, null);
});
void test('actual margin includes all costs and can be negative', () => {
  assert.equal(projectMargin(10000, [3000, 4000, 5000]).marginCents, -2000);
});
void test('project snapshot reconciles budget, costs and partial payments', () => {
  const result = projectFinancialSnapshot({
    contractedCents: 1000000,
    estimatedCostCents: 700000,
    expenseCents: [120000, 80000],
    scheduledCents: [300000, 700000],
    paymentCents: [300000, 100000],
  });
  assert.deepEqual(result, {
    actualCostCents: 200000,
    scheduledCents: 1000000,
    receivedCents: 400000,
    receivableCents: 600000,
    budgetVarianceCents: 500000,
    currentMarginCents: 800000,
    currentMarginPercent: 80,
    collectionPercent: 40,
  });
});
void test('project snapshot handles overpayment and zero contract safely', () => {
  const result = projectFinancialSnapshot({
    contractedCents: 0,
    estimatedCostCents: 0,
    expenseCents: [],
    scheduledCents: [100],
    paymentCents: [150],
  });
  assert.equal(result.receivableCents, 0);
  assert.equal(result.collectionPercent, 100);
  assert.equal(result.currentMarginPercent, null);
});
void test('admin has all permissions and client has no internal permissions', () => {
  for (const resource of resources) {
    assert.equal(canAccess('ADMIN', resource), true);
    assert.equal(canAccess('CLIENTE', resource), false);
  }
});
void test('commercial cannot see financial or operational data', () => {
  assert.equal(canAccess('COMERCIAL', 'leads'), true);
  assert.equal(canAccess('COMERCIAL', 'finance'), false);
  assert.equal(canAccess('COMERCIAL', 'projects'), false);
});
void test('collaborators must have explicit project assignment', () => {
  assert.equal(canAccessAssigned('COLABORADOR', 'projects', false), false);
  assert.equal(canAccessAssigned('COLABORADOR', 'projects', true), true);
  assert.equal(canAccessAssigned('COLABORADOR', 'finance', true), false);
});
void test('untrusted role values are rejected', () => {
  for (const value of ['admin', 'OWNER', '', null, {}, 1])
    assert.equal(isRole(value), false);
  for (const role of roles) assert.equal(isRole(role), true);
});
