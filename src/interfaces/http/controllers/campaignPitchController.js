import mongoose from 'mongoose';
import Campaign from '../../../models/Campaign.js';
import InfluencerProfile from '../../../models/InfluencerProfile.js';
import { generatePitch } from '../../../application/campaigns/generatePitch.js';
import { AppError, NotFoundError, ValidationError, TooManyRequestsError } from '../../../shared/errors/AppError.js';
import { getGroqApiKey } from '../../../application/ai/groqConfig.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { sendSuccess } from '../../../shared/http/respond.js';

export const generateCampaignPitch = asyncHandler(async (req, res) => {
  if (!getGroqApiKey()) throw new AppError('AI pitch generation is not configured yet.', 503);
  if (!mongoose.isValidObjectId(req.params.campaignId)) throw new ValidationError('Invalid campaign');
  const campaign = await Campaign.findOne({ _id: req.params.campaignId, deletedAt: null })
    .select('title brandName ownerName category description deliverables').lean();
  if (!campaign) throw new NotFoundError('Campaign not found');
  const now = new Date();
  const profile = await InfluencerProfile.findOneAndUpdate({
    userId: req.user.userId,
    $or: [
      { pitchAiLastAttemptAt: { $exists: false } },
      { pitchAiLastAttemptAt: { $lte: new Date(now.getTime() - 60000) } },
    ],
  }, { $set: { pitchAiLastAttemptAt: now } });
  if (!profile) {
    if (!await InfluencerProfile.exists({ userId: req.user.userId })) {
      throw new NotFoundError('Complete your influencer profile first');
    }
    throw new TooManyRequestsError('Please wait a minute before generating another pitch.');
  }
  const pitch = await generatePitch({ campaign });
  sendSuccess(res, { pitch });
});
