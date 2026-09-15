import AgencyProfile from '../../models/AgencyProfile.js';
import BrandInvite from '../../models/BrandInvite.js';
import BrandProfile from '../../models/BrandProfile.js';
import Campaign from '../../models/Campaign.js';
import CampaignApplication from '../../models/CampaignApplication.js';
import CommunityMembership from '../../models/CommunityMembership.js';
import ConnectionRequest from '../../models/ConnectionRequest.js';
import CreatorFollow from '../../models/CreatorFollow.js';
import InfluencerProfile from '../../models/InfluencerProfile.js';
import InfluencerProfileView from '../../models/InfluencerProfileView.js';
import Notification from '../../models/Notification.js';
import SavedCampaign from '../../models/SavedCampaign.js';
import User from '../../models/User.js';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';

/**
 * Permanently deletes or scrubs user record and cascades deletion
 * of associated role profiles, pitch applications, invites, and sessions
 * per Apple App Store Guideline 5.1.1(v).
 */
export async function deleteAccount({ user, confirmed }) {
  if (!confirmed) {
    throw new ValidationError('Account deletion confirmation is required');
  }

  const userId = user?.userId || user?._id || user?.id;

  if (!userId) {
    throw new ValidationError('User identifier is missing');
  }

  const account = await User.findOne({ _id: userId });
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const mobile = account.mobile || user?.mobile;

  // Gather any profile IDs linked to this user for cascading foreign keys
  const [influencerDocs, brandDocs, agencyDocs] = await Promise.all([
    InfluencerProfile.find({ $or: [{ userId }, ...(mobile ? [{ mobile }] : [])] }).select('_id').lean(),
    BrandProfile.find({ $or: [{ userId }, ...(mobile ? [{ mobile }] : [])] }).select('_id').lean(),
    AgencyProfile.find({ $or: [{ userId }, ...(mobile ? [{ mobile }] : [])] }).select('_id').lean(),
  ]);

  const influencerProfileIds = influencerDocs.map((p) => p._id);
  const brandProfileIds = brandDocs.map((p) => p._id);
  const agencyProfileIds = agencyDocs.map((p) => p._id);
  const allProfileIds = [...influencerProfileIds, ...brandProfileIds, ...agencyProfileIds];

  // 1. Archive owned campaigns before removing profile references
  await Campaign.updateMany(
    {
      $or: [
        { ownerUserId: userId },
        { brandUserId: userId },
        { agencyUserId: userId },
        ...(allProfileIds.length
          ? [
              { ownerProfileId: { $in: allProfileIds } },
              { brandProfileId: { $in: allProfileIds } },
              { agencyProfileId: { $in: allProfileIds } },
            ]
          : []),
      ],
    },
    { $set: { deletedAt: new Date(), status: 'archived' } }
  );

  // 2. Cascade delete pitch applications
  await CampaignApplication.deleteMany({
    $or: [
      { influencerUserId: userId },
      ...(influencerProfileIds.length ? [{ influencerProfileId: { $in: influencerProfileIds } }] : []),
      ...(mobile ? [{ influencerMobile: mobile }] : []),
    ],
  });

  // 3. Cascade delete invitations & connection requests
  await Promise.all([
    BrandInvite.deleteMany({
      $or: [
        { influencerUserId: userId },
        { brandUserId: userId },
        ...(influencerProfileIds.length ? [{ influencerProfileId: { $in: influencerProfileIds } }] : []),
        ...(mobile ? [{ influencerMobile: mobile }, { brandMobile: mobile }] : []),
      ],
    }),
    ConnectionRequest.deleteMany({
      $or: [
        { creatorId: userId },
        { brandId: userId },
        ...(influencerProfileIds.length ? [{ creatorProfileId: { $in: influencerProfileIds } }] : []),
        ...(mobile ? [{ creatorMobile: mobile }] : []),
      ],
    }),
  ]);

  // 4. Cascade delete user engagement, saved items, memberships, and notifications
  await Promise.all([
    SavedCampaign.deleteMany({ userId }),
    CommunityMembership.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    InfluencerProfileView.deleteMany({
      $or: [
        { viewerUserId: userId },
        { influencerUserId: userId },
        ...(influencerProfileIds.length ? [{ influencerProfileId: { $in: influencerProfileIds } }] : []),
      ],
    }),
    CreatorFollow.deleteMany({
      $or: [{ followerUserId: userId }, { creatorUserId: userId }],
    }),
  ]);

  // 5. Cascade delete role profiles
  await Promise.all([
    InfluencerProfile.deleteMany({ $or: [{ userId }, ...(mobile ? [{ mobile }] : [])] }),
    BrandProfile.deleteMany({ $or: [{ userId }, ...(mobile ? [{ mobile }] : [])] }),
    AgencyProfile.deleteMany({ $or: [{ userId }, ...(mobile ? [{ mobile }] : [])] }),
  ]);

  // 6. Permanently delete user record to scrub all PII and invalidate active sessions
  await User.deleteOne({ _id: userId });

  return { message: 'Account permanently deleted' };
}
