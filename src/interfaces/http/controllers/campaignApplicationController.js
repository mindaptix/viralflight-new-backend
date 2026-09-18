import { container } from "../../../di/container.js";
import { toApplicationDto } from "../../../application/applications/mappers/applicationMapper.js";
import { initiateCampaignChat } from "../../../application/chat/ChatService.js";
import { getChatIO } from "../../../infrastructure/socket/chatSocket.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import Campaign from "../../../models/Campaign.js";
import Notification from "../../../models/Notification.js";
import { sendPushNotificationSafe } from "../../../infrastructure/notifications/pushNotificationService.js";

export const applyToCampaignController = asyncHandler(async (req, res) => {
  const { application } = await container.applyToCampaignUseCase.execute({
    campaignId: req.params.campaignId,
    body: req.body,
    user: req.user,
  });

  // Notify campaign owner (brand/agency) via in-app notification & FCM push
  try {
    const campaign = await Campaign.findById(req.params.campaignId).lean();
    const ownerUserId = campaign?.ownerUserId || campaign?.brandUserId || campaign?.agencyUserId;
    if (ownerUserId) {
      const influencerName = application.influencerName || "A creator";
      const campaignTitle = campaign?.title || "your campaign";
      const notifTitle = "New Campaign Application! 📥";
      const notifBody = `${influencerName} applied to "${campaignTitle}".`;

      Notification.create({
        userId: ownerUserId,
        role: campaign?.ownerRole || "brand",
        title: notifTitle,
        body: notifBody,
        type: "application_status",
        targetId: String(campaign._id),
        metadata: {
          applicationId: String(application.id || application._id || ""),
          campaignId: String(campaign._id),
          influencerUserId: String(req.user.userId || ""),
        },
      }).catch((err) =>
        console.error("Could not create in-app notification for application:", err.message)
      );

      sendPushNotificationSafe({
        userId: ownerUserId,
        notification: {
          title: notifTitle,
          body: notifBody,
        },
        data: {
          type: "application_submitted",
          campaignId: String(campaign._id),
          applicationId: String(application.id || application._id || ""),
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      });
    }
  } catch (notifErr) {
    console.error("Error triggering application submission notification:", notifErr.message);
  }

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

export const withdrawApplicationController = asyncHandler(async (req, res) => {
  const { application } = await container.withdrawApplicationUseCase.execute({
    applicationId: req.params.applicationId,
    user: req.user,
  });
  sendSuccess(res, { message: "Application withdrawn", application });
});

export const updateApplicationStatusController = asyncHandler(
  async (req, res) => {
    const { application } =
      await container.updateApplicationStatusUseCase.execute({
        applicationId: req.params.applicationId,
        body: req.body,
        user: req.user,
      });

    // When campaign application is accepted, start chat conversation between brand and influencer
    let chatConversation = null;
    if (application.status === "accepted" && application.influencerUserId) {
      try {
        const chatResult = await initiateCampaignChat({
          brandUserId: req.user.userId,
          influencerUserId: application.influencerUserId,
          campaignId: application.campaignId,
          campaignTitle: application.campaignTitle || "",
        });

        chatConversation = chatResult.conversation;

        const io = getChatIO();
        if (io && chatResult.message) {
          const conversationRoom = `conversation:${chatResult.conversation._id}`;
          const recipientRoom = `user:${application.influencerUserId}`;
          io.to(conversationRoom).emit("new_message", {
            conversationId: String(chatResult.conversation._id),
            message: chatResult.message,
          });
          io.to(recipientRoom).emit("new_message", {
            conversationId: String(chatResult.conversation._id),
            message: chatResult.message,
          });
        }
      } catch (chatErr) {
        console.error("Could not initiate campaign chat conversation:", chatErr);
      }
    }

    let notifTitle = "Application Update";
    let notifBody = `Your campaign application is now ${application.status}.`;
    let pushType = `application_${application.status}`;

    if (application.status === "accepted") {
      notifTitle = "Application Accepted! 🎉";
      notifBody = `Your application for '${application.campaignTitle || "campaign"}' was approved.`;
      pushType = "application_accepted";
    } else if (application.status === "rejected") {
      notifTitle = "Application Update";
      notifBody = `Your application for '${application.campaignTitle || "campaign"}' was not accepted.`;
      pushType = "application_rejected";
    } else if (application.status === "shortlisted") {
      notifTitle = "Application Shortlisted! 🌟";
      notifBody = `Your application for '${application.campaignTitle || "campaign"}' has been shortlisted.`;
      pushType = "application_shortlisted";
    }

    await Notification.create({
      userId: application.influencerUserId,
      role: "influencer",
      title: notifTitle,
      body: notifBody,
      type: "application_status",
      targetId: String(application.campaignId || ""),
      metadata: {
        applicationId: String(application.id || application._id || ""),
        status: application.status,
        conversationId: chatConversation ? String(chatConversation._id) : undefined,
      },
    }).catch((error) => {
      console.error("Could not create application notification", error);
    });

    sendPushNotificationSafe({
      userId: application.influencerUserId,
      notification: {
        title: notifTitle,
        body: notifBody,
      },
      data: {
        type: pushType,
        campaignId: String(application.campaignId || ""),
        applicationId: String(application.id || application._id || ""),
        conversationId: chatConversation ? String(chatConversation._id) : "",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    });

    sendSuccess(res, {
      message: "Application updated",
      application,
      conversation_id: chatConversation ? String(chatConversation._id) : undefined,
    });
  }
);
