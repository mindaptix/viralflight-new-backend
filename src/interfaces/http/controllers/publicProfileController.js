import InfluencerProfile from "../../../models/InfluencerProfile.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import { NotFoundError } from "../../../shared/errors/AppError.js";
import { toPublicCreatorProfile } from "../../../application/profiles/mappers/roleProfileMapper.js";

const formatFollowers = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return "";
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(count);
};

export const getPublicCreatorProfile = asyncHandler(async (req, res) => {
  const { profileId } = req.params;
  const profile = await InfluencerProfile.findById(profileId);

  if (!profile) {
    throw new NotFoundError("Creator profile not found");
  }

  const publicProfile = toPublicCreatorProfile(profile);
  publicProfile.platforms = (publicProfile.platforms || []).map((item) => ({
    ...item,
    followersDisplay:
      item.followersDisplay || formatFollowers(item.followers),
  }));

  sendSuccess(res, {
    message: "Creator profile fetched successfully",
    profile: publicProfile,
  });
});
