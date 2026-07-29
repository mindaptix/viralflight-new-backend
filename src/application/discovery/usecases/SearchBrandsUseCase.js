import { UseCase } from "../../../shared/usecase/UseCase.js";
import {
  buildBrandDiscoveryQuery,
  toDiscoveryBrandDto,
} from "../mappers/brandDiscoveryMapper.js";

export class SearchBrandsUseCase extends UseCase {
  constructor({ brandProfileRepository }) {
    super();
    this.brandProfileRepository = brandProfileRepository;
  }

  async execute({ search = "", industry = "", city = "", limit = 30 } = {}) {
    const query = buildBrandDiscoveryQuery({
      search: search.trim(),
      industry: industry.trim(),
      city: city.trim(),
    });
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const profiles = await this.brandProfileRepository.search({
      query,
      limit: safeLimit,
    });

    return {
      brands: profiles.map(toDiscoveryBrandDto),
      data: profiles.map(toDiscoveryBrandDto),
    };
  }
}
