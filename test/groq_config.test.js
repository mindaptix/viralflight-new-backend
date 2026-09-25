import assert from 'node:assert/strict';
import test from 'node:test';
import { getGroqApiKey, getGroqModel } from '../src/application/ai/groqConfig.js';

test('existing community key works for Groq and legacy gemini model is ignored', (t) => {
  const keys = ['GROQ_API_KEY', 'GROQ_MODEL', 'COMMUNITY_AI_API_KEY', 'COMMUNITY_AI_MODEL'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  t.after(() => keys.forEach((key) => {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }));

  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_MODEL;
  process.env.COMMUNITY_AI_API_KEY = 'test-groq-key';
  process.env.COMMUNITY_AI_MODEL = 'gemini';
  assert.equal(getGroqApiKey(), 'test-groq-key');
  assert.equal(getGroqModel(), 'openai/gpt-oss-20b');
});
