import InfluencerProfile from "../../../models/InfluencerProfile.js";
import Campaign from "../../../models/Campaign.js";
import CampaignApplication from "../../../models/CampaignApplication.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess, sendFailure } from "../../../shared/http/respond.js";

const toId = (v) => (v ? String(v) : "");

// ─── Scoring helpers ──────────────────────────────────────────────────────────

const computeMatchScore = (influencer, campaign) => {
  let score = 0;
  const reasons = [];

  // Niche match
  const infNiche = (influencer.niche || "").toLowerCase();
  const campaignNiches = (campaign.targetNiches || []).map((n) =>
    n.toLowerCase()
  );
  if (campaignNiches.some((n) => infNiche.includes(n) || n.includes(infNiche))) {
    score += 40;
    reasons.push("Niche match");
  }

  // Follower scale tier
  const followers = influencer.followerCount || 0;
  const tiers = campaign.targetScaleTier || [];
  const tierMatch = tiers.some((tier) => {
    const t = tier.toLowerCase();
    if (t.includes("nano") && followers < 1000) return true;
    if (t.includes("micro") && followers >= 1000 && followers < 10000) return true;
    if (t.includes("mid") && followers >= 10000 && followers < 100000) return true;
    if (t.includes("macro") && followers >= 100000 && followers < 1000000) return true;
    if (t.includes("mega") && followers >= 1000000) return true;
    return false;
  });
  if (tierMatch) {
    score += 30;
    reasons.push("Scale tier match");
  }

  // Engagement rate bonus
  const er = influencer.avgEngagementRate || 0;
  if (er >= 5) { score += 20; reasons.push("High engagement rate"); }
  else if (er >= 2) { score += 10; reasons.push("Good engagement rate"); }

  // City/location match
  if (campaign.location && influencer.city) {
    if (
      campaign.location.toLowerCase().includes(influencer.city.toLowerCase()) ||
      influencer.city.toLowerCase().includes(campaign.location.toLowerCase())
    ) {
      score += 10;
      reasons.push("Location match");
    }
  }

  return { score: Math.min(score, 100), reasons };
};

// ─── 1. AI Match Influencers ─────────────────────────────────────────────────
export const matchInfluencers = asyncHandler(async (req, res) => {
  const {
    campaignId,
    targetNiches,
    targetScaleTier,
    budgetMax,
    location,
    limit = 10,
  } = req.body || {};

  // Build a campaign context object (from DB or from inline body)
  let campaign = { targetNiches: [], targetScaleTier: [], location };

  if (campaignId) {
    try {
      const found = await Campaign.findById(campaignId).lean();
      if (found) campaign = found;
    } catch (_) {}
  }

  if (targetNiches) campaign.targetNiches = Array.isArray(targetNiches) ? targetNiches : [targetNiches];
  if (targetScaleTier) campaign.targetScaleTier = Array.isArray(targetScaleTier) ? targetScaleTier : [targetScaleTier];

  // Fetch candidate influencers
  const filter = { isProfileComplete: true };
  if (campaign.targetNiches?.length) {
    filter.niche = {
      $regex: campaign.targetNiches.slice(0, 3).join("|"),
      $options: "i",
    };
  }

  const candidates = await InfluencerProfile.find(filter)
    .select(
      "displayName username instagramHandle followerCount avgEngagementRate niche city profileImageUrl rateCard"
    )
    .limit(100)
    .lean();

  // Score and sort
  const scored = candidates
    .map((inf) => {
      const { score, reasons } = computeMatchScore(inf, campaign);
      return { influencer: inf, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Number(limit));

  const results = scored.map(({ influencer: inf, score, reasons }) => ({
    id: toId(inf._id),
    displayName: inf.displayName || inf.username || inf.instagramHandle || "Creator",
    instagramHandle: inf.instagramHandle || null,
    avatarUrl: inf.profileImageUrl || null,
    niche: inf.niche || null,
    city: inf.city || null,
    followerCount: inf.followerCount || 0,
    avgEngagementRate: inf.avgEngagementRate || 0,
    matchScore: score,
    matchReasons: reasons,
    estimatedRate:
      inf.rateCard?.instagramReelRate ||
      inf.rateCard?.instagramPostRate ||
      null,
  }));

  sendSuccess(res, {
    message: "AI influencer match completed",
    matches: results,
    total: results.length,
    campaignContext: {
      targetNiches: campaign.targetNiches,
      targetScaleTier: campaign.targetScaleTier,
    },
  });
});

// ─── 2. AI Campaign Report ────────────────────────────────────────────────────
export const generateCampaignReport = asyncHandler(async (req, res) => {
  const { campaignId } = req.body || {};

  if (!campaignId) {
    return sendFailure(res, {
      statusCode: 400,
      message: "campaignId is required",
    });
  }

  const campaign = await Campaign.findById(campaignId).lean();
  if (!campaign) {
    return sendFailure(res, { statusCode: 404, message: "Campaign not found" });
  }

  const [total, accepted, rejected] = await Promise.all([
    CampaignApplication.countDocuments({ campaignId }),
    CampaignApplication.countDocuments({ campaignId, status: "accepted" }),
    CampaignApplication.countDocuments({ campaignId, status: "rejected" }),
  ]);

  const pending = total - accepted - rejected;
  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  // Simulate AI-generated insights
  const insights = [];
  if (acceptanceRate > 60)
    insights.push("🔥 High acceptance rate — campaign is highly attractive to creators");
  else if (acceptanceRate < 20)
    insights.push("⚠️ Low acceptance rate — consider increasing budget or relaxing deliverable requirements");
  if (campaign.viewCount > 500)
    insights.push("👁️ Strong campaign visibility with 500+ views");
  if (campaign.slotsRemaining === 0 && campaign.slotsTotal > 0)
    insights.push("✅ All creator slots filled — campaign at full capacity");

  const summary = [
    `${total} creator${total !== 1 ? "s" : ""} applied`,
    `${accepted} accepted`,
    `${acceptanceRate}% acceptance rate`,
    `${campaign.viewCount || 0} views`,
  ].join(" · ");

  sendSuccess(res, {
    message: "Campaign report generated successfully",
    report: {
      campaignId: toId(campaign._id),
      title: campaign.title,
      status: campaign.status,
      summary,
      metrics: {
        views: campaign.viewCount || 0,
        totalApplications: total,
        accepted,
        rejected,
        pending,
        acceptanceRate,
        slotsTotal: campaign.slotsTotal || 0,
        slotsRemaining: campaign.slotsRemaining || 0,
      },
      aiInsights: insights,
      generatedAt: new Date().toISOString(),
      note: "AI insights are generated based on campaign performance metrics",
    },
  });
});
