import Campaign from "../../../../models/Campaign.js";

export class CampaignRepository {
  async deleteOwned(campaign) {
    return Campaign.findOneAndUpdate(
      { _id: campaign._id, ownerUserId: campaign.ownerUserId, ownerRole: "agency", deletedAt: null },
      { $set: { deletedAt: new Date() } }, { new: true, runValidators: true }
    );
  }

  async updateStatus(campaign, status) {
    return Campaign.findOneAndUpdate(
      { _id: campaign._id, ownerUserId: campaign.ownerUserId, ownerRole: campaign.ownerRole, status: campaign.status, deletedAt: null },
      { $set: { status } }, { new: true, runValidators: true }
    );
  }

  async create(data) {
    return Campaign.create(data);
  }

  async findById(id) {
    return Campaign.findById(id);
  }

  async findByIds(ids) {
    return Campaign.find({ _id: { $in: ids } });
  }

  async findBrandCampaigns(userId) {
    return Campaign.find({
      $or: [{ brandUserId: userId }, { ownerRole: "brand", ownerUserId: userId }],
    }).sort({ createdAt: -1 });
  }

  async findAgencyCampaigns(userId) {
    return Campaign.find({
      $or: [
        { agencyUserId: userId },
        { ownerRole: "agency", ownerUserId: userId },
      ],
    }).sort({ createdAt: -1 });
  }

  _activeForInfluencerFilter(now = new Date()) {
    return {
      status: "active",
      deletedAt: null,
      $or: [
        { applicationDeadline: { $exists: false } },
        { applicationDeadline: null },
        { applicationDeadline: { $gte: now } },
      ],
    };
  }

  async findActiveForInfluencer({ limit = 10, skip = 0, now = new Date() }) {
    return Campaign.find(this._activeForInfluencerFilter(now))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async countActiveForInfluencer({ now = new Date() } = {}) {
    return Campaign.countDocuments(this._activeForInfluencerFilter(now));
  }

  async softDeleteAgencyOwned({ campaignId, agencyUserId }) {
    return Campaign.findOneAndUpdate(
      {
        _id: campaignId,
        ownerRole: "agency",
        ownerUserId: agencyUserId,
        deletedAt: null,
      },
      { $set: { deletedAt: new Date() } },
      { new: true, runValidators: true }
    );
  }
}
