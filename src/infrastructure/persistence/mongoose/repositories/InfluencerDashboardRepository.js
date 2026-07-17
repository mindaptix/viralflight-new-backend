import BrandInvite from "../../../../models/BrandInvite.js";
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
