import AgencyProfile from "../../../../models/AgencyProfile.js";
import BrandProfile from "../../../../models/BrandProfile.js";
import InfluencerProfile from "../../../../models/InfluencerProfile.js";

const PROFILE_MODELS = {
  agency: AgencyProfile,
  brand: BrandProfile,
  influencer: InfluencerProfile,
};

export class ProfileRepository {
  async findOwnerProfile(user) {
    const Model = PROFILE_MODELS[user.role];
    if (!Model) return null;

    return Model.findOne({
      $or: [{ userId: user.userId }, { mobile: user.mobile }],
    });
  }

  async ensureRoleProfile(user, mobile) {
    const Model = PROFILE_MODELS[user.role];
    if (!Model) return null;

    const userId = user.userId ?? user._id;

    return Model.findOneAndUpdate(
      {
        $or: [{ userId }, { mobile }],
      },
      {
        userId,
        mobile,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }
}
