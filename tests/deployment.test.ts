import assert from 'node:assert/strict';
import test from 'node:test';
import { backendRedirects } from '../lib/deployment.ts';

void test('standalone deployment keeps local authentication routes', () => {
  assert.deepEqual(backendRedirects(undefined), []);
  assert.deepEqual(backendRedirects('  '), []);
});

void test('frontend sends only reserved pages to the configured backend', () => {
  const redirects = backendRedirects('https://backend.example.com/');
  assert.deepEqual(redirects.map((item) => item.source), ['/login', '/crm/:path*', '/cliente/:path*']);
  assert.equal(redirects[1].destination, 'https://backend.example.com/crm/:path*');
  assert.ok(redirects.every((item) => !item.permanent));
});

void test('deployment rejects insecure or ambiguous backend destinations', () => {
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com/api', 'https://example.com?url=x', 'https://example.com#x', 'not-a-url']) {
    assert.throws(() => backendRedirects(url));
  }
});
