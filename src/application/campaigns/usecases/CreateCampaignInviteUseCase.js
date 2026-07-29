import mongoose from "mongoose";

import BrandInvite from "../../../models/BrandInvite.js";
import Notification from "../../../models/Notification.js";
import { NotFoundError, ValidationError } from "../../../shared/errors/AppError.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";

export class CreateCampaignInviteUseCase extends UseCase {
  constructor({ campaignRepository, influencerProfileRepository }) {
    super();
    this.campaignRepository = campaignRepository;
    this.influencerProfileRepository = influencerProfileRepository;
  }

  async execute({ campaignId, body = {}, user }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ValidationError("Valid campaignId is required");
    }

    if (!["brand", "agency"].includes(user.role)) {
      throw new ValidationError("Only brand or agency accounts can invite creators");
    }

    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    const influencerProfileId = body.influencerProfileId;
    if (!mongoose.Types.ObjectId.isValid(influencerProfileId)) {
      throw new ValidationError("Valid influencerProfileId is required");
    }

    const influencerProfile =
      await this.influencerProfileRepository.findOneByQuery({
        _id: influencerProfileId,
      });

    if (!influencerProfile) {
      throw new NotFoundError("Influencer profile not found");
    }

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    const invite = await BrandInvite.create({
      influencerProfileId: influencerProfile._id,
      influencerUserId: influencerProfile.userId,
      influencerMobile: influencerProfile.mobile,
      brandUserId: user.userId,
      brandMobile: user.mobile,
      campaignId: campaign._id,
      message,
      status: "pending",
    });

    if (influencerProfile.userId) {
      await Notification.create({
        userId: influencerProfile.userId,
        role: "influencer",
        title: "New brand invite",
        body: message || `${campaign.brandName || "A brand"} invited you to a campaign`,
        type: "campaign_invite",
        targetId: String(campaign._id),
        metadata: {
          inviteId: String(invite._id),
          campaignId: String(campaign._id),
          brandUserId: String(user.userId),
        },
      });
    }

    return { invite };
  }
}
