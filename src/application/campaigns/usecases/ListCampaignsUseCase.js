import { UseCase } from "../../../shared/usecase/UseCase.js";
import { toCampaignCard } from "../mappers/campaignMapper.js";
import { withCampaignOwnerImages } from '../mappers/campaignOwnerImages.js';

export class ListBrandCampaignsUseCase extends UseCase {
  constructor({ campaignRepository }) {
    super();
    this.campaignRepository = campaignRepository;
  }

  async execute({ user }) {
    const campaigns = await withCampaignOwnerImages(await this.campaignRepository.findBrandCampaigns(user.userId));
    return { campaigns, campaignCards: campaigns.map((c) => toCampaignCard(c)) };
  }
}

export class ListAgencyCampaignsUseCase extends UseCase {
  constructor({ campaignRepository }) {
    super();
    this.campaignRepository = campaignRepository;
  }

  async execute({ user }) {
    const campaigns = await withCampaignOwnerImages(await this.campaignRepository.findAgencyCampaigns(user.userId));
    return { campaigns, campaignCards: campaigns.map((c) => toCampaignCard(c)) };
  }
}

export class ListCampaignsForInfluencerUseCase extends UseCase {
  constructor({ campaignRepository, influencerProfileRepository }) {
    super();
    this.campaignRepository = campaignRepository;
    this.influencerProfileRepository = influencerProfileRepository;
  }

  async execute({ user, page = 1, limit = 10 }) {
    const influencerProfile =
      await this.influencerProfileRepository.findByUser(user);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;
    const [rows, total] = await Promise.all([
      this.campaignRepository.findActiveForInfluencer({ limit: safeLimit, skip }),
      this.campaignRepository.countActiveForInfluencer(),
    ]);
    const campaigns = await withCampaignOwnerImages(rows);

    return {
      campaigns: campaigns.map((campaign) =>
        toCampaignCard(campaign, influencerProfile)
      ),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasMore: skip + campaigns.length < total,
      },
    };
  }
}
