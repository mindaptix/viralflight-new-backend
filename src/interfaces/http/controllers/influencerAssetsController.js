import { container } from "../../../di/container.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import BrandInvite from "../../../models/BrandInvite.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import Notification from "../../../models/Notification.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../../shared/errors/AppError.js";

export const getRateCard = asyncHandler(async (req, res) => {
  const { rateCard } = await container.getRateCardUseCase.execute({
    user: req.user,
  });

  sendSuccess(res, {
    message: "Rate card fetched successfully",
    rateCard,
  });
});

export const updateRateCard = asyncHandler(async (req, res) => {
  const { rateCard } = await container.updateRateCardUseCase.execute({
    user: req.user,
    body: req.body,
  });

  sendSuccess(res, {
    message: "Rate card updated successfully",
    rateCard,
  });
});

export const getMediaKit = asyncHandler(async (req, res) => {
  const { mediaKit } = await container.getMediaKitUseCase.execute({
    user: req.user,
  });

  sendSuccess(res, {
    message: "Media kit fetched successfully",
    mediaKit,
  });
});

export const updateMediaKit = asyncHandler(async (req, res) => {
  const { mediaKit } = await container.updateMediaKitUseCase.execute({
    user: req.user,
    body: req.body,
  });

  sendSuccess(res, {
    message: "Media kit updated successfully",
    mediaKit,
  });
});

export const listBrandInvites = asyncHandler(async (req, res) => {
  const { invites, brands } = await container.listInfluencerBrandInvitesUseCase.execute({
    user: req.user,
    limit: req.query.limit,
  });

  sendSuccess(res, {
    message: "Brand invites fetched successfully",
    count: brands.length,
    invites,
    brands,
    data: brands,
  });
});

export const respondToBrandInvite = asyncHandler(async (req, res) => {
  const status = `${req.body.status || ""}`.trim().toLowerCase();
  if (!["accepted", "declined"].includes(status)) {
    throw new ValidationError("status must be accepted or declined");
  }
  const invite = await BrandInvite.findById(req.params.inviteId);
  if (!invite) throw new NotFoundError("Campaign invite not found");
  const profile = await InfluencerProfile.findOne({ userId: req.user.userId }).select("_id");
  if (!profile || String(invite.influencerProfileId) !== String(profile._id)) {
    throw new ForbiddenError("You can only respond to your own invites");
  }
  if (invite.status !== "pending") {
    throw new ConflictError(`Invite is already ${invite.status}`);
  }
  invite.status = status;
  invite.respondedAt = new Date();
  await invite.save();
  await Notification.create({
    userId: invite.brandUserId,
    role: invite.ownerRole || "brand",
    title: `Campaign invite ${status}`,
    body: `A creator ${status} your campaign invitation.`,
    type: `invite_${status}`,
    targetId: String(invite.campaignId || ""),
    metadata: { inviteId: String(invite._id), campaignId: String(invite.campaignId || "") },
  }).catch(() => {});
  sendSuccess(res, { message: `Invite ${status}`, invite });
});
