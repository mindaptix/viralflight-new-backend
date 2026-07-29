import { container } from "../../../di/container.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

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
