export const toApplicationDto = (application) => ({
  id: application._id,
  _id: application._id,
  campaignId: application.campaignId,
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

export const toOwnerApplicationDto = (application) => ({
  ...toApplicationDto(application),
  influencerName: application.influencerName || "Creator",
  followersDisplay: "",
  matchPercent: 0,
});
