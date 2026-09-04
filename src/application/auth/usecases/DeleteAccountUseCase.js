import AgencyProfile from "../../../models/AgencyProfile.js";
import BrandInvite from "../../../models/BrandInvite.js";
import BrandProfile from "../../../models/BrandProfile.js";
import Campaign from "../../../models/Campaign.js";
import CampaignApplication from "../../../models/CampaignApplication.js";
import Collaboration from "../../../models/Collaboration.js";
import CommunityMembership from "../../../models/CommunityMembership.js";
import CreatorFollow from "../../../models/CreatorFollow.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import InfluencerProfileView from "../../../models/InfluencerProfileView.js";
import InfluencerSocialConnection from "../../../models/InfluencerSocialConnection.js";
import Notification from "../../../models/Notification.js";
import ProfileConnection from "../../../models/ProfileConnection.js";
import QuoteRequest from "../../../models/QuoteRequest.js";
import SavedCampaign from "../../../models/SavedCampaign.js";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";

export class DeleteAccountUseCase extends UseCase {
  constructor({ userRepository }) {
    super();
    this.userRepository = userRepository;
  }

  async execute({ user }) {
    const credentials = {
      userId: user.userId,
      mobile: user.mobile,
      role: user.role,
    };
    const account = await this.userRepository.findVerifiedByCredentials(credentials);
    if (!account) throw new UnauthorizedError("Account no longer exists");

    const influencerProfile =
      user.role === "influencer"
        ? await InfluencerProfile.findOne({
            $or: [{ userId: user.userId }, { mobile: user.mobile }],
          }).select("_id")
        : null;
    const ownedCampaigns = await Campaign.find({
      $or: [
        { ownerUserId: user.userId },
        { brandUserId: user.userId },
        { agencyUserId: user.userId },
      ],
    }).select("_id");
    const campaignIds = ownedCampaigns.map((campaign) => campaign._id);
    const profileId = influencerProfile?._id;

    await Promise.all([
      CampaignApplication.deleteMany({
        $or: [
          { influencerUserId: user.userId },
          ...(campaignIds.length ? [{ campaignId: { $in: campaignIds } }] : []),
        ],
      }),
      BrandInvite.deleteMany({
        $or: [
          { brandUserId: user.userId },
          { influencerUserId: user.userId },
          ...(profileId ? [{ influencerProfileId: profileId }] : []),
          ...(campaignIds.length ? [{ campaignId: { $in: campaignIds } }] : []),
        ],
      }),
      Collaboration.deleteMany({
        $or: [
          { brandUserId: user.userId },
          { influencerUserId: user.userId },
          ...(profileId ? [{ influencerProfileId: profileId }] : []),
          ...(campaignIds.length ? [{ campaignId: { $in: campaignIds } }] : []),
        ],
      }),
      CommunityMembership.deleteMany({ userId: user.userId }),
      CreatorFollow.deleteMany({
        $or: [
          { followerUserId: user.userId },
          ...(profileId
            ? [{ followerProfileId: profileId }, { followedProfileId: profileId }]
            : []),
        ],
      }),
      InfluencerProfileView.deleteMany({
        $or: [
          { influencerUserId: user.userId },
          { viewerUserId: user.userId },
          ...(profileId ? [{ influencerProfileId: profileId }] : []),
        ],
      }),
      InfluencerSocialConnection.deleteMany({ userId: user.userId }),
      ProfileConnection.deleteMany({
        $or: [
          { fromUserId: user.userId },
          { influencerUserId: user.userId },
          ...(profileId ? [{ influencerProfileId: profileId }] : []),
        ],
      }),
      QuoteRequest.deleteMany({
        $or: [
          { requesterUserId: user.userId },
          { influencerUserId: user.userId },
          ...(profileId ? [{ influencerProfileId: profileId }] : []),
        ],
      }),
      Notification.deleteMany({ userId: user.userId }),
      SavedCampaign.deleteMany({
        $or: [
          { userId: user.userId },
          ...(campaignIds.length ? [{ campaignId: { $in: campaignIds } }] : []),
        ],
      }),
    ]);

    const profileModel = {
      influencer: InfluencerProfile,
      brand: BrandProfile,
      agency: AgencyProfile,
    }[user.role];
    await Promise.all([
      profileModel.deleteMany({
        $or: [{ userId: user.userId }, { mobile: user.mobile }],
      }),
      Campaign.deleteMany({ _id: { $in: campaignIds } }),
    ]);
    await this.userRepository.deleteByCredentials(credentials);

    return {
      message: "Account deleted successfully",
      deletedRole: user.role,
    };
  }
}
