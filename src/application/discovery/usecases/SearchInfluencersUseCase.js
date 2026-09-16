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

  async execute({ search = "", niche = "", city = "", page = 1, limit = 30 } = {}) {
    const query = buildDiscoveryQuery({
      search: search.trim(),
      niche: niche.trim(),
      city: city.trim(),
    });
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;
    const [profiles, total] = await Promise.all([
      this.influencerProfileRepository.search({ query, limit: safeLimit, skip }),
      this.influencerProfileRepository.count(query),
    ]);

    return {
      creators: profiles.map(toDiscoveryCreatorDto),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasMore: skip + profiles.length < total,
      },
    };
  }
}
