import AgencyProfile from "../../../../models/AgencyProfile.js";

export class AgencyProfileRepository {
  async findByUser(user) {
    return AgencyProfile.findOne({
      $or: [{ userId: user.userId }, { mobile: user.mobile }],
    });
  }

  async search({ query, limit = 30 }) {
    return AgencyProfile.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit);
  }
}
