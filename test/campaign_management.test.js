import test from 'node:test';
import assert from 'node:assert/strict';
import { ManageCampaignUseCase } from '../src/application/campaigns/usecases/ManageCampaignUseCase.js';
import { campaignPermissions, campaignActions } from '../src/domain/campaigns/CampaignRules.js';
const id = '507f1f77bcf86cd799439011';
const owner = { userId: id, role: 'agency' };
const campaign = { _id: id, ownerUserId: id, ownerRole: 'agency', status: 'active' };
function setup(value = campaign, concurrent = false) {
  const writes = [];
  return { writes, usecase: new ManageCampaignUseCase({
    campaignRepository: { findById: async () => value, updateStatus: async (c, status) => { writes.push(status); return concurrent ? null : {...c, status}; } },
    reportRepository: { create: async (report) => writes.push(report) },
  }) };
}
test('only actual agency owner receives management actions', () => {
  assert.deepEqual(campaignPermissions(campaign, owner).availableActions, ['draft', 'pause', 'close']);
  for (const user of [{ ...owner, userId: 'other' }, {...owner, role: 'brand'}, {...owner, role: 'influencer'}, {}]) {
    assert.deepEqual(campaignPermissions(campaign, user).availableActions, []);
  }
  assert.equal(campaignPermissions(campaign, owner).canReport, false);
});
test('all valid transitions persist expected status', async () => {
  for (const [status, actions] of Object.entries(campaignActions)) {
    for (const [action, expected] of Object.entries(actions)) {
      const {usecase, writes} = setup({...campaign, status});
      assert.equal((await usecase.execute({campaignId: id, user: owner, action})).status, expected);
      assert.deepEqual(writes, [expected]);
    }
  }
});
test('invalid transitions, foreign owners, wrong roles and concurrent writes fail', async () => {
  for (const user of [{...owner, userId: 'other'}, {...owner, role: 'brand'}, {...owner, role: 'influencer'}]) {
    const {usecase, writes} = setup();
    await assert.rejects(usecase.execute({campaignId: id, user, action: 'pause'}), {statusCode: 403});
    assert.deepEqual(writes, []);
  }
  await assert.rejects(setup().usecase.execute({campaignId: id, user: owner, action: 'publish'}), {statusCode: 409});
  await assert.rejects(setup({...campaign, status: 'archived'}).usecase.execute({campaignId: id, user: owner, action: 'publish'}), {statusCode: 409});
  await assert.rejects(setup(campaign, true).usecase.execute({campaignId: id, user: owner, action: 'pause'}), {statusCode: 409});
});
test('reports persist for brands and influencers and reject agencies or invalid reasons', async () => {
  for (const role of ['brand', 'influencer']) {
    const {usecase, writes} = setup();
    await usecase.execute({campaignId: id, user: {...owner, role}, action: 'report', reason: 'Other'});
    assert.equal(writes[0].reporterUserId, id);
  }
  await assert.rejects(setup().usecase.execute({campaignId: id, user: owner, action: 'report', reason: 'Other'}), {statusCode: 403});
  await assert.rejects(setup().usecase.execute({campaignId: id, user: {...owner, role:'brand'}, action: 'report', reason: ''}), {statusCode: 400});
});
test('missing and invalid campaign IDs fail', async () => {
  await assert.rejects(setup().usecase.execute({campaignId: 'bad', user: owner, action: 'pause'}), {statusCode: 400});
  await assert.rejects(setup(null).usecase.execute({campaignId: id, user: owner, action: 'pause'}), {statusCode: 404});
});
test('delete is restricted to owning agency and handles missing campaign', async () => {
  let deleted = false;
  const usecase = new ManageCampaignUseCase({campaignRepository: {
    findById: async () => campaign,
    deleteOwned: async () => { deleted = true; return campaign; },
  }});
  for (const user of [{...owner,userId:'other'}, {...owner,role:'brand'}, {...owner,role:'influencer'}]) {
    await assert.rejects(usecase.execute({campaignId:id,user,action:'delete'}), {statusCode:403});
    assert.equal(deleted, false);
  }
  await usecase.execute({campaignId:id,user:owner,action:'delete'});
  assert.equal(deleted, true);
  await assert.rejects(setup(null).usecase.execute({campaignId:id,user:owner,action:'delete'}), {statusCode:404});
});
