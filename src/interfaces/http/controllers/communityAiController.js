import { randomUUID } from 'node:crypto';
import Community from '../../../models/Community.js';
import InfluencerProfile from '../../../models/InfluencerProfile.js';
import { isCommunityAiConfigured, scanCommunityTopics } from '../../../application/community/communityAiService.js';
import { AppError, NotFoundError, ValidationError, TooManyRequestsError } from '../../../shared/errors/AppError.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { sendSuccess } from '../../../shared/http/respond.js';

export const getAiRecommendationStatus = asyncHandler(async (req, res) => {
  const profile = await InfluencerProfile.findOne({ userId: req.user.userId }).select('communityRecommendations').lean();
  sendSuccess(res, { enabled: isCommunityAiConfigured(), recommendations: profile?.communityRecommendations || null });
});

export const scanRecommendations = asyncHandler(async (req, res) => {
  if (req.body?.consent !== true) throw new ValidationError('Please consent to this profile and caption scan');
  if (!isCommunityAiConfigured()) throw new AppError('AI recommendations are not configured yet. Category matching is still available.', 503);
  const now = new Date();
  const scanId = randomUUID();
  // A database lease and cooldown cover parallel requests and multiple workers.
  const profile = await InfluencerProfile.findOneAndUpdate({
    userId: req.user.userId,
    $and: [
      { $or: [{ 'communityAiScan.until': { $exists: false } }, { 'communityAiScan.until': { $lte: now } }] },
      { $or: [{ communityAiLastAttemptAt: { $exists: false } }, { communityAiLastAttemptAt: { $lte: new Date(now - 60000) } }] },
    ],
  }, { $set: { communityAiScan: { id: scanId, until: new Date(now.getTime() + 90000) }, communityAiLastAttemptAt: now } }, { new: true })
    .select('+instagram.token.iv +instagram.token.tag +instagram.token.value');
  if (!profile) {
    if (!await InfluencerProfile.exists({ userId: req.user.userId })) throw new NotFoundError('Complete your influencer profile first');
    throw new TooManyRequestsError('A scan is running or was recently requested. Please wait a minute.');
  }
  try {
    const communities = await Community.find({ isActive: true }).select('category tags').lean();
    const allowedTopics = [...new Set(communities.flatMap((item) => [item.category, ...(item.tags || [])])
      .filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim().slice(0, 100)))].slice(0, 300);
    const result = await scanCommunityTopics({ profile, allowedTopics, consent: true });
    const updated = await InfluencerProfile.updateOne({ _id: profile._id, 'communityAiScan.id': scanId }, {
      $set: { communityRecommendations: { ...result, consentVersion: 'profile-captions-v1', consentedAt: now } },
      $unset: { communityAiScan: '' },
    });
    if (!updated.matchedCount) throw new ValidationError('Suggestions were cleared while scanning. The results were not saved.');
    sendSuccess(res, { recommendations: result });
  } finally {
    await InfluencerProfile.updateOne({ _id: profile._id, 'communityAiScan.id': scanId }, { $unset: { communityAiScan: '' } });
  }
});

export const clearRecommendations = asyncHandler(async (req, res) => {
  // Clearing the lease prevents an in-flight scan from saving its results later.
  await InfluencerProfile.updateOne({ userId: req.user.userId }, { $unset: { communityRecommendations: '', communityAiScan: '' } });
  sendSuccess(res, { message: 'AI suggestions cleared. Category matching is still available.' });
});
