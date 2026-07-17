import Campaign from "../../models/Campaign.js";

export class CampaignRepository {
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

  async findActiveForInfluencer({ limit = 10, now = new Date() }) {
    return Campaign.find({
      status: "active",
      $or: [
        { applicationDeadline: { $exists: false } },
        { applicationDeadline: null },
        { applicationDeadline: { $gte: now } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
