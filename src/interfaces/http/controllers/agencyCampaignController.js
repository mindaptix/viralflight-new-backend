import { DeleteAgencyCampaignUseCase } from "../../../application/campaigns/usecases/DeleteAgencyCampaignUseCase.js";
import { AgencyCampaignDeletionRepository } from "../../../infrastructure/persistence/mongoose/repositories/AgencyCampaignDeletionRepository.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

const deleteAgencyCampaignUseCase = new DeleteAgencyCampaignUseCase({
  campaignRepository: new AgencyCampaignDeletionRepository(),
});

export const deleteAgencyCampaign = asyncHandler(async (req, res) => {
  await deleteAgencyCampaignUseCase.execute({
    campaignId: req.params.campaignId,
    agencyUserId: req.user.userId,
  });

  sendSuccess(res, { message: "Campaign deleted successfully" });
});
