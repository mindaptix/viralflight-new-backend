import { container } from "../../../di/container.js";
import { toApplicationDto } from "../../../application/applications/mappers/applicationMapper.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";

export const applyToCampaignController = asyncHandler(async (req, res) => {
  const { application } = await container.applyToCampaignUseCase.execute({
    campaignId: req.params.campaignId,
    body: req.body,
    user: req.user,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: "Application submitted",
    application: toApplicationDto(application),
  });
});

export const getMyApplicationForCampaignController = asyncHandler(
  async (req, res) => {
    const result = await container.getMyApplicationForCampaignUseCase.execute({
      campaignId: req.params.campaignId,
      user: req.user,
    });

    sendSuccess(res, result);
  }
);

export const listMyApplicationsController = asyncHandler(async (req, res) => {
  const { applications } = await container.listMyApplicationsUseCase.execute({
    user: req.user,
  });

  sendSuccess(res, {
    count: applications.length,
    applications,
  });
});

export const listCampaignApplicationsController = asyncHandler(
  async (req, res) => {
    const { applications } =
      await container.listCampaignApplicationsUseCase.execute({
        campaignId: req.params.campaignId,
        user: req.user,
      });

    sendSuccess(res, {
      count: applications.length,
      applications,
    });
  }
);

export const updateApplicationStatusController = asyncHandler(
  async (req, res) => {
    const { application } =
      await container.updateApplicationStatusUseCase.execute({
        applicationId: req.params.applicationId,
        body: req.body,
        user: req.user,
      });

    sendSuccess(res, {
      message: "Application updated",
      application,
    });
  }
);
