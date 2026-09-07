import { container } from "../../../di/container.js";
import { toApplicationDto } from "../../../application/applications/mappers/applicationMapper.js";
import { initiateCampaignChat } from "../../../application/chat/ChatService.js";
import { getChatIO } from "../../../infrastructure/socket/chatSocket.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess } from "../../../shared/http/respond.js";
import Notification from "../../../models/Notification.js";

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

    await Notification.create({
      userId: application.influencerUserId,
      role: "influencer",
      title: "Application update",
      body: `Your campaign application is now ${application.status}.`,
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

    sendSuccess(res, {
      message: "Application updated",
      application,
      conversation_id: chatConversation ? String(chatConversation._id) : undefined,
    });
  }
);
