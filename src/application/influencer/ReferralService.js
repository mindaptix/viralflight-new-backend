import crypto from "crypto";
import mongoose from "mongoose";
import User from "../../models/User.js";
import InfluencerProfile from "../../models/InfluencerProfile.js";
import ReferralLedger from "../../models/ReferralLedger.js";
import PayoutTransaction from "../../models/PayoutTransaction.js";
import Notification from "../../models/Notification.js";
import { getOrCreateRoleProfile } from "../../utils/profileControllerUtils.js";

const REWARD_PER_REFERRAL = 500;
const SHARE_BASE_URL = process.env.SHARE_BASE_URL || "https://viralflight.in";

const sanitizeNamePart = (name) => {
  if (!name || typeof name !== "string") return "CREATOR";
  const firstWord = name.trim().split(/\s+/)[0];
  const cleaned = firstWord.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return cleaned.length >= 2 ? cleaned.substring(0, 10) : "CREATOR";
};

export const generateReferralCode = async (user, profile, checkExists = null) => {
  const nameBase = sanitizeNamePart(profile?.name || user?.displayName);
  let attempts = 0;

  const isCodeTaken =
    checkExists ||
    (async (code) => {
      if (mongoose.connection.readyState !== 1) return false;
      const existing = await InfluencerProfile.findOne({
        referralCode: code,
      })
        .select("_id")
        .lean();
      return Boolean(existing);
    });

  while (attempts < 10) {
    const randomSuffix = Math.floor(10 + Math.random() * 90); // 2-digit number (e.g. 50)
    const candidate = `${nameBase}${randomSuffix}`;

    const exists = await isCodeTaken(candidate);
    if (!exists) {
      return candidate;
    }
    attempts += 1;
  }

  // Fallback with hex suffix if collision
  return `${nameBase}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
};

export const getReferralSummary = async ({ user }) => {
  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);

  if (!profile.referralCode) {
    profile.referralCode = await generateReferralCode(user, profile);
    await profile.save();
  }

  const referralCode = profile.referralCode;
  const shareUrl = `${SHARE_BASE_URL.replace(/\/$/, "")}/join?ref=${referralCode}`;

  const [totalJoined, totalRewarded] = await Promise.all([
    ReferralLedger.countDocuments({ referrerUserId: user.userId }),
    ReferralLedger.countDocuments({
      referrerUserId: user.userId,
      status: "completed",
    }),
  ]);

  const totalInvited = totalJoined; // Base invited matches registered joiners
  const pendingEarnings = (totalJoined - totalRewarded) * REWARD_PER_REFERRAL;
  const totalEarned = totalRewarded * REWARD_PER_REFERRAL;

  return {
    referralCode,
    shareUrl,
    totalInvited,
    totalJoined,
    totalRewarded,
    pendingEarnings,
    totalEarned,
    rewardPerReferral: REWARD_PER_REFERRAL,
    currency: "INR",
  };
};

export const recordRegistrationReferral = async ({
  newUser,
  referralCode,
}) => {
  if (!referralCode || !newUser?._id) return null;

  const normalizedCode = String(referralCode).trim().toUpperCase();

  // Find referrer by their referral code
  const referrerProfile = await InfluencerProfile.findOne({
    referralCode: normalizedCode,
  })
    .select("userId mobile name")
    .lean();

  if (!referrerProfile || !referrerProfile.userId) {
    console.warn(`[Referral] Referral code '${normalizedCode}' not found`);
    return null;
  }

  const referrerUserId = String(referrerProfile.userId);
  const newUserId = String(newUser._id);

  // Prevent self-referral
  if (referrerUserId === newUserId) {
    console.warn(`[Referral] Self-referral ignored for user ${newUserId}`);
    return null;
  }

  // Update referredBy on the newly registered user
  await User.findByIdAndUpdate(newUser._id, {
    referredBy: referrerProfile.userId,
  });

  // Upsert referral record in ReferralLedger
  const referral = await ReferralLedger.findOneAndUpdate(
    {
      referrerUserId: referrerProfile.userId,
      referredUserId: newUser._id,
    },
    {
      $setOnInsert: {
        referrerUserId: referrerProfile.userId,
        referredUserId: newUser._id,
        referralCode: normalizedCode,
        status: "registered",
        rewardAmount: REWARD_PER_REFERRAL,
        isPaid: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return referral;
};

export const getReferralsLedger = async ({ user }) => {
  const records = await ReferralLedger.find({
    referrerUserId: user.userId,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (records.length === 0) {
    return { referrals: [] };
  }

  const referredUserIds = records.map((r) => r.referredUserId);

  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: referredUserIds } })
      .select("displayName avatar createdAt")
      .lean(),
    InfluencerProfile.find({ userId: { $in: referredUserIds } })
      .select("userId name profileImageUrl createdAt")
      .lean(),
  ]);

  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));

  const referrals = records.map((r) => {
    const referredIdStr = String(r.referredUserId);
    const u = userMap.get(referredIdStr);
    const p = profileMap.get(referredIdStr);

    const name = p?.name || u?.displayName || "Creator";
    const avatarUrl = p?.profileImageUrl || u?.avatar || "";
    const joinedAt = (r.createdAt || u?.createdAt || new Date()).toISOString();

    return {
      id: String(r._id),
      name,
      avatarUrl,
      joinedAt,
      status: r.status, // "registered" | "profile_completed" | "first_deal_completed" | "completed"
      rewardAmount: r.rewardAmount || REWARD_PER_REFERRAL,
      isPaid: Boolean(r.isPaid),
    };
  });

  return { referrals };
};

/**
 * Automated Event Hook (Deal Completion):
 * When a referred creator completes their first campaign deal (deal.status == 'completed'),
 * trigger referral reward credit:
 * - Credit referrer's wallet availableBalance += 500
 * - Mark referral status as "completed"
 * - Create an in-app notification: "You earned ₹500 referral bonus for <Name>'s first completed collaboration!"
 */
export const handleDealCompletionReward = async ({ deal }) => {
  if (!deal || deal.status !== "completed") return null;

  const creatorUserId = deal.influencerUserId;
  if (!creatorUserId) return null;

  // Check if this creator has a referral record pending reward
  const referral = await ReferralLedger.findOne({
    referredUserId: creatorUserId,
    status: { $ne: "completed" },
    isPaid: false,
  });

  if (!referral) {
    // Creator was not referred or already completed their reward milestone
    return null;
  }

  const referrerUserId = referral.referrerUserId;

  // Retrieve creator's display name for notification
  const [creatorUser, creatorProfile] = await Promise.all([
    User.findById(creatorUserId).select("displayName").lean(),
    InfluencerProfile.findOne({ userId: creatorUserId }).select("name").lean(),
  ]);

  const creatorName =
    creatorProfile?.name || creatorUser?.displayName || "Creator";

  const rewardAmount = referral.rewardAmount || REWARD_PER_REFERRAL;

  // 1. Credit referrer's wallet atomically
  await InfluencerProfile.findOneAndUpdate(
    { userId: referrerUserId },
    {
      $inc: {
        "wallet.availableBalance": rewardAmount,
        "wallet.lifetimeEarnings": rewardAmount,
      },
    },
    { upsert: false }
  );

  // 2. Mark referral as completed and paid
  referral.status = "completed";
  referral.isPaid = true;
  referral.paidAt = new Date();
  referral.completedAt = new Date();
  await referral.save();

  // 3. Record referral bonus in referrer's payout transaction history
  const referenceId = `ref_bonus_${String(deal._id)}_${crypto.randomBytes(4).toString("hex")}`;
  await PayoutTransaction.create({
    userId: referrerUserId,
    amount: rewardAmount,
    type: "referral_bonus",
    status: "processed",
    method: "system",
    referenceId,
  });

  // 4. Create in-app notification for the referrer
  await Notification.create({
    userId: referrerUserId,
    role: "influencer",
    title: "Referral Bonus Earned!",
    body: `You earned ₹${rewardAmount} referral bonus for ${creatorName}'s first completed collaboration!`,
    type: "general",
    targetId: String(referral._id),
    metadata: {
      referralId: String(referral._id),
      referredUserId: String(creatorUserId),
      dealId: String(deal._id),
      rewardAmount,
    },
  });

  console.log(
    `[Referral] Successfully credited ₹${rewardAmount} to referrer ${referrerUserId} for creator ${creatorName}`
  );

  return {
    rewarded: true,
    referrerUserId,
    rewardAmount,
    creatorName,
  };
};
