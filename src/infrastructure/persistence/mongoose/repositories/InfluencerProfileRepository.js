import InfluencerProfile from "../../../../models/InfluencerProfile.js";

export class InfluencerProfileRepository {
  async findByUser(user) {
    return InfluencerProfile.findOne({
      $or: [{ userId: user.userId }, { mobile: user.mobile }],
    });
  }

  async search({ query, limit = 30 }) {
    return InfluencerProfile.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit);
  }
}
