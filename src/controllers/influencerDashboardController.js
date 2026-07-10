import mongoose from "mongoose";

import InfluencerProfile from "../models/InfluencerProfile.js";
import {
  getInfluencerDashboardStats,
  recordInfluencerProfileView,
} from "../services/influencerDashboardStatsService.js";

const getTargetInfluencerProfile = async (body = {}) => {
  const query = [];

  if (mongoose.Types.ObjectId.isValid(body.influencerProfileId)) {
    query.push({ _id: body.influencerProfileId });
  }

  if (mongoose.Types.ObjectId.isValid(body.influencerUserId)) {
    query.push({ userId: body.influencerUserId });
  }

  if (typeof body.influencerMobile === "string" && body.influencerMobile.trim()) {
    query.push({ mobile: body.influencerMobile.trim() });
  }

  if (query.length === 0) {
    return null;
  }

  return InfluencerProfile.findOne({ $or: query });
};

export const getDashboardStats = async (req, res) => {
  try {
    const { profile, stats, statCards } = await getInfluencerDashboardStats(req.user);

    res.json({
      success: true,
      message: "Influencer dashboard stats fetched successfully",
      profileId: profile?._id ?? null,
      stats,
      statCards,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordProfileView = async (req, res) => {
  try {
    const influencerProfile = await getTargetInfluencerProfile(req.body);

    if (!influencerProfile) {
      return res.status(400).json({
        success: false,
        message:
          "Valid influencerProfileId, influencerUserId, or influencerMobile is required",
      });
    }

    if (String(influencerProfile.userId) === String(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: "Own profile view is not counted",
      });
    }

    await recordInfluencerProfileView({
      influencerProfile,
      viewer: req.user,
    });

    res.json({
      success: true,
      message: "Influencer profile view recorded successfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({
        success: true,
        message: "Influencer profile view already recorded",
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};
