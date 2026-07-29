import { UseCase } from "../../../shared/usecase/UseCase.js";
import {
  buildAgencyDiscoveryQuery,
  toDiscoveryAgencyDto,
} from "../mappers/brandDiscoveryMapper.js";

export class SearchAgenciesUseCase extends UseCase {
  constructor({ agencyProfileRepository }) {
    super();
    this.agencyProfileRepository = agencyProfileRepository;
  }

  async execute({
    search = "",
    agencyType = "",
    niche = "",
    city = "",
    limit = 30,
  } = {}) {
    const query = buildAgencyDiscoveryQuery({
      search: search.trim(),
      agencyType: agencyType.trim(),
      niche: niche.trim(),
      city: city.trim(),
    });
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const profiles = await this.agencyProfileRepository.search({
      query,
      limit: safeLimit,
    });

    return {
      agencies: profiles.map(toDiscoveryAgencyDto),
      data: profiles.map(toDiscoveryAgencyDto),
    };
  }
}
