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
