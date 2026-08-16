import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProvider, getDefaultModel } from './llmProvider.ts';

test('prefers an explicitly configured provider', () => {
  process.env.LLM_PROVIDER = 'groq';
  assert.equal(resolveProvider(), 'groq');

  process.env.LLM_PROVIDER = 'gemini';
  assert.equal(resolveProvider(), 'gemini');
});

test('falls back to groq when only a groq API key is present', () => {
  delete process.env.LLM_PROVIDER;
  process.env.GROQ_API_KEY = 'test-groq-key';
  delete process.env.GEMINI_API_KEY;

  assert.equal(resolveProvider(), 'groq');
  assert.equal(getDefaultModel(), 'llama-3.1-8b-instant');
});
