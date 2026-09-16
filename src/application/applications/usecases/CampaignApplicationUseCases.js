import { APPLICATION_STATUSES } from "../../../domain/campaigns/CampaignConstants.js";
import {
  isCampaignOpen,
  isCampaignOwner,
} from "../../../domain/campaigns/CampaignRules.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/AppError.js";
import {
  normalizeLinks,
  normalizeText,
} from "../../../shared/validation/normalize.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";
import InfluencerProfile from "../../../models/InfluencerProfile.js";
import {
  toApplicationDto,
  toApplicationWithCampaignDto,
  toOwnerApplicationDto,
} from "../mappers/applicationMapper.js";

export class ApplyToCampaignUseCase extends UseCase {
  constructor({
    campaignRepository,
    campaignApplicationRepository,
    influencerProfileRepository,
  }) {
    super();
    this.campaignRepository = campaignRepository;
    this.campaignApplicationRepository = campaignApplicationRepository;
    this.influencerProfileRepository = influencerProfileRepository;
  }

  async execute({ campaignId, body, user }) {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!isCampaignOpen(campaign)) {
      throw new NotFoundError("Campaign not found or closed");
    }

    const note =
      normalizeText(body.note) ||
      normalizeText(body.pitch) ||
      normalizeText(body.message);
    const proposedRate = Number(
      body.proposedRate ?? body.quotedRate?.amount ?? body.quotedAmount
    );
    const currency =
      normalizeText(body.currency ?? body.quotedRate?.currency) || "INR";

    if (!note || note.length < 10) {
      throw new ValidationError("Add a short pitch (at least 10 characters)");
    }

    if (!Number.isFinite(proposedRate) || proposedRate <= 0) {
      throw new ValidationError("proposedRate must be greater than 0");
    }

    const existing =
      await this.campaignApplicationRepository.findByCampaignAndUser(
        campaign._id,
        user.userId
      );

    if (existing) {
      throw new ConflictError("Already applied", {
        application: toApplicationDto(existing),
      });
    }

    const influencerProfile =
      await this.influencerProfileRepository.findByUser(user);
    const application = await this.campaignApplicationRepository.create({
      campaignId: campaign._id,
      influencerUserId: user.userId,
      influencerProfileId: influencerProfile?._id,
      influencerName: influencerProfile?.name || "Creator",
      influencerMobile: user.mobile,
      note,
      pitch: note,
      proposedRate,
      currency,
      portfolioLinks: normalizeLinks(body.portfolioLinks),
      status: "applied",
    });

    return { application };
  }
}

export class GetMyApplicationForCampaignUseCase extends UseCase {
  constructor({ campaignApplicationRepository }) {
    super();
    this.campaignApplicationRepository = campaignApplicationRepository;
  }

  async execute({ campaignId, user }) {
    const application =
      await this.campaignApplicationRepository.findByCampaignAndUser(
        campaignId,
        user.userId
      );

    return {
      application: application ? toApplicationDto(application) : null,
    };
  }
}

export class ListMyApplicationsUseCase extends UseCase {
  constructor({ campaignRepository, campaignApplicationRepository }) {
    super();
    this.campaignRepository = campaignRepository;
    this.campaignApplicationRepository = campaignApplicationRepository;
  }

  async execute({ user }) {
    const applications =
      await this.campaignApplicationRepository.findByInfluencer(user.userId);
    const campaignIds = applications.map((item) => item.campaignId);
    const campaigns = await this.campaignRepository.findByIds(campaignIds);
    const campaignMap = new Map(
      campaigns.map((campaign) => [String(campaign._id), campaign])
    );

    return {
      applications: applications.map((application) =>
        toApplicationWithCampaignDto(
          application,
          campaignMap.get(String(application.campaignId))
        )
      ),
    };
  }
}

export class ListCampaignApplicationsUseCase extends UseCase {
  constructor({ campaignRepository, campaignApplicationRepository }) {
    super();
    this.campaignRepository = campaignRepository;
    this.campaignApplicationRepository = campaignApplicationRepository;
  }

  async execute({ campaignId, user }) {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    if (!isCampaignOwner(campaign, user)) {
      throw new ForbiddenError("Not your campaign");
    }

    const applications =
      await this.campaignApplicationRepository.findByCampaign(campaign._id);
    const profileIds = applications
      .map((application) => application.influencerProfileId)
      .filter(Boolean);
    const userIds = applications
      .map((application) => application.influencerUserId)
      .filter(Boolean);
    const profiles =
      profileIds.length || userIds.length
        ? await InfluencerProfile.find({
            $or: [
              ...(profileIds.length ? [{ _id: { $in: profileIds } }] : []),
              ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
            ],
          }).lean()
        : [];
    const profileById = new Map(
      profiles.map((profile) => [String(profile._id), profile])
    );
    const profileByUserId = new Map(
      profiles
        .filter((profile) => profile.userId)
        .map((profile) => [String(profile.userId), profile])
    );

    return {
      applications: applications.map((application) =>
        toOwnerApplicationDto(
          application,
          profileById.get(String(application.influencerProfileId)) ||
            profileByUserId.get(String(application.influencerUserId))
        )
      ),
    };
  }
}

export class UpdateApplicationStatusUseCase extends UseCase {
  constructor({ campaignRepository, campaignApplicationRepository }) {
    super();
    this.campaignRepository = campaignRepository;
    this.campaignApplicationRepository = campaignApplicationRepository;
  }

  async execute({ applicationId, body, user }) {
    const application =
      await this.campaignApplicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundError("Application not found");
    }

    const campaign = await this.campaignRepository.findById(
      application.campaignId
    );
    if (!campaign) {
      throw new NotFoundError("Campaign not found");
    }

    if (!isCampaignOwner(campaign, user)) {
      throw new ForbiddenError("Not your campaign");
    }

    const nextStatus = normalizeText(body.status);
    if (!nextStatus || !APPLICATION_STATUSES.includes(nextStatus)) {
      throw new ValidationError(
        `Valid status is required: ${APPLICATION_STATUSES.join(", ")}`
      );
    }

    application.status = nextStatus;
    application.ownerMessage = normalizeText(body.message) || "";
    await this.campaignApplicationRepository.save(application);

    return { application: toApplicationDto(application) };
  }
}
