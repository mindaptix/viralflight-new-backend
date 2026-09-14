import assert from "node:assert/strict";
import test from "node:test";

import { DeleteAgencyCampaignUseCase } from "../src/application/campaigns/usecases/DeleteAgencyCampaignUseCase.js";

const campaignId = "507f1f77bcf86cd799439011";
const agencyId = "507f191e810c19729de860ea";
const otherAgencyId = "507f191e810c19729de860eb";

function setup({ deletedCount = 0, existing = null } = {}) {
  const writes = [];
  const campaignRepository = {
    deleteOwned: async (input) => {
      writes.push(input);
      return { deletedCount };
    },
    findById: async () => existing,
  };
  return {
    writes,
    useCase: new DeleteAgencyCampaignUseCase({ campaignRepository }),
  };
}

test("deletes only the campaign owned by the authenticated agency", async () => {
  const { useCase, writes } = setup({ deletedCount: 1 });

  await useCase.execute({ campaignId, agencyUserId: agencyId });
  assert.deepEqual(writes, [{ campaignId, agencyUserId: agencyId }]);
});

test("rejects deletion attempts by another agency", async () => {
  const { useCase, writes } = setup({
    existing: { _id: campaignId, ownerRole: "agency", ownerUserId: agencyId },
  });

  await assert.rejects(
    useCase.execute({ campaignId, agencyUserId: otherAgencyId }),
    { statusCode: 403 }
  );
  assert.deepEqual(writes, [{ campaignId, agencyUserId: otherAgencyId }]);
});

test("returns not found for a missing campaign and validates its id", async () => {
  const { useCase } = setup();

  await assert.rejects(
    useCase.execute({ campaignId, agencyUserId: agencyId }),
    { statusCode: 404 }
  );
  await assert.rejects(
    useCase.execute({ campaignId: "invalid", agencyUserId: agencyId }),
    { statusCode: 400 }
  );
});
