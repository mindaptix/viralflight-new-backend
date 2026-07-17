import { JwtAuthService } from "../infrastructure/external/auth/JwtAuthService.js";
import { TwilioOtpService } from "../infrastructure/external/otp/TwilioOtpService.js";
import { CampaignApplicationRepository } from "../infrastructure/persistence/mongoose/repositories/CampaignApplicationRepository.js";
import { CampaignRepository } from "../infrastructure/persistence/mongoose/repositories/CampaignRepository.js";
import { InfluencerDashboardRepository } from "../infrastructure/persistence/mongoose/repositories/InfluencerDashboardRepository.js";
import { InfluencerProfileRepository } from "../infrastructure/persistence/mongoose/repositories/InfluencerProfileRepository.js";
import { ProfileRepository } from "../infrastructure/persistence/mongoose/repositories/ProfileRepository.js";
import { UserRepository } from "../infrastructure/persistence/mongoose/repositories/UserRepository.js";

import {
  ApplyToCampaignUseCase,
  GetMyApplicationForCampaignUseCase,
  ListCampaignApplicationsUseCase,
  ListMyApplicationsUseCase,
  UpdateApplicationStatusUseCase,
} from "../application/applications/usecases/CampaignApplicationUseCases.js";
import {
  LogoutUseCase,
  RefreshTokenUseCase,
  SendOtpUseCase,
  VerifyOtpUseCase,
} from "../application/auth/usecases/AuthUseCases.js";
import { CreateCampaignUseCase } from "../application/campaigns/usecases/CreateCampaignUseCase.js";
import {
  ListAgencyCampaignsUseCase,
  ListBrandCampaignsUseCase,
  ListCampaignsForInfluencerUseCase,
} from "../application/campaigns/usecases/ListCampaignsUseCase.js";
import {
  GetInfluencerDashboardStatsUseCase,
  RecordInfluencerProfileViewUseCase,
} from "../application/dashboard/usecases/InfluencerDashboardUseCases.js";
import { SearchInfluencersUseCase } from "../application/discovery/usecases/SearchInfluencersUseCase.js";

const createContainer = () => {
  const userRepository = new UserRepository();
  const profileRepository = new ProfileRepository();
  const campaignRepository = new CampaignRepository();
  const campaignApplicationRepository = new CampaignApplicationRepository();
  const influencerProfileRepository = new InfluencerProfileRepository();
  const influencerDashboardRepository = new InfluencerDashboardRepository();

  const authService = new JwtAuthService();
  const otpService = new TwilioOtpService();

  return {
    // infrastructure
    userRepository,
    profileRepository,
    campaignRepository,
    campaignApplicationRepository,
    influencerProfileRepository,
    influencerDashboardRepository,
    authService,
    otpService,

    // auth
    sendOtpUseCase: new SendOtpUseCase({ userRepository, otpService }),
    verifyOtpUseCase: new VerifyOtpUseCase({
      userRepository,
      profileRepository,
      authService,
      otpService,
    }),
    refreshTokenUseCase: new RefreshTokenUseCase({ userRepository, authService }),
    logoutUseCase: new LogoutUseCase({ userRepository }),

    // campaigns
    createCampaignUseCase: new CreateCampaignUseCase({
      campaignRepository,
      profileRepository,
    }),
    listBrandCampaignsUseCase: new ListBrandCampaignsUseCase({
      campaignRepository,
    }),
    listAgencyCampaignsUseCase: new ListAgencyCampaignsUseCase({
      campaignRepository,
    }),
    listCampaignsForInfluencerUseCase: new ListCampaignsForInfluencerUseCase({
      campaignRepository,
      influencerProfileRepository,
    }),

    // applications
    applyToCampaignUseCase: new ApplyToCampaignUseCase({
      campaignRepository,
      campaignApplicationRepository,
      influencerProfileRepository,
    }),
    getMyApplicationForCampaignUseCase: new GetMyApplicationForCampaignUseCase({
      campaignApplicationRepository,
    }),
    listMyApplicationsUseCase: new ListMyApplicationsUseCase({
      campaignRepository,
      campaignApplicationRepository,
    }),
    listCampaignApplicationsUseCase: new ListCampaignApplicationsUseCase({
      campaignRepository,
      campaignApplicationRepository,
    }),
    updateApplicationStatusUseCase: new UpdateApplicationStatusUseCase({
      campaignRepository,
      campaignApplicationRepository,
    }),

    // discovery
    searchInfluencersUseCase: new SearchInfluencersUseCase({
      influencerProfileRepository,
    }),

    // dashboard
    getInfluencerDashboardStatsUseCase: new GetInfluencerDashboardStatsUseCase({
      influencerDashboardRepository,
      influencerProfileRepository,
    }),
    recordInfluencerProfileViewUseCase: new RecordInfluencerProfileViewUseCase({
      influencerDashboardRepository,
      influencerProfileRepository,
    }),
  };
};

const container = createContainer();

export { createContainer, container };
