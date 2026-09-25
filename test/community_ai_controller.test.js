import test from 'node:test';
import assert from 'node:assert/strict';
import Community from '../src/models/Community.js';
import InfluencerProfile from '../src/models/InfluencerProfile.js';
import { scanRecommendations, clearRecommendations } from '../src/interfaces/http/controllers/communityAiController.js';

const request = { user: { userId: '507f1f77bcf86cd799439011' }, body: { consent: true } };
const invoke = (handler, req = request) => new Promise((resolve, reject) => {
  const res = { status: () => res, json: resolve };
  handler(req, res, reject);
});
const configure = (t) => {
  for (const key of ['COMMUNITY_AI_API_KEY', 'COMMUNITY_AI_MODEL']) {
    const previous = process.env[key];
    process.env[key] = 'test-only';
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
};

test('controller checks consent before accessing profile or taking a scan lease', async (t) => {
  t.mock.method(InfluencerProfile, 'findOneAndUpdate', () => assert.fail('unexpected profile access'));
  await assert.rejects(invoke(scanRecommendations, { ...request, body: {} }), /consent/);
});

test('concurrent scans or cooldown return 429 without exporting data', async (t) => {
  configure(t);
  t.mock.method(InfluencerProfile, 'findOneAndUpdate', () => ({ select: async () => null }));
  t.mock.method(InfluencerProfile, 'exists', async () => ({ _id: request.user.userId }));
  t.mock.method(globalThis, 'fetch', () => assert.fail('unexpected network'));
  await assert.rejects(invoke(scanRecommendations), (error) => error.statusCode === 429);
});

test('clearing suggestions during an active scan prevents results from being saved', async (t) => {
  configure(t);
  let lease;
  let saved = false;
  t.mock.method(InfluencerProfile, 'findOneAndUpdate', (query, update) => {
    assert.equal(query.userId, request.user.userId);
    assert.equal(query.$and.length, 2);
    lease = update.$set.communityAiScan.id;
    return { select: async () => ({ _id: request.user.userId, contentCategories: ['Parenting'], bio: '' }) };
  });
  t.mock.method(Community, 'find', () => ({ select: () => ({ lean: async () => [{ category: 'Parenting', tags: [] }] }) }));
  t.mock.method(InfluencerProfile, 'updateOne', async (query, update) => {
    if (query.userId) { lease = null; return { matchedCount: 1 }; }
    const matches = query['communityAiScan.id'] === lease;
    if (matches && update.$set?.communityRecommendations) saved = true;
    if (matches) lease = null;
    return { matchedCount: matches ? 1 : 0 };
  });
  let resolveFetch;
  let started;
  const fetchStarted = new Promise((resolve) => { started = resolve; });
  t.mock.method(globalThis, 'fetch', () => { started(); return new Promise((resolve) => { resolveFetch = resolve; }); });
  const scan = invoke(scanRecommendations);
  await fetchStarted;
  await invoke(clearRecommendations);
  resolveFetch({ ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"topics":["Parenting"]}' } }] }) });
  await assert.rejects(scan, /not saved/);
  assert.equal(saved, false);
});
