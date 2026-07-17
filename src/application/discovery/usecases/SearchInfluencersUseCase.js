import { UseCase } from "../../../shared/usecase/UseCase.js";
import {
  buildDiscoveryQuery,
  toDiscoveryCreatorDto,
} from "../mappers/discoveryMapper.js";

export class SearchInfluencersUseCase extends UseCase {
  constructor({ influencerProfileRepository }) {
    super();
    this.influencerProfileRepository = influencerProfileRepository;
  }

  async execute({ search = "", niche = "", city = "", limit = 30 } = {}) {
    const query = buildDiscoveryQuery({
      search: search.trim(),
      niche: niche.trim(),
      city: city.trim(),
    });
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const profiles = await this.influencerProfileRepository.search({
      query,
      limit: safeLimit,
    });

    return {
      creators: profiles.map(toDiscoveryCreatorDto),
    };
  }
}
