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
    ] }).select('_id userId profileImageUrl brandKit.logoUrlLight brandKit.logoUrlDark').lean();
    const byId = new Map(profiles.map(p => [String(p._id), p]));
    const byUser = new Map(profiles.map(p => [String(p.userId), p]));
    for (const campaign of owned) {
      const profile = byId.get(String(campaign.ownerProfileId || campaign[`${role}ProfileId`]))
        || byUser.get(String(campaign.ownerUserId || campaign[`${role}UserId`]));
      const imageUrl =
        profile?.profileImageUrl ||
        (role === 'brand' ? (profile?.brandKit?.logoUrlLight || profile?.brandKit?.logoUrlDark) : '') ||
        '';
      campaign.brandLogoUrl = campaign.brandLogoUrl || imageUrl;
      campaign.ownerLogoUrl = campaign.ownerLogoUrl || campaign.brandLogoUrl;
      if (role === 'agency') {
        campaign.agencyLogoUrl = campaign.agencyLogoUrl || imageUrl;
        if (!campaign.agency || typeof campaign.agency !== 'object') {
          campaign.agency = {};
        }
        campaign.agency.logoUrl = campaign.agency.logoUrl || imageUrl;
        campaign.agency.avatarUrl = campaign.agency.avatarUrl || imageUrl;
      } else if (role === 'brand') {
        if (!campaign.brand || typeof campaign.brand !== 'object') {
          campaign.brand = {};
        }
        campaign.brand.logoUrl = campaign.brand.logoUrl || imageUrl;
        campaign.brand.avatarUrl = campaign.brand.avatarUrl || imageUrl;
      }
    }
  }
  return rows;
}
