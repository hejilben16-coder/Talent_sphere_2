import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRole } from './rbac.ts';

test('allows admins to access admin-only routes', () => {
  const result = authorizeRole({ role: 'admin' } as any, ['admin']);
  assert.equal(result.allowed, true);
});

test('denies students from accessing admin-only routes', () => {
  const result = authorizeRole({ role: 'student' } as any, ['admin']);
  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 403);
  assert.match(result.message || '', /admin/i);
});

test('allows students to access student-specific routes', () => {
  const result = authorizeRole({ role: 'student' } as any, ['student']);
  assert.equal(result.allowed, true);
});
