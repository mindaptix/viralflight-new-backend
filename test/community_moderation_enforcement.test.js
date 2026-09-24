import test from 'node:test';
import assert from 'node:assert/strict';
import CommunityMembership from '../src/models/CommunityMembership.js';
import CommunityModerationIncident from '../src/models/CommunityModerationIncident.js';
import { moderateCommunityMessage } from '../src/application/chat/communityModerationService.js';

const context = {
  communityId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439012',
  conversationId: '507f1f77bcf86cd799439013',
};

test('first detected abusive message is blocked and membership suspended', async (t) => {
  let saved = false;
  let incident;
  const membership = { moderationStrikes: 1, isJoined: true, save: async () => { saved = true; } };
  t.mock.method(CommunityMembership, 'findOne', async () => ({ isBanned: false }));
  t.mock.method(CommunityMembership, 'findOneAndUpdate', async () => membership);
  t.mock.method(CommunityModerationIncident, 'create', async (value) => { incident = value; });
  await assert.rejects(moderateCommunityMessage({ ...context, text: 'you are a b1tch' }), /suspended/);
  assert.equal(membership.isBanned, true);
  assert.equal(membership.isJoined, false);
  assert.equal(saved, true);
  assert.equal(incident.action, 'community_ban');
});

test('banned members cannot send even harmless messages', async (t) => {
  t.mock.method(CommunityMembership, 'findOne', async () => ({ isBanned: true }));
  await assert.rejects(moderateCommunityMessage({ ...context, text: 'hello' }), /banned/);
});
