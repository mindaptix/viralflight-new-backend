import mongoose from "mongoose";
import { campaignActions, campaignPermissions } from "../../../domain/campaigns/CampaignRules.js";
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from "../../../shared/errors/AppError.js";

export class ManageCampaignUseCase {
  constructor({ campaignRepository, reportRepository }) {
    this.campaignRepository = campaignRepository;
    this.reportRepository = reportRepository;
  }
  async execute({ campaignId, user, action, reason }) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) throw new ValidationError("Valid campaignId is required");
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw new NotFoundError("Campaign not found");
    const permissions = campaignPermissions(campaign, user);
    if (action === "report") {
      if (!permissions.canReport) throw new ForbiddenError("Only influencers and brands can report campaigns");
      if (!["Spam or misleading", "Inappropriate content", "Fake brand or scam", "Duplicate listing", "Other"].includes(reason)) {
        throw new ValidationError("Select a valid report reason");
      }
      await this.reportRepository.create({ campaignId, reporterUserId: user.userId, reason });
      return;
    }
    if (!permissions.isOwner || !["agency", "brand"].includes(user.role)) throw new ForbiddenError("Only the campaign owner can manage it");
    if (action === "delete") {
      if (user.role !== "agency") throw new ForbiddenError("Only the owning agency can delete through this endpoint");
      const deleted = await this.campaignRepository.deleteOwned(campaign);
      if (!deleted) throw new ConflictError("Campaign already deleted. Refresh and try again.");
      return;
    }
    if (!permissions.availableActions.includes(action)) throw new ConflictError("Action is not valid for the current campaign status. Refresh and try again.");
    const updated = await this.campaignRepository.updateStatus(campaign, campaignActions[campaign.status][action]);
    if (!updated) throw new ConflictError("Campaign changed. Refresh and try again.");
    return updated;
  }
}
