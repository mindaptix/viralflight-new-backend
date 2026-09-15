import InfluencerProfile from "../../../models/InfluencerProfile.js";
import ConnectionRequest from "../../../models/ConnectionRequest.js";
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

  if (!profile || !profile.userId || profile.claimStatus === "unclaimed") {
    throw new NotFoundError("Creator profile not found");
  }

  const publicProfile = toPublicCreatorProfile(profile);
  const ownProfile = req.user.role === "influencer" && String(profile.userId) === String(req.user.userId);
  const consent = ["brand", "agency"].includes(req.user.role) && await ConnectionRequest.exists({
    creatorId: profile.userId, brandId: req.user.userId, brandRole: req.user.role,
    status: "accepted", contactConsent: true, consentActorId: profile.userId,
  });
  publicProfile.canViewContact = Boolean(ownProfile || consent);
  if (publicProfile.canViewContact) {
    publicProfile.mobile = profile.mobile || "";
    publicProfile.whatsapp = profile.mobile || "";
    publicProfile.contactWhatsApp = profile.mobile || "";
  }
  res.set("Cache-Control", "no-store");
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
