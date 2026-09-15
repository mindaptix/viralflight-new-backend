import AgencyProfile from '../../../models/AgencyProfile.js';
import BrandProfile from '../../../models/BrandProfile.js';

// Batch fetch only public images, including for campaigns created before uploads.
export async function withCampaignOwnerImages(campaigns) {
  const rows = campaigns.map(c => c.toObject ? c.toObject() : { ...c });
  for (const [role, Model] of [['agency', AgencyProfile], ['brand', BrandProfile]]) {
    const owned = rows.filter(c => (c.ownerRole || 'brand') === role);
    const profileIds = owned.map(c => c.ownerProfileId || c[`${role}ProfileId`]).filter(Boolean);
    const userIds = owned.map(c => c.ownerUserId || c[`${role}UserId`]).filter(Boolean);
    if (!profileIds.length && !userIds.length) continue;
    const profiles = await Model.find({ $or: [
      { _id: { $in: profileIds } }, { userId: { $in: userIds } },
    ] }).select('_id userId profileImageUrl').lean();
    const byId = new Map(profiles.map(p => [String(p._id), p]));
    const byUser = new Map(profiles.map(p => [String(p.userId), p]));
    for (const campaign of owned) {
      const profile = byId.get(String(campaign.ownerProfileId || campaign[`${role}ProfileId`]))
        || byUser.get(String(campaign.ownerUserId || campaign[`${role}UserId`]));
      campaign.brandLogoUrl = profile?.profileImageUrl || '';
      campaign.ownerLogoUrl = campaign.brandLogoUrl;
    }
  }
  return rows;
}
