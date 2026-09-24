import mongoose from "mongoose";

import CommunityMembership from "../../models/CommunityMembership.js";
import CommunityModerationIncident from "../../models/CommunityModerationIncident.js";
import { ForbiddenError, ValidationError } from "../../shared/errors/AppError.js";

const BANNED_PATTERNS = [
  /\b(?:bitch|whore|slut|retard(?:ed)?|motherfucker|fuck(?:er|ing)?|cunt)\b/i,
  /\b(?:madarchod|behenchod|bhenchod|chutiya|gandu|randi)\b/i,
];

const normalize = (value) => String(value || "")
  .toLowerCase()
  .replace(/[0]/g, "o")
  .replace(/[1!]/g, "i")
  .replace(/[3]/g, "e")
  .replace(/[4@]/g, "a")
  .replace(/[5$]/g, "s")
  .replace(/[^a-z\u0900-\u097f\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export const containsAbusiveLanguage = (text) => {
  const normalized = normalize(text);
  return BANNED_PATTERNS.some((pattern) => pattern.test(normalized));
};

export const moderateCommunityMessage = async ({
  communityId,
  userId,
  conversationId,
  text,
}) => {
  if (!communityId || !mongoose.isValidObjectId(communityId)) return;

  const membership = await CommunityMembership.findOne({ communityId, userId });
  if (membership?.isBanned) {
    throw new ForbiddenError("You are banned from messaging in this community");
  }

  const normalized = normalize(text);
  const matches = BANNED_PATTERNS
    .filter((pattern) => pattern.test(normalized))
    .map((pattern) => pattern.source);
  if (matches.length === 0) return;

  const updated = await CommunityMembership.findOneAndUpdate(
    { communityId, userId },
    {
      $inc: { moderationStrikes: 1 },
      $setOnInsert: { communityId, userId },
    },
    { upsert: true, new: true }
  );
  const shouldBan = updated.moderationStrikes >= 3;
  if (shouldBan) {
    updated.isBanned = true;
    updated.isJoined = false;
    updated.bannedAt = new Date();
    await updated.save();
  }

  await CommunityModerationIncident.create({
    communityId,
    userId,
    conversationId,
    matchedTerms: matches,
    action: shouldBan ? "community_ban" : "blocked",
  });

  throw new ValidationError(
    shouldBan
      ? "Message blocked and community access suspended after repeated abusive language"
      : "Message blocked because it contains abusive language"
  );
};
