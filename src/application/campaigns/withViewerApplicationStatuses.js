import CampaignApplication from '../../models/CampaignApplication.js';

// Keep application state attached to each card so every campaign surface can
// render the same creator-specific state without an extra request per card.
export const withViewerApplicationStatuses = async (cards, user) => {
  if (user?.role !== 'influencer' || !cards.length) return cards;
  const ids = cards.map((card) => card.id).filter(Boolean);
  if (!ids.length) return cards;
  const applications = await CampaignApplication.find({
    campaignId: { $in: ids },
    influencerUserId: user.userId,
  }).select('campaignId status').lean();
  const statuses = new Map(applications.map((item) => [String(item.campaignId), item.status]));
  return cards.map((card) => ({
    ...card,
    applicationStatus: statuses.get(String(card.id)) || '',
  }));
};
