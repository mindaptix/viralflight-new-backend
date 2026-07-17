import { CAMPAIGN_STATUSES } from "../../../domain/campaigns/CampaignConstants.js";
import {
  normalizeBudgetAmount,
  normalizeDate,
  normalizeText,
  toStringList,
} from "../../../shared/validation/normalize.js";
import { ValidationError } from "../../../shared/errors/AppError.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";

export class CreateCampaignUseCase extends UseCase {
  constructor({ campaignRepository, profileRepository }) {
    super();
    this.campaignRepository = campaignRepository;
    this.profileRepository = profileRepository;
  }

  async execute({ body, user }) {
    const title = normalizeText(body.title);
    const category = normalizeText(body.category);
    const description = normalizeText(body.description);
    const budgetAmount = normalizeBudgetAmount(body.budgetAmount ?? body.budget);
    const applicationDeadline = normalizeDate(
      body.applicationDeadline ?? body.deadline
    );
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

    if (applicationDeadline === null) {
      throw new ValidationError("Application deadline must be a valid date");
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

    const campaign = await this.campaignRepository.create({
      ownerRole,
      ownerUserId: user.userId,
      ownerProfileId: ownerProfile?._id,
      ownerMobile: user.mobile,
      ownerName,
      brandUserId: ownerRole === "brand" ? user.userId : undefined,
      brandProfileId: ownerRole === "brand" ? ownerProfile?._id : undefined,
      brandMobile: ownerRole === "brand" ? user.mobile : undefined,
      brandName: ownerRole === "brand" ? ownerName : undefined,
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
      coverImageUrl: normalizeText(body.coverImageUrl ?? body.imageUrl),
      location: normalizeText(body.location ?? body.city),
      applicationDeadline,
      status,
    });

    return { campaign };
  }
}
