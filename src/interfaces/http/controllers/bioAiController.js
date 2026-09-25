import InfluencerProfile from '../../../models/InfluencerProfile.js';
import { generateBio } from '../../../application/profile/generateBio.js';
import { AppError, NotFoundError, TooManyRequestsError } from '../../../shared/errors/AppError.js';
import { getGroqApiKey } from '../../../application/ai/groqConfig.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { sendSuccess } from '../../../shared/http/respond.js';

export const generateCreatorBio = asyncHandler(async (req, res) => {
  if (!getGroqApiKey()) throw new AppError('AI bio generation is not configured yet.', 503);
  const now = new Date();
  const profile = await InfluencerProfile.findOneAndUpdate({
    userId: req.user.userId,
    $or: [
      { bioAiLastAttemptAt: { $exists: false } },
      { bioAiLastAttemptAt: { $lte: new Date(now.getTime() - 60000) } },
    ],
  }, { $set: { bioAiLastAttemptAt: now } });
  if (!profile) {
    if (!await InfluencerProfile.exists({ userId: req.user.userId })) throw new NotFoundError('Complete your influencer profile first');
    throw new TooManyRequestsError('Please wait a minute before generating another bio.');
  }
  const bio = await generateBio({ input: req.body });
  sendSuccess(res, { bio });
});
