import test from 'node:test';
import assert from 'node:assert/strict';
import { toPublicCreatorProfile } from '../src/application/profiles/mappers/roleProfileMapper.js';

test('public platforms use OAuth connection records and include YouTube without manual entry', () => {
  const result = toPublicCreatorProfile({ platforms: [{ platform: 'instagram', username: 'manual' }] }, [
    { platform: 'instagram', handle: 'connected', isConnected: true, followers: 100 },
    { platform: 'youtube', channelName: 'Channel', isConnected: true, followers: 200, accessToken: 'secret' },
  ]);
  assert.equal(result.platforms.length, 2);
  assert.ok(result.platforms.every(p => p.isConnected));
  assert.equal(result.platforms[1].username, 'Channel');
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('legacy Instagram is connected but explicit disconnection takes precedence', () => {
  const profile = { instagram: { isConnected: true, handle: 'creator' }, platforms: [] };
  assert.equal(toPublicCreatorProfile(profile).platforms[0].isConnected, true);
  const result = toPublicCreatorProfile(profile, [{ platform: 'instagram', isConnected: false }]);
  assert.equal(result.platforms[0].isConnected, false);
});

test('manual handles do not imply a connected account', () => {
  const result = toPublicCreatorProfile({ platforms: [{ platform: 'youtube', username: 'manual' }] });
  assert.equal(result.platforms[0].isConnected, false);
});
