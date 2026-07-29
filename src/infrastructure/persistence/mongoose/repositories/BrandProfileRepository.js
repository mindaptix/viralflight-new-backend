import BrandProfile from "../../../../models/BrandProfile.js";

export class BrandProfileRepository {
  async findByUser(user) {
    return BrandProfile.findOne({
      $or: [{ userId: user.userId }, { mobile: user.mobile }],
    });
  }

  async search({ query, limit = 30 }) {
    return BrandProfile.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit);
  }
}
