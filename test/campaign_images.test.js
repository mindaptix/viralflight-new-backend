import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateCampaignUseCase } from '../src/application/campaigns/usecases/CreateCampaignUseCase.js';
const usecase = new CreateCampaignUseCase({campaignRepository: {create: async data => data}, profileRepository: {findOwnerProfile: async () => ({agencyName:'Agency'})}});
const body = {title:'Campaign', category:'Fashion', budgetAmount:100, status:'draft'};
const user = {role:'agency', userId:'owner'};
test('multiple images persist with cover and ownership', async () => {
  const {campaign} = await usecase.execute({body:{...body, coverImageUrl:'https://example.com/cover.jpg', imageUrls:['https://example.com/one.jpg','https://example.com/two.jpg']}, user});
  assert.equal(campaign.imageUrls.length, 2);
  assert.equal(campaign.coverImageUrl, 'https://example.com/cover.jpg');
  assert.equal(campaign.ownerUserId, 'owner');
});
test('first image becomes cover when cover is omitted; legacy requests work', async () => {
  const {campaign} = await usecase.execute({body:{...body, imageUrls:['https://example.com/one.jpg']}, user});
  assert.equal(campaign.coverImageUrl, campaign.imageUrls[0]);
  assert.deepEqual((await usecase.execute({body, user})).campaign.imageUrls, []);
});
test('invalid image payloads rejected', async () => {
  for (const imageUrls of ['bad', [null], ['file:///tmp/a.jpg'], Array(10).fill('https://example.com/a.jpg')]) {
    await assert.rejects(usecase.execute({body:{...body,imageUrls},user}), {statusCode:400});
  }
});
