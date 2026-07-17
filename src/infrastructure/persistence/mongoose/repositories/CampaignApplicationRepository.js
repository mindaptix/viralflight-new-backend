import CampaignApplication from "../../../../models/CampaignApplication.js";

export class CampaignApplicationRepository {
  async findByCampaignAndUser(campaignId, userId) {
    return CampaignApplication.findOne({
      campaignId,
      influencerUserId: userId,
    });
  }

  async findById(id) {
    return CampaignApplication.findById(id);
  }

  async create(data) {
    return CampaignApplication.create(data);
  }

  async findByInfluencer(userId) {
    return CampaignApplication.find({ influencerUserId: userId }).sort({
      createdAt: -1,
    });
  }

  async findByCampaign(campaignId) {
    return CampaignApplication.find({ campaignId }).sort({ createdAt: -1 });
  }

  async save(application) {
    return application.save();
  }
}
