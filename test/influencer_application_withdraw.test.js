import assert from "node:assert/strict";
import test from "node:test";

import { WithdrawApplicationUseCase } from "../src/application/applications/usecases/CampaignApplicationUseCases.js";

const influencerId = "507f191e810c19729de860ea";

function setup(application) {
  let saves = 0;
  const useCase = new WithdrawApplicationUseCase({
    campaignApplicationRepository: {
      findById: async () => application,
      save: async () => { saves += 1; },
    },
  });
  return { useCase, saves: () => saves };
}

test("influencer can withdraw their applied or shortlisted application", async () => {
  for (const status of ["applied", "shortlisted"]) {
    const application = { _id: "app", influencerUserId: influencerId, status };
    const { useCase, saves } = setup(application);
    const result = await useCase.execute({
      applicationId: "app",
      user: { userId: influencerId, role: "influencer" },
    });
    assert.equal(result.application.status, "withdrawn");
    assert.equal(saves(), 1);
  }
});

test("withdraw rejects another influencer and terminal statuses", async () => {
  const foreign = setup({ _id: "app", influencerUserId: influencerId, status: "applied" });
  await assert.rejects(
    foreign.useCase.execute({ applicationId: "app", user: { userId: "other" } }),
    { statusCode: 403 },
  );
  assert.equal(foreign.saves(), 0);

  for (const status of ["accepted", "rejected", "withdrawn"]) {
    const current = setup({ _id: "app", influencerUserId: influencerId, status });
    await assert.rejects(
      current.useCase.execute({ applicationId: "app", user: { userId: influencerId } }),
      { statusCode: 409 },
    );
    assert.equal(current.saves(), 0);
  }
});
