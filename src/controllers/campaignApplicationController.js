import {
  applyToCampaign,
  getMyApplicationForCampaign,
  listCampaignApplications,
  listMyApplications,
  toApplicationResponse,
  updateApplicationStatus,
} from "../services/campaignApplicationService.js";

export const applyToCampaignController = async (req, res) => {
  try {
    const result = await applyToCampaign(req.params.campaignId, req.body, req.user);

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.error,
        ...(result.application ? { application: result.application } : {}),
      });
    }

    res.status(201).json({
      success: true,
      message: "Application submitted",
      application: toApplicationResponse(result.application),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyApplicationForCampaignController = async (req, res) => {
  try {
    const application = await getMyApplicationForCampaign(
      req.params.campaignId,
      req.user
    );

    res.json({
      success: true,
      application,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listMyApplicationsController = async (req, res) => {
  try {
    const applications = await listMyApplications(req.user);

    res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listCampaignApplicationsController = async (req, res) => {
  try {
    const result = await listCampaignApplications(req.params.campaignId, req.user);

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      count: result.applications.length,
      applications: result.applications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateApplicationStatusController = async (req, res) => {
  try {
    const result = await updateApplicationStatus(
      req.params.applicationId,
      req.body,
      req.user
    );

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: "Application updated",
      application: result.application,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
