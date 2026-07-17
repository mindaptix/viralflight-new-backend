import { UseCase } from "../../../shared/usecase/UseCase.js";
import { toCampaignCard } from "../mappers/campaignMapper.js";

export class ListBrandCampaignsUseCase extends UseCase {
  constructor({ campaignRepository }) {
    super();
    this.campaignRepository = campaignRepository;
  }

  async execute({ user }) {
    const campaigns = await this.campaignRepository.findBrandCampaigns(user.userId);
    return { campaigns, campaignCards: campaigns.map((c) => toCampaignCard(c)) };
  }
}

export class ListAgencyCampaignsUseCase extends UseCase {
  constructor({ campaignRepository }) {
    super();
    this.campaignRepository = campaignRepository;
  }

  async execute({ user }) {
    const campaigns = await this.campaignRepository.findAgencyCampaigns(user.userId);
    return { campaigns, campaignCards: campaigns.map((c) => toCampaignCard(c)) };
  }
}

export class ListCampaignsForInfluencerUseCase extends UseCase {
  constructor({ campaignRepository, influencerProfileRepository }) {
    super();
    this.campaignRepository = campaignRepository;
    this.influencerProfileRepository = influencerProfileRepository;
  }

  async execute({ user, limit = 10 }) {
    const influencerProfile =
      await this.influencerProfileRepository.findByUser(user);
    const campaigns = await this.campaignRepository.findActiveForInfluencer({
      limit,
    });

    return {
      campaigns: campaigns.map((campaign) =>
        toCampaignCard(campaign, influencerProfile)
      ),
    };
  }
}
