import mongoose from "mongoose";

import { ConflictError, ValidationError } from "../../../shared/errors/AppError.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";

const formatCompactCount = (count) => {
  if (count >= 1000000) {
    return `${Number((count / 1000000).toFixed(1))}M`;
  }

  if (count >= 1000) {
    return `${Number((count / 1000).toFixed(1))}K`;
  }

  return String(count);
};

const formatCurrency = (amount, currency = "INR") => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return currency === "INR" ? "₹0" : "0";
  }
  if (currency === "INR") {
    if (value >= 100000) {
      return `₹${Number((value / 100000).toFixed(1))}L`;
    }
    if (value >= 1000) {
      return `₹${Number((value / 1000).toFixed(1))}K`;
    }
    return `₹${Math.round(value)}`;
  }
  return `${currency} ${Math.round(value)}`;
};

const buildInfluencerMatch = (profile, user) => ({
  $or: [
    { influencerProfileId: profile._id },
    { influencerUserId: user.userId },
    { influencerMobile: user.mobile },
  ],
});

const emptyStats = () => ({
  profile: null,
  stats: {
    profileViews: 0,
    brandInvites: 0,
    activeCollabs: 0,
  },
  statCards: [
    { key: "profileViews", label: "Profile views", value: 0, displayValue: "0" },
    { key: "brandInvites", label: "Brand invites", value: 0, displayValue: "0" },
    { key: "activeCollabs", label: "Active collabs", value: 0, displayValue: "0" },
  ],
});

export class GetInfluencerDashboardStatsUseCase extends UseCase {
  constructor({ influencerDashboardRepository, influencerProfileRepository }) {
    super();
    this.influencerDashboardRepository = influencerDashboardRepository;
    this.influencerProfileRepository = influencerProfileRepository;
  }

  async execute({ user }) {
    const profile = await this.influencerProfileRepository.findByUser(user);
    if (!profile) {
      return emptyStats();
    }

    const match = buildInfluencerMatch(profile, user);
    const [
      profileViews,
      brandInvites,
      activeCollabs,
      collabsThisWeek,
      avgCampaignPay,
    ] = await Promise.all([
      this.influencerDashboardRepository.countProfileViews(match),
      this.influencerDashboardRepository.countPendingBrandInvites(match),
      this.influencerDashboardRepository.countActiveCollaborations(match),
      this.influencerDashboardRepository.countWeeklyCollabs(match),
      this.influencerDashboardRepository.getAverageCampaignPay(match, profile),
    ]);

    const stats = {
      profileViews,
      brandInvites,
      activeCollabs,
      collabsThisWeek,
      avgCampaignPay,
    };

    return {
      profile,
      stats,
      statCards: [
        {
          key: "profileViews",
          label: "Profile views",
          value: profileViews,
          displayValue: formatCompactCount(profileViews),
        },
        {
          key: "brandInvites",
          label: "Brand invites",
          value: brandInvites,
          displayValue: formatCompactCount(brandInvites),
        },
        {
          key: "activeCollabs",
          label: "Active collabs",
          value: activeCollabs,
          displayValue: formatCompactCount(activeCollabs),
        },
        {
          key: "collabsThisWeek",
          label: "Collabs this week",
          value: collabsThisWeek,
          displayValue: formatCompactCount(collabsThisWeek),
          source: "campaign_applications+collaborations",
        },
        {
          key: "avgCampaignPay",
          label: "Avg. campaign pay",
          value: avgCampaignPay,
          displayValue: formatCurrency(avgCampaignPay),
          source: "campaign_applications_or_active_campaigns",
        },
      ],
    };
  }
}

export class RecordInfluencerProfileViewUseCase extends UseCase {
  constructor({ influencerDashboardRepository, influencerProfileRepository }) {
    super();
    this.influencerDashboardRepository = influencerDashboardRepository;
    this.influencerProfileRepository = influencerProfileRepository;
  }

  async execute({ body = {}, viewer }) {
    const query = [];

    if (mongoose.Types.ObjectId.isValid(body.influencerProfileId)) {
      query.push({ _id: body.influencerProfileId });
    }

    if (mongoose.Types.ObjectId.isValid(body.influencerUserId)) {
      query.push({ userId: body.influencerUserId });
    }

    if (typeof body.influencerMobile === "string" && body.influencerMobile.trim()) {
      query.push({ mobile: body.influencerMobile.trim() });
    }

    if (query.length === 0) {
      throw new ValidationError(
        "Valid influencerProfileId, influencerUserId, or influencerMobile is required"
      );
    }

    const influencerProfile =
      await this.influencerProfileRepository.findOneByQuery({ $or: query });

    if (!influencerProfile) {
      throw new ValidationError(
        "Valid influencerProfileId, influencerUserId, or influencerMobile is required"
      );
    }

    if (String(influencerProfile.userId) === String(viewer.userId)) {
      throw new ValidationError("Own profile view is not counted");
    }

    try {
      await this.influencerDashboardRepository.upsertProfileView({
        influencerProfile,
        viewer,
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new ConflictError("Influencer profile view already recorded");
      }
      throw error;
    }

    return { alreadyRecorded: false };
  }
}
