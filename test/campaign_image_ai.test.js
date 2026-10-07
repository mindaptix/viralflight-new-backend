import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { analyzeCampaignImage } from '../src/application/campaigns/analyzeCampaignImage.js';

process.env.GROQ_API_KEY = 'test-key';
const buffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#ff0000' } }).png().toBuffer();

test('sends actual image bytes and returns validated campaign fields', async () => {
  const result = await analyzeCampaignImage({ buffer, fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.match(body.messages[0].content[1].image_url.url, /^data:image\/jpeg;base64,/);
    assert.equal(body.response_format.type, 'json_object');
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ title: '  Beauty launch  ', description: 'Showcase the visible product.', category: 'Beauty' }) } }] }) };
  } });
  assert.deepEqual(result, { title: 'Beauty launch', description: 'Showcase the visible product.', category: 'Beauty' });
});

test('rejects unsupported categories and malformed AI responses', async () => {
  for (const content of ['not json', JSON.stringify({ title: 'Test', description: 'Test', category: 'Invented' })]) {
    await assert.rejects(analyzeCampaignImage({ buffer, fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) }) }));
  }
});

test('rejects invalid image bytes before contacting provider', async () => {
  let called = false;
  await assert.rejects(analyzeCampaignImage({ buffer: Buffer.from('invalid'), fetchImpl: async () => { called = true; } }));
  assert.equal(called, false);
});

test('handles provider failures and missing configuration', async () => {
  await assert.rejects(analyzeCampaignImage({ buffer, fetchImpl: async () => ({ ok: false, status: 429 }) }), /busy/);
  const previous = process.env.GROQ_API_KEY;
  const fallback = process.env.COMMUNITY_AI_API_KEY;
  delete process.env.GROQ_API_KEY;
  delete process.env.COMMUNITY_AI_API_KEY;
  try { await assert.rejects(analyzeCampaignImage({ buffer }), /not configured/); }
  finally { process.env.GROQ_API_KEY = previous; if (fallback !== undefined) process.env.COMMUNITY_AI_API_KEY = fallback; }
});
