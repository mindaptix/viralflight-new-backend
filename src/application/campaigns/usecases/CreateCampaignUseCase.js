import { CAMPAIGN_STATUSES } from "../../../domain/campaigns/CampaignConstants.js";
import {
  normalizeBudgetAmount,
  normalizeDate,
  normalizeText,
  toStringList,
} from "../../../shared/validation/normalize.js";
import { ValidationError } from "../../../shared/errors/AppError.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";
import BrandProfile from "../../../models/BrandProfile.js";

export class CreateCampaignUseCase extends UseCase {
  constructor({ campaignRepository, profileRepository }) {
    super();
    this.campaignRepository = campaignRepository;
    this.profileRepository = profileRepository;
  }

  async execute({ body, user }) {
    const rawImages = body.imageUrls ?? [];
    if (!Array.isArray(rawImages) || rawImages.length > 9 || rawImages.some((url) => {
      if (typeof url !== "string") return true;
      try { return !["http:", "https:"].includes(new URL(url).protocol); }
      catch { return true; }
    })) throw new ValidationError("Provide up to 9 valid additional image URLs");
    const imageUrls = [...new Set(rawImages.map((url) => url.trim()))];
    const title = normalizeText(body.title);
    const category = normalizeText(body.category);
    const description = normalizeText(body.description);
    const budgetAmount = normalizeBudgetAmount(body.budgetAmount ?? body.budget);
    const applicationDeadline = normalizeDate(
      body.applicationDeadline ?? body.deadline
    );
    const startDate = normalizeDate(body.startDate);
    const endDate = normalizeDate(body.endDate);
    const status = normalizeText(body.status) || "active";

    if (!title || title.length < 2) {
      throw new ValidationError(
        "Campaign title is required and must be at least 2 characters"
      );
    }

    if (!category) {
      throw new ValidationError("Campaign category is required");
    }

    if (budgetAmount === null) {
      throw new ValidationError("Budget amount must be a valid positive number");
    }

    if (applicationDeadline == null) {
      throw new ValidationError("Application deadline must be a valid date");
    }
    if (startDate == null || endDate == null) {
      throw new ValidationError("Campaign startDate and endDate must be valid dates");
    }
    if (endDate < startDate) {
      throw new ValidationError("Campaign endDate must be on or after startDate");
    }
    if (applicationDeadline > startDate) {
      throw new ValidationError("Application deadline cannot be after campaign startDate");
    }

    if (!CAMPAIGN_STATUSES.includes(status)) {
      throw new ValidationError(
        `Valid status is required: ${CAMPAIGN_STATUSES.join(", ")}`
      );
    }

    if (!["brand", "agency"].includes(user.role)) {
      throw new ValidationError("Only brand or agency accounts can create campaigns");
    }

    const ownerProfile = await this.profileRepository.findOwnerProfile(user);
    const profileOwnerName = normalizeText(
      ownerProfile?.agencyName || ownerProfile?.brandName
    );
    const ownerRole = user.role;
    const requestOwnerName =
      normalizeText(body.ownerName) ||
      normalizeText(body.creatorName) ||
      normalizeText(body.brandName) ||
      normalizeText(body.agencyName);
    const ownerName = requestOwnerName || profileOwnerName;
    let representedBrand = null;
    if (ownerRole === "agency" && body.representedBrandProfileId) {
      representedBrand = await BrandProfile.findOne({
        _id: body.representedBrandProfileId,
        isProfileComplete: true,
      });
      if (!representedBrand) {
        throw new ValidationError("Represented brand profile was not found");
      }
    }

    const campaign = await this.campaignRepository.create({
      ownerRole,
      ownerUserId: user.userId,
      ownerProfileId: ownerProfile?._id,
      ownerMobile: user.mobile,
      ownerName,
      brandUserId: ownerRole === "brand" ? user.userId : representedBrand?.userId,
      brandProfileId: ownerRole === "brand" ? ownerProfile?._id : representedBrand?._id,
      brandMobile: ownerRole === "brand" ? user.mobile : representedBrand?.mobile,
      brandName: ownerRole === "brand" ? ownerName : representedBrand?.brandName,
      agencyUserId: ownerRole === "agency" ? user.userId : undefined,
      agencyProfileId: ownerRole === "agency" ? ownerProfile?._id : undefined,
      agencyMobile: ownerRole === "agency" ? user.mobile : undefined,
      agencyName: ownerRole === "agency" ? ownerName : undefined,
      title,
      description,
      category,
      platforms: toStringList(body.platforms),
      deliverables: toStringList(body.deliverables),
      budgetAmount,
      budgetCurrency: normalizeText(body.budgetCurrency ?? body.currency) || "INR",
      coverImageUrl: normalizeText(body.coverImageUrl ?? body.imageUrl) || imageUrls[0],
      imageUrls,
      location: normalizeText(body.location ?? body.city),
      applicationDeadline,
      startDate,
      endDate,
      termsAndConditions: normalizeText(body.termsAndConditions ?? body.terms),
      specialInstructions: normalizeText(body.specialInstructions ?? body.instructions),
      status,
    });

    return { campaign };
  }
}
