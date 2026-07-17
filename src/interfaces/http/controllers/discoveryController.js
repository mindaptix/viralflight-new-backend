import { container } from "../../../di/container.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

export const listAgencyInfluencers = asyncHandler(async (req, res) => {
  const { creators } = await container.searchInfluencersUseCase.execute({
    search: req.query.search || req.query.q || "",
    niche: req.query.niche || req.query.category || "",
    city: req.query.city || "",
    limit: req.query.limit,
  });

  sendSuccess(res, {
    count: creators.length,
    influencers: creators,
    creators,
  });
});

export const listBrandCreators = asyncHandler(async (req, res) => {
  const { creators } = await container.searchInfluencersUseCase.execute({
    search: req.query.search || req.query.q || "",
    niche: req.query.niche || req.query.category || "",
    city: req.query.city || "",
    limit: req.query.limit,
  });

  sendSuccess(res, {
    count: creators.length,
    creators,
    influencers: creators,
  });
});
