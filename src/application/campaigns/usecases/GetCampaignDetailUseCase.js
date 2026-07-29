import mongoose from "mongoose";

import { toCampaignCard } from "../mappers/campaignMapper.js";
import { NotFoundError, ValidationError } from "../../../shared/errors/AppError.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";

export class GetCampaignDetailUseCase extends UseCase {
  constructor({ campaignRepository, influencerProfileRepository }) {
    super();
    this.campaignRepository = campaignRepository;
    this.influencerProfileRepository = influencerProfileRepository;
  }

  async execute({ campaignId, user }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ValidationError("Valid campaignId is required");
    }

    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    let influencerProfile = null;
    if (user?.role === "influencer") {
      influencerProfile = await this.influencerProfileRepository.findByUser(user);
    }

    return {
      campaign,
      campaignCard: toCampaignCard(campaign, influencerProfile),
    };
  }
}
