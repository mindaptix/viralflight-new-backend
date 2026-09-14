import Campaign from "../../../../models/Campaign.js";

export class AgencyCampaignDeletionRepository {
  async deleteOwned({ campaignId, agencyUserId }) {
    return Campaign.deleteOne({
      _id: campaignId,
      ownerRole: "agency",
      ownerUserId: agencyUserId,
    });
  }

  async findById(campaignId) {
    return Campaign.findById(campaignId);
  }
}
