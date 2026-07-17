import { calculateMatchPercent } from "../../../domain/campaigns/CampaignRules.js";

const formatBudget = (amount, currency = "INR") => {
  if (!amount) return null;

  const symbol = currency === "INR" ? "INR " : `${currency} `;
  return `${symbol}${new Intl.NumberFormat("en-IN").format(amount)}`;
};

const getDaysLeft = (deadline) => {
  if (!deadline) return null;

  const today = new Date();
  const endDate = new Date(deadline);
  const diffMs = endDate.setHours(23, 59, 59, 999) - today.getTime();

  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

export const toCampaignCard = (campaign, influencerProfile) => {
  const daysLeft = getDaysLeft(campaign.applicationDeadline);
  const budgetDisplay = formatBudget(campaign.budgetAmount, campaign.budgetCurrency);

  return {
    id: campaign._id,
    ownerRole: campaign.ownerRole || "brand",
    ownerName: campaign.ownerName || campaign.brandName || campaign.agencyName,
    brandName: campaign.brandName || campaign.ownerName || campaign.agencyName,
    agencyName: campaign.agencyName,
    title: campaign.title,
    description: campaign.description,
    category: campaign.category,
    platforms: campaign.platforms,
    deliverables: campaign.deliverables,
    budgetAmount: campaign.budgetAmount,
    budgetCurrency: campaign.budgetCurrency,
    budgetDisplay,
    coverImageUrl: campaign.coverImageUrl,
    location: campaign.location,
    applicationDeadline: campaign.applicationDeadline,
    daysLeft,
    daysLeftText: daysLeft === null ? null : `${daysLeft} days left`,
    matchPercent: calculateMatchPercent(campaign, influencerProfile),
    status: campaign.status,
  };
};
