import BrandInvite from "../../../../models/BrandInvite.js";
import Campaign from "../../../../models/Campaign.js";
import CampaignApplication from "../../../../models/CampaignApplication.js";
import Collaboration from "../../../../models/Collaboration.js";
import InfluencerProfileView from "../../../../models/InfluencerProfileView.js";

export class InfluencerDashboardRepository {
  async countProfileViews(match) {
    return InfluencerProfileView.countDocuments(match);
  }

  async countPendingBrandInvites(match) {
    return BrandInvite.countDocuments({
      ...match,
      status: "pending",
    });
  }

  async countActiveCollaborations(match) {
    return Collaboration.countDocuments({
      ...match,
      status: "active",
    });
  }

  async countWeeklyCollabs(match) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [collaborations, acceptedApplications] = await Promise.all([
      Collaboration.countDocuments({
        ...match,
        status: { $in: ["active", "completed"] },
        startedAt: { $gte: weekAgo },
      }),
      CampaignApplication.countDocuments({
        ...match,
        status: { $in: ["accepted", "shortlisted"] },
        updatedAt: { $gte: weekAgo },
      }),
    ]);
    return collaborations + acceptedApplications;
  }

  async getAverageCampaignPay(match, profile) {
    const applicationAverage = await CampaignApplication.aggregate([
      { $match: { ...match, proposedRate: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          averagePay: { $avg: "$proposedRate" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (applicationAverage[0]?.count > 0) {
      return Math.round(applicationAverage[0].averagePay || 0);
    }

    const campaignQuery = {
      status: { $in: ["active", "published"] },
      budgetAmount: { $gt: 0 },
    };
    const categories = profile?.contentCategories || profile?.niches || [];
    if (Array.isArray(categories) && categories.length > 0) {
      campaignQuery.$or = [
        { category: { $in: categories } },
        { targetNiches: { $in: categories } },
      ];
    }

    const campaignAverage = await Campaign.aggregate([
      { $match: campaignQuery },
      {
        $group: {
          _id: null,
          averagePay: { $avg: "$budgetAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return Math.round(campaignAverage[0]?.averagePay || 0);
  }

  async upsertProfileView({ influencerProfile, viewer }) {
    return InfluencerProfileView.findOneAndUpdate(
      {
        influencerProfileId: influencerProfile._id,
        viewerUserId: viewer.userId,
      },
      {
        influencerProfileId: influencerProfile._id,
        influencerUserId: influencerProfile.userId,
        influencerMobile: influencerProfile.mobile,
        viewerUserId: viewer.userId,
        viewerMobile: viewer.mobile,
        viewerRole: viewer.role,
        lastViewedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }
}
