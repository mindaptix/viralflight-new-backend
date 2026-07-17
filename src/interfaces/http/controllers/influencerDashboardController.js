import { container } from "../../../di/container.js";
import { ConflictError } from "../../../shared/errors/AppError.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const { profile, stats, statCards } =
    await container.getInfluencerDashboardStatsUseCase.execute({
      user: req.user,
    });

  sendSuccess(res, {
    message: "Influencer dashboard stats fetched successfully",
    profileId: profile?._id ?? null,
    stats,
    statCards,
  });
});

export const recordProfileView = asyncHandler(async (req, res) => {
  try {
    await container.recordInfluencerProfileViewUseCase.execute({
      body: req.body,
      viewer: req.user,
    });

    sendSuccess(res, {
      message: "Influencer profile view recorded successfully",
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      return sendSuccess(res, {
        message: "Influencer profile view already recorded",
      });
    }
    throw error;
  }
});
