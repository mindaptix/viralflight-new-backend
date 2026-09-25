import test from 'node:test';
import assert from 'node:assert/strict';
import { scanCommunityTopics, sanitizeTopics } from '../src/application/community/communityAiService.js';
import { communityRecommendationScore } from '../src/application/community/categoryRecommendations.js';
import { encryptToken } from '../src/infrastructure/external/meta/MetaGraphService.js';

const setup = (t) => {
  const keys = ['COMMUNITY_AI_API_KEY', 'COMMUNITY_AI_MODEL', 'GROQ_API_KEY', 'GROQ_MODEL', 'JWT_SECRET'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_MODEL;
  Object.assign(process.env, { COMMUNITY_AI_API_KEY: 'test-key', COMMUNITY_AI_MODEL: 'gemini', JWT_SECRET: 'test-encryption-secret' });
  t.after(() => keys.forEach((key) => {
    if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }));
};
const profile = { bio: 'I create parenting content', contentCategories: ['Motherhood'], mobile: 'do-not-send', name: 'private-name' };
const success = (topics) => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ topics }) } }] }) });

test('no data leaves the service without explicit consent', async (t) => {
  setup(t);
  let calls = 0;
  await assert.rejects(scanCommunityTopics({ profile, allowedTopics: ['Parenting'], consent: false, fetchImpl: async () => { calls++; } }), /Consent/);
  assert.equal(calls, 0);
});

test('missing provider configuration does not make network requests', async (t) => {
  setup(t);
  delete process.env.COMMUNITY_AI_API_KEY;
  await assert.rejects(scanCommunityTopics({ profile, allowedTopics: ['Parenting'], consent: true, fetchImpl: () => assert.fail('unexpected network') }), /not configured/);
});

test('profile-only scan sends only approved fields and filters invented topics', async (t) => {
  setup(t);
  let body;
  const result = await scanCommunityTopics({ profile, allowedTopics: ['Parenting'], consent: true, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    body = JSON.parse(options.body);
    return success(['parenting', 'Parenting', 'invented-topic']);
  } });
  assert.equal(body.model, 'openai/gpt-oss-20b');
  assert.equal(body.response_format.type, 'json_object');
  assert.deepEqual(JSON.parse(body.messages[1].content).profile, { bio: profile.bio, categories: ['Motherhood'] });
  assert.equal(body.messages[1].content.includes('do-not-send'), false);
  assert.equal(body.messages[1].content.includes('private-name'), false);
  assert.deepEqual(result.topics, ['Parenting']);
  assert.equal(result.contentSource, 'profile');
  assert.equal('captions' in result, false);
});

test('Instagram captions are bounded and the token is never sent to Groq', async (t) => {
  setup(t);
  const connected = { ...profile, instagram: { isConnected: true, token: encryptToken('instagram-secret-token') } };
  let calls = 0;
  const result = await scanCommunityTopics({ profile: connected, allowedTopics: ['Parenting'], consent: true, fetchImpl: async (url, options) => {
    calls++;
    if (new URL(url).hostname === 'graph.instagram.com') {
      assert.equal(options.headers.Authorization, 'Bearer instagram-secret-token');
      assert.equal(new URL(url).searchParams.get('limit'), '12');
      return { ok: true, json: async () => ({ data: Array.from({ length: 20 }, () => ({ caption: 'x'.repeat(2000) })) }) };
    }
    assert.equal(options.body.includes('instagram-secret-token'), false);
    const input = JSON.parse(JSON.parse(options.body).messages[1].content);
    assert.equal(input.captions.length, 12);
    assert.equal(input.captions[0].length, 1000);
    return success(['Parenting']);
  } });
  assert.equal(calls, 2);
  assert.equal(result.contentSource, 'profile_and_captions');
});

test('failed Instagram access falls back to profile-only input', async (t) => {
  setup(t);
  const connected = { ...profile, instagram: { isConnected: true, token: encryptToken('token') } };
  const result = await scanCommunityTopics({ profile: connected, allowedTopics: ['Parenting'], consent: true, fetchImpl: async (url, options) => {
    if (new URL(url).hostname === 'graph.instagram.com') throw new Error('Expired token');
    assert.deepEqual(JSON.parse(JSON.parse(options.body).messages[1].content).captions, []);
    return success(['Parenting']);
  } });
  assert.equal(result.contentSource, 'profile');
});

test('provider failure, refusal and incomplete JSON do not become successful scans', async (t) => {
  setup(t);
  for (const response of [
    { ok: false },
    { ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{"topics":[' } }] }) },
    { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '' } }] }) },
  ]) {
    await assert.rejects(scanCommunityTopics({ profile, allowedTopics: ['Parenting'], consent: true, fetchImpl: async () => response }), /AI analysis/);
  }
});

test('AI boosts only current matching topics, never stale scans', () => {
  const community = { category: 'Parenting' };
  const original = { contentCategories: [] };
  const enhanced = { ...original, communityRecommendations: { topics: ['Parenting'], scannedAt: new Date() } };
  assert.ok(communityRecommendationScore(community, enhanced) > communityRecommendationScore(community, original));
  enhanced.communityRecommendations.scannedAt = new Date(Date.now() - 31 * 86400000);
  assert.equal(communityRecommendationScore(community, enhanced), 0);
  assert.deepEqual(sanitizeTopics(['Unknown', null], ['Parenting']), []);
});
