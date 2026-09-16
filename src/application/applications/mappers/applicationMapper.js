export const toApplicationDto = (application) => ({
  id: application._id,
  _id: application._id,
  campaignId: application.campaignId,
  influencerUserId: application.influencerUserId,
  influencerProfileId: application.influencerProfileId,
  influencerName: application.influencerName,
  status: application.status,
  note: application.note || application.pitch,
  pitch: application.pitch || application.note,
  proposedRate: application.proposedRate,
  currency: application.currency,
  quotedRate: {
    amount: application.proposedRate,
    currency: application.currency,
  },
  portfolioLinks: application.portfolioLinks || [],
  createdAt: application.createdAt,
});

export const toApplicationWithCampaignDto = (application, campaign) => ({
  ...toApplicationDto(application),
  campaignTitle: campaign?.title || "",
  campaignBrand:
    campaign?.ownerName || campaign?.brandName || campaign?.agencyName || "",
  campaignCategory: campaign?.category || "",
  campaignImageUrl: campaign?.coverImageUrl || "",
});

const resolveInfluencerAvatarUrl = (profile) => {
  if (!profile) return "";
  const direct =
    profile.profileImageUrl || profile.avatarUrl || profile.imageUrl || "";
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const instagram =
    profile.instagram?.profilePictureUrl ||
    profile.instagram?.profilePicture ||
    "";
  return typeof instagram === "string" ? instagram.trim() : "";
};

export const toOwnerApplicationDto = (application, influencerProfile = null) => {
  const influencerImageUrl = resolveInfluencerAvatarUrl(influencerProfile);
  const influencerName =
    application.influencerName ||
    influencerProfile?.name ||
    influencerProfile?.displayName ||
    "Creator";

  return {
    ...toApplicationDto(application),
    influencerName,
    influencerImageUrl,
    influencerProfileImageUrl: influencerImageUrl,
    profileImageUrl: influencerImageUrl,
    avatarUrl: influencerImageUrl,
    influencer: influencerProfile
      ? {
          id: influencerProfile._id,
          _id: influencerProfile._id,
          name: influencerName,
          profileImageUrl: influencerImageUrl,
          avatarUrl: influencerImageUrl,
          imageUrl: influencerImageUrl,
        }
      : undefined,
    followersDisplay: "",
    matchPercent: 0,
  };
};
