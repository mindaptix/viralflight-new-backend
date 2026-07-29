import { container } from "../../../di/container.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

export const searchInfluencersPublic = asyncHandler(async (req, res) => {
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
    data: creators,
  });
});

export const searchBrandsPublic = asyncHandler(async (req, res) => {
  const { brands } = await container.searchBrandsUseCase.execute({
    search: req.query.search || req.query.q || "",
    industry: req.query.industry || req.query.niche || "",
    city: req.query.city || "",
    limit: req.query.limit,
  });

  sendSuccess(res, {
    count: brands.length,
    brands,
    data: brands,
  });
});

export const searchAgenciesPublic = asyncHandler(async (req, res) => {
  const { agencies } = await container.searchAgenciesUseCase.execute({
    search: req.query.search || req.query.q || "",
    agencyType: req.query.agencyType || "",
    niche: req.query.niche || req.query.category || "",
    city: req.query.city || "",
    limit: req.query.limit,
  });

  sendSuccess(res, {
    count: agencies.length,
    agencies,
    data: agencies,
  });
});
