import AgencyProfile from '../../models/AgencyProfile.js';
import BrandProfile from '../../models/BrandProfile.js';
import Campaign from '../../models/Campaign.js';
import InfluencerProfile from '../../models/InfluencerProfile.js';
import User from '../../models/User.js';
import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';

const profileModels = {
  agency: AgencyProfile,
  brand: BrandProfile,
  influencer: InfluencerProfile,
};

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
  const role = account.role || user?.role;
  const Profile = profileModels[role];

  if (!Profile) {
    throw new ValidationError('Valid account role is required');
  }

  const profileQuery = { $or: [{ userId }, ...(mobile ? [{ mobile }] : [])] };
  const profileDocs = await Profile.find(profileQuery).select('_id').lean();
  const profileIds = profileDocs.map((p) => p._id);

  await Campaign.updateMany(
    {
      $or: [
        { ownerUserId: userId },
        ...(role === 'brand' ? [{ brandUserId: userId }] : []),
        ...(role === 'agency' ? [{ agencyUserId: userId }] : []),
        ...(profileIds.length
          ? [
              { ownerProfileId: { $in: profileIds } },
              ...(role === 'brand' ? [{ brandProfileId: { $in: profileIds } }] : []),
              ...(role === 'agency' ? [{ agencyProfileId: { $in: profileIds } }] : []),
            ]
          : []),
      ],
    },
    { $set: { deletedAt: new Date(), status: 'archived' } }
  );

  await Profile.deleteMany(profileQuery);
  await User.deleteOne({ _id: userId });

  return { message: 'Account deleted successfully' };
}
