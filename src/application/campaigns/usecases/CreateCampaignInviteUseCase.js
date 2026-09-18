import mongoose from "mongoose";

import BrandInvite from "../../../models/BrandInvite.js";
import Notification from "../../../models/Notification.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../../shared/errors/AppError.js";
import { isCampaignOwner } from "../../../domain/campaigns/CampaignRules.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";
import { sendPushNotificationSafe } from "../../../infrastructure/notifications/pushNotificationService.js";

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
    if (!isCampaignOwner(campaign, user)) {
      throw new ForbiddenError("Only the campaign owner can invite creators");
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

    const existing = await BrandInvite.findOne({
      influencerProfileId: influencerProfile._id,
      campaignId: campaign._id,
      brandUserId: user.userId,
      status: { $in: ["pending", "accepted"] },
    });
    if (existing) {
      throw new ConflictError("This creator has already been invited to the campaign");
    }

    const invite = await BrandInvite.create({
      influencerProfileId: influencerProfile._id,
      influencerUserId: influencerProfile.userId,
      influencerMobile: influencerProfile.mobile,
      brandUserId: user.userId,
      brandMobile: user.mobile,
      ownerRole: user.role,
      campaignId: campaign._id,
      message,
      status: "pending",
    });

    if (influencerProfile.userId) {
      const notifTitle = "Campaign Invitation! 💌";
      const notifBody =
        message || `${campaign.brandName || "A brand"} invited you to "${campaign.title}"`;

      await Notification.create({
        userId: influencerProfile.userId,
        role: "influencer",
        title: notifTitle,
        body: notifBody,
        type: "campaign_invite",
        targetId: String(campaign._id),
        metadata: {
          inviteId: String(invite._id),
          campaignId: String(campaign._id),
          brandUserId: String(user.userId),
        },
      }).catch((err) => {
        console.error("Could not create in-app notification for campaign invite:", err.message);
      });

      sendPushNotificationSafe({
        userId: influencerProfile.userId,
        notification: {
          title: notifTitle,
          body: notifBody,
        },
        data: {
          type: "campaign_invite",
          campaignId: String(campaign._id),
          inviteId: String(invite._id),
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      });
    }

    return { invite };
  }
}
