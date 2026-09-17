import assert from "node:assert/strict";
import test from "node:test";
import { CreateCampaignUseCase } from "../src/application/campaigns/usecases/CreateCampaignUseCase.js";

const useCase = new CreateCampaignUseCase({
  campaignRepository: { create: async (data) => data },
  profileRepository: { findOwnerProfile: async () => ({ brandName: "Brand" }) },
});
const user = { role: "brand", userId: "owner", mobile: "+910000000000" };
const base = { title: "Launch", category: "Fashion", budgetAmount: 5000, applicationDeadline: "2030-01-01" };

test("campaign persists schedule, terms and special instructions", async () => {
  const { campaign } = await useCase.execute({ user, body: { ...base, startDate: "2030-01-02", endDate: "2030-01-09", terms: "30-day usage rights", instructions: "Use #launch" } });
  assert.equal(campaign.startDate.toISOString().slice(0, 10), "2030-01-02");
  assert.equal(campaign.endDate.toISOString().slice(0, 10), "2030-01-09");
  assert.equal(campaign.termsAndConditions, "30-day usage rights");
  assert.equal(campaign.specialInstructions, "Use #launch");
});

test("campaign rejects missing or invalid schedule", async () => {
  await assert.rejects(useCase.execute({ user, body: base }), { statusCode: 400 });
  await assert.rejects(useCase.execute({ user, body: { ...base, startDate: "2030-01-10", endDate: "2030-01-02" } }), { statusCode: 400 });
  await assert.rejects(useCase.execute({ user, body: { ...base, applicationDeadline: "2030-01-05", startDate: "2030-01-02", endDate: "2030-01-10" } }), { statusCode: 400 });
});
