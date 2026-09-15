import test from 'node:test';
import assert from 'node:assert/strict';
import AgencyProfile from '../src/models/AgencyProfile.js';
import BrandProfile from '../src/models/BrandProfile.js';
import { withCampaignOwnerImages } from '../src/application/campaigns/mappers/campaignOwnerImages.js';
import { toCampaignCard } from '../src/application/campaigns/mappers/campaignMapper.js';
import { toDiscoveryCreatorDto } from '../src/application/discovery/mappers/discoveryMapper.js';

test('discovery prefers uploaded image with Instagram fallback', () => {
  const profile = { profileImageUrl: 'uploaded', instagram: { profilePictureUrl: 'instagram' } };
  assert.equal(toDiscoveryCreatorDto(profile).imageUrl, 'uploaded');
  assert.equal(toDiscoveryCreatorDto({ instagram: profile.instagram }).avatarUrl, 'instagram');
  assert.equal(toDiscoveryCreatorDto({}).imageUrl, '');
});

test('existing campaign photos resolve by owning role in batches without leaking profile data', async (t) => {
  let calls = 0;
  t.mock.method(AgencyProfile, 'find', () => {
    calls++;
    return { select: () => ({ lean: async () => [{ _id: 'agency-profile', userId: 'agency-user', profileImageUrl: 'agency.jpg', mobile: 'private' }] }) };
  });
  t.mock.method(BrandProfile, 'find', () => ({ select: () => ({ lean: async () => [{ _id: 'brand-profile', userId: 'brand-user', profileImageUrl: 'brand.jpg' }] }) }));
  const original = { ownerRole: 'agency', ownerUserId: 'agency-user', coverImageUrl: 'campaign.jpg' };
  const result = await withCampaignOwnerImages([
    original,
    { ownerRole: 'agency', agencyProfileId: 'agency-profile' },
    { ownerRole: 'brand', ownerProfileId: 'brand-profile' },
    { ownerRole: 'agency', ownerUserId: 'missing' },
  ]);
  assert.equal(calls, 1);
  assert.equal(result[0].brandLogoUrl, 'agency.jpg');
  assert.equal(result[0].coverImageUrl, 'campaign.jpg');
  assert.equal(result[1].ownerLogoUrl, 'agency.jpg');
  assert.equal(result[2].brandLogoUrl, 'brand.jpg');
  assert.equal(result[3].brandLogoUrl, '');
  assert.equal(result[0].mobile, undefined);
  assert.equal(original.brandLogoUrl, undefined);
  assert.equal(toCampaignCard(result[0]).brandLogoUrl, 'agency.jpg');
});
