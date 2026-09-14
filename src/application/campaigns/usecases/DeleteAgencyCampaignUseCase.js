import mongoose from "mongoose";

import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/AppError.js";

/** Soft-deletes an agency-owned campaign. */
export class DeleteAgencyCampaignUseCase {
  constructor({ campaignRepository }) {
    this.campaignRepository = campaignRepository;
  }

  async execute({ campaignId, agencyUserId }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ValidationError("Valid campaignId is required");
    }

    const result = await this.campaignRepository.deleteOwned({
      campaignId,
      agencyUserId,
    });
    if (result.deletedCount === 1) {
      return;
    }

    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    throw new ForbiddenError(
      "Only the agency that created this campaign can delete it"
    );
  }
}
