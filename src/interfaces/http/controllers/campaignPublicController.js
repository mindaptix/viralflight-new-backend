import { container } from "../../../di/container.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

export const getCampaignDetail = asyncHandler(async (req, res) => {
  const { campaign, campaignCard } = await container.getCampaignDetailUseCase.execute({
    campaignId: req.params.campaignId,
    user: req.user,
  });

  sendSuccess(res, {
    message: "Campaign fetched successfully",
    campaign,
    campaignCard,
    data: campaign,
  });
});

export const createCampaignInvite = asyncHandler(async (req, res) => {
  const { invite } = await container.createCampaignInviteUseCase.execute({
    campaignId: req.params.campaignId,
    body: req.body,
    user: req.user,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: "Invite sent successfully",
    invite,
  });
});
