import assert from 'node:assert/strict';
import test from 'node:test';
import { generateBio } from '../src/application/profile/generateBio.js';

test('bio generation sends only approved fields with bounded values', async () => {
  const previous = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'test-key';
  try {
    const bio = await generateBio({
      input: {
        name: 'A Creator', categories: ['Lifestyle'], profession: 'Photographer',
        languages: ['English'], mobile: 'private-number', token: 'private-token',
      },
      fetchImpl: async (_url, options) => {
        const request = JSON.parse(options.body);
        assert.deepEqual(JSON.parse(request.messages[1].content), {
          creator: {
            name: 'A Creator', categories: ['Lifestyle'],
            profession: 'Photographer', languages: ['English'],
          },
        });
        return { ok: true, json: async () => ({ choices: [{ message: {
          content: 'I create lifestyle photography and stories for curious audiences.',
        } }] }) };
      },
    });
    assert.match(bio, /lifestyle photography/);
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  }
});

test('bio generation reports provider timeouts promptly', async () => {
  const previous = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'test-key';
  try {
    await assert.rejects(
      generateBio({ input: { name: 'Creator' }, fetchImpl: async () => {
        throw new DOMException('Timed out', 'TimeoutError');
      } }),
      { statusCode: 504, message: 'AI bio generation timed out. Please try again.' },
    );
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  }
});

test('GPT-OSS bio generation reserves room for its final answer', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
  try {
    const bio = await generateBio({
      input: { name: 'Vishal', categories: ['Fashion', 'Travel'] },
      fetchImpl: async (_url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.reasoning_effort, 'low');
        assert.equal(body.max_completion_tokens, 500);
        return { ok: true, json: async () => ({ choices: [{ message: {
          content: 'I share fashion and travel stories with my community.',
        } }] }) };
      },
    });
    assert.match(bio, /fashion and travel/);
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = previousModel;
  }
});

test('bio generation retries an empty reasoning-only response once', async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
  let calls = 0;
  try {
    const bio = await generateBio({
      input: { name: 'Vishal', categories: ['Travel'] },
      fetchImpl: async (_url, options) => {
        calls += 1;
        const body = JSON.parse(options.body);
        assert.equal(body.reasoning_format, 'hidden');
        assert.equal(body.max_completion_tokens, calls === 1 ? 500 : 1200);
        return { ok: true, json: async () => ({
          choices: [{ finish_reason: calls === 1 ? 'length' : 'stop', message: {
            content: calls === 1 ? '' : 'I share travel discoveries and stories with my community.',
          } }],
        }) };
      },
    });
    assert.equal(calls, 2);
    assert.match(bio, /travel discoveries/);
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = previousModel;
  }
});
