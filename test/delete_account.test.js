import test from 'node:test';
import assert from 'node:assert/strict';

import { deleteAccount } from '../src/application/auth/DeleteAccountService.js';
import AgencyProfile from '../src/models/AgencyProfile.js';
import BrandProfile from '../src/models/BrandProfile.js';
import Campaign from '../src/models/Campaign.js';
import InfluencerProfile from '../src/models/InfluencerProfile.js';
import User from '../src/models/User.js';

test('deleteAccount requires explicit confirmation', async () => {
  await assert.rejects(
    deleteAccount({ user: { userId: '507f1f77bcf86cd799439011' }, confirmed: false }),
    { statusCode: 400 }
  );
});

test('deleteAccount removes the matching profile and archives owned campaigns', async (t) => {
  const userId = '507f1f77bcf86cd799439011';
  const profileId = '507f1f77bcf86cd799439022';
  let archivedCampaignsQuery;
  let deletedProfileQuery;
  let deletedUserQuery;

  t.mock.method(User, 'findOne', async () => ({
    _id: userId,
    mobile: '+919999999999',
    role: 'agency',
  }));
  t.mock.method(AgencyProfile, 'find', () => ({
    select: () => ({ lean: async () => [{ _id: profileId }] }),
  }));
  t.mock.method(AgencyProfile, 'deleteMany', async (query) => {
    deletedProfileQuery = query;
    return { deletedCount: 1 };
  });
  t.mock.method(Campaign, 'updateMany', async (query) => {
    archivedCampaignsQuery = query;
    return { modifiedCount: 1 };
  });
  t.mock.method(User, 'deleteOne', async (query) => {
    deletedUserQuery = query;
    return { deletedCount: 1 };
  });

  const result = await deleteAccount({
    user: { userId, role: 'agency' },
    confirmed: true,
  });

  assert.equal(result.message, 'Account deleted successfully');
  assert.deepEqual(deletedUserQuery, { _id: userId });
  assert.equal(deletedProfileQuery.$or[0].userId, userId);
  assert.equal(archivedCampaignsQuery.$or.some((item) => item.ownerUserId === userId), true);
  assert.equal(archivedCampaignsQuery.$or.some((item) => item.agencyUserId === userId), true);
});

test('deleteAccount chooses the profile model by account role', async (t) => {
  const userId = '507f1f77bcf86cd799439011';
  let brandDeleted = false;
  let influencerDeleted = false;

  t.mock.method(Campaign, 'updateMany', async () => ({ modifiedCount: 0 }));
  t.mock.method(User, 'deleteOne', async () => ({ deletedCount: 1 }));
  t.mock.method(BrandProfile, 'find', () => ({ select: () => ({ lean: async () => [] }) }));
  t.mock.method(InfluencerProfile, 'find', () => ({ select: () => ({ lean: async () => [] }) }));
  t.mock.method(BrandProfile, 'deleteMany', async () => {
    brandDeleted = true;
    return { deletedCount: 1 };
  });
  t.mock.method(InfluencerProfile, 'deleteMany', async () => {
    influencerDeleted = true;
    return { deletedCount: 1 };
  });

  t.mock.method(User, 'findOne', async () => ({ _id: userId, role: 'brand' }));
  await deleteAccount({ user: { userId, role: 'brand' }, confirmed: true });
  assert.equal(brandDeleted, true);

  User.findOne.mock.mockImplementation(async () => ({ _id: userId, role: 'influencer' }));
  await deleteAccount({ user: { userId, role: 'influencer' }, confirmed: true });
  assert.equal(influencerDeleted, true);
});
