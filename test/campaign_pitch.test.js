import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePitch } from '../src/application/campaigns/generatePitch.js';

test('pitch generation sends only bounded campaign details and returns editable text', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_MODEL = 'test-model';
  try {
    const campaign = {
      title: 'Skin care launch', category: 'Beauty', description: 'Show the routine',
      brandName: 'Example Brand', deliverables: ['One reel'],
    };
    const pitch = await generatePitch({ campaign, fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'test-model');
      assert.deepEqual(JSON.parse(body.messages[1].content).brief, {
        title: 'Skin care launch', brand: 'Example Brand', category: 'Beauty',
        description: 'Show the routine', deliverables: ['One reel'],
      });
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Here is my campaign pitch.' } }] }) };
    } });
    assert.equal(pitch, 'Here is my campaign pitch.');
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = previousModel;
  }
});

test('pitch generation reports provider timeouts promptly', async () => {
  const previous = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'test-key';
  try {
    await assert.rejects(
      generatePitch({ campaign: { title: 'Campaign' }, fetchImpl: async () => {
        throw new DOMException('Timed out', 'TimeoutError');
      } }),
      { statusCode: 504, message: 'AI pitch generation timed out. Please try again.' },
    );
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  }
});

test('GPT-OSS pitch generation leaves room for reasoning and reports rejected configuration', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
  try {
    await assert.rejects(
      generatePitch({ campaign: { title: 'Campaign' }, fetchImpl: async (_url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.reasoning_effort, 'low');
        assert.equal(body.max_completion_tokens, 800);
        return { ok: false, status: 400 };
      } }),
      { statusCode: 503, message: 'AI pitch model configuration was rejected. Contact support.' },
    );
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = previousModel;
  }
});
