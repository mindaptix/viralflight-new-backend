import mongoose from "mongoose";

import AgencyProfile from "../../models/AgencyProfile.js";
import BrandProfile from "../../models/BrandProfile.js";
import Campaign from "../../models/Campaign.js";
import ChatMessage from "../../models/ChatMessage.js";
import Conversation from "../../models/Conversation.js";
import InfluencerProfile from "../../models/InfluencerProfile.js";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/AppError.js";

const toId = (val) => (val ? String(val) : "");

export const getParticipantProfile = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  const user = await User.findById(userId).lean();
  if (!user) return null;

  let profile = {
    userId: toId(user._id),
    mobile: user.mobile || "",
    role: user.role,
    name: "",
    profileImageUrl: "",
    city: "",
  };

  if (user.role === "influencer") {
    const infProfile = await InfluencerProfile.findOne({
      $or: [{ userId: user._id }, { mobile: user.mobile }],
    }).lean();
    if (infProfile) {
      profile.name = infProfile.name || "";
      profile.profileImageUrl = infProfile.profileImageUrl || "";
      profile.city = infProfile.city || "";
      profile.instagramHandle = infProfile.instagramHandle || "";
    }
  } else if (user.role === "brand") {
    const brandProfile = await BrandProfile.findOne({
      $or: [{ userId: user._id }, { mobile: user.mobile }],
    }).lean();
    if (brandProfile) {
      profile.name = brandProfile.brandName || brandProfile.contactPerson || "Brand";
      profile.profileImageUrl = brandProfile.profileImageUrl || "";
      profile.city = brandProfile.city || "";
      profile.industry = brandProfile.industry || "";
    }
  } else if (user.role === "agency") {
    const agencyProfile = await AgencyProfile.findOne({
      $or: [{ userId: user._id }, { mobile: user.mobile }],
    }).lean();
    if (agencyProfile) {
      profile.name = agencyProfile.agencyName || agencyProfile.contactPerson || "Agency";
      profile.profileImageUrl = agencyProfile.profileImageUrl || "";
      profile.city = agencyProfile.city || "";
    }
  }

  if (!profile.name) {
    profile.name = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }

  return profile;
};

export const mapChatMessageData = (doc) => ({
  id: toId(doc._id),
  conversation_id: toId(doc.conversationId),
  sender_id: toId(doc.senderId),
  recipient_id: toId(doc.recipientId),
  text: doc.text || "",
  media_url: doc.mediaUrl || null,
  media_type: doc.mediaType || null,
  is_read: Boolean(doc.isRead),
  read_at: doc.readAt ? new Date(doc.readAt).toISOString() : null,
  created_at: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
});

export const getOrCreateConversation = async ({
  user,
  recipientId,
  campaignId,
  campaignTitle,
}) => {
  if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
    throw new ValidationError("Valid recipient_id is required");
  }

  const currentUserId = toId(user.userId);
  const targetRecipientId = toId(recipientId);

  if (currentUserId === targetRecipientId) {
    throw new ValidationError("Cannot create a conversation with yourself");
  }

  const recipientUser = await User.findById(targetRecipientId);
  if (!recipientUser) {
    throw new NotFoundError("Recipient user not found");
  }

  let validCampaignId = null;
  let resolvedCampaignTitle = campaignTitle || "";

  if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
    validCampaignId = campaignId;
    if (!resolvedCampaignTitle) {
      const camp = await Campaign.findById(campaignId).lean();
      if (camp) {
        resolvedCampaignTitle = camp.title || "";
      }
    }
  }

  const queryFilter = {
    participants: { $all: [currentUserId, targetRecipientId], $size: 2 },
  };
  if (validCampaignId) {
    queryFilter.campaignId = validCampaignId;
  }

  let conversation = await Conversation.findOne(queryFilter);

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [currentUserId, targetRecipientId],
      campaignId: validCampaignId,
      campaignTitle: resolvedCampaignTitle,
      status: "active",
      lastMessage: {
        text: "",
        senderId: currentUserId,
        createdAt: new Date(),
      },
      lastMessageAt: new Date(),
      unreadCounts: {
        [currentUserId]: 0,
        [targetRecipientId]: 0,
      },
    });
  }

  const otherParticipant = await getParticipantProfile(targetRecipientId);
  const unreadCount =
    (conversation.unreadCounts &&
      (conversation.unreadCounts.get?.(currentUserId) ??
        conversation.unreadCounts[currentUserId])) ||
    0;

  return {
    conversation: {
      id: toId(conversation._id),
      participants: conversation.participants.map(toId),
      recipient: otherParticipant,
      campaign_id: toId(conversation.campaignId) || null,
      campaign_title: conversation.campaignTitle || "",
      last_message: conversation.lastMessage?.text || "",
      last_message_sender_id: toId(conversation.lastMessage?.senderId),
      last_message_at: conversation.lastMessageAt
        ? new Date(conversation.lastMessageAt).toISOString()
        : null,
      unread_count: unreadCount,
      created_at: conversation.createdAt
        ? new Date(conversation.createdAt).toISOString()
        : new Date().toISOString(),
    },
  };
};

export const initiateCampaignChat = async ({
  brandUserId,
  influencerUserId,
  campaignId,
  campaignTitle,
  initialMessageText,
}) => {
  const brandId = toId(brandUserId);
  const influencerId = toId(influencerUserId);

  let conversation = await Conversation.findOne({
    participants: { $all: [brandId, influencerId], $size: 2 },
    ...(campaignId ? { campaignId } : {}),
  });

  let resolvedTitle = campaignTitle || "";
  if (!resolvedTitle && campaignId) {
    const camp = await Campaign.findById(campaignId).lean();
    if (camp) resolvedTitle = camp.title || "";
  }

  const welcomeText =
    initialMessageText ||
    `🎉 Campaign accepted! You can now collaborate and discuss "${resolvedTitle || "campaign"}" directly here.`;

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [brandId, influencerId],
      campaignId: campaignId || null,
      campaignTitle: resolvedTitle,
      status: "active",
      lastMessage: {
        text: welcomeText,
        senderId: brandId,
        createdAt: new Date(),
      },
      lastMessageAt: new Date(),
      unreadCounts: {
        [brandId]: 0,
        [influencerId]: 1,
      },
    });
  }

  const firstMessage = await ChatMessage.create({
    conversationId: conversation._id,
    senderId: brandId,
    recipientId: influencerId,
    text: welcomeText,
    isRead: false,
  });

  return {
    conversation,
    message: mapChatMessageData(firstMessage),
  };
};

export const listUserConversations = async ({ user, query = {} }) => {
  const currentUserId = toId(user.userId);
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { participants: currentUserId };

  if (query.campaign_id || query.campaignId) {
    filter.campaignId = query.campaign_id || query.campaignId;
  }

  const [total, conversations] = await Promise.all([
    Conversation.countDocuments(filter),
    Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const otherUserIds = conversations.map((conv) => {
    const otherId = conv.participants.find((p) => toId(p) !== currentUserId);
    return toId(otherId);
  });

  const uniqueOtherIds = [...new Set(otherUserIds.filter(Boolean))];
  const profilesArray = await Promise.all(uniqueOtherIds.map(getParticipantProfile));
  const profileMap = new Map(profilesArray.map((p) => [toId(p?.userId), p]));

  const data = conversations.map((conv) => {
    const otherId = toId(conv.participants.find((p) => toId(p) !== currentUserId));
    const unreadCount =
      (conv.unreadCounts &&
        (conv.unreadCounts[currentUserId] ??
          (typeof conv.unreadCounts.get === "function" &&
            conv.unreadCounts.get(currentUserId)))) ||
      0;

    return {
      id: toId(conv._id),
      participants: conv.participants.map(toId),
      recipient: profileMap.get(otherId) || { userId: otherId, name: "User" },
      campaign_id: toId(conv.campaignId) || null,
      campaign_title: conv.campaignTitle || "",
      last_message: conv.lastMessage?.text || "",
      last_message_sender_id: toId(conv.lastMessage?.senderId),
      last_message_at: conv.lastMessageAt
        ? new Date(conv.lastMessageAt).toISOString()
        : null,
      unread_count: unreadCount,
      created_at: conv.createdAt
        ? new Date(conv.createdAt).toISOString()
        : new Date().toISOString(),
    };
  });

  return {
    data,
    pagination: {
      total,
      page,
      limit,
    },
  };
};

export const getConversationMessages = async ({ user, conversationId, query = {} }) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ValidationError("Valid conversation_id is required");
  }

  const currentUserId = toId(user.userId);
  const conversation = await Conversation.findById(conversationId).lean();

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  const isParticipant = conversation.participants.some((p) => toId(p) === currentUserId);
  if (!isParticipant) {
    throw new ForbiddenError("You are not a participant in this conversation");
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const filter = { conversationId: conversation._id };

  const [total, messages] = await Promise.all([
    ChatMessage.countDocuments(filter),
    ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    data: messages.map(mapChatMessageData),
    pagination: {
      total,
      page,
      limit,
    },
  };
};

export const sendMessage = async ({
  user,
  conversationId,
  recipientId,
  text,
  mediaUrl,
  mediaType,
  metadata = {},
}) => {
  const currentUserId = toId(user.userId);
  const trimmedText = typeof text === "string" ? text.trim() : "";

  if (!trimmedText && !mediaUrl) {
    throw new ValidationError("Message text or media is required");
  }

  let conversation;
  let targetRecipientId = recipientId ? toId(recipientId) : null;

  if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
    conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError("Conversation not found");
    }

    const isParticipant = conversation.participants.some((p) => toId(p) === currentUserId);
    if (!isParticipant) {
      throw new ForbiddenError("Not a participant in this conversation");
    }

    const otherParticipant = conversation.participants.find((p) => toId(p) !== currentUserId);
    targetRecipientId = toId(otherParticipant);
  } else if (targetRecipientId) {
    const res = await getOrCreateConversation({ user, recipientId: targetRecipientId });
    conversation = await Conversation.findById(res.conversation.id);
  } else {
    throw new ValidationError("Either conversation_id or recipient_id is required");
  }

  const chatMessage = await ChatMessage.create({
    conversationId: conversation._id,
    senderId: currentUserId,
    recipientId: targetRecipientId,
    text: trimmedText,
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || null,
    metadata,
    isRead: false,
  });

  conversation.lastMessage = {
    text: trimmedText || (mediaType ? `[${mediaType}]` : "[Attachment]"),
    senderId: currentUserId,
    createdAt: new Date(),
  };
  conversation.lastMessageAt = new Date();

  if (!conversation.unreadCounts) {
    conversation.unreadCounts = new Map();
  }
  const currentRecipientUnread =
    (typeof conversation.unreadCounts.get === "function"
      ? conversation.unreadCounts.get(targetRecipientId)
      : conversation.unreadCounts[targetRecipientId]) || 0;

  if (typeof conversation.unreadCounts.set === "function") {
    conversation.unreadCounts.set(targetRecipientId, currentRecipientUnread + 1);
  } else {
    conversation.unreadCounts[targetRecipientId] = currentRecipientUnread + 1;
  }

  await conversation.save();

  return {
    message: mapChatMessageData(chatMessage),
    conversationId: toId(conversation._id),
    recipientId: targetRecipientId,
  };
};

export const markConversationRead = async ({ user, conversationId }) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ValidationError("Valid conversation_id is required");
  }

  const currentUserId = toId(user.userId);
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  const isParticipant = conversation.participants.some((p) => toId(p) === currentUserId);
  if (!isParticipant) {
    throw new ForbiddenError("Not a participant in this conversation");
  }

  const readAt = new Date();
  await ChatMessage.updateMany(
    {
      conversationId: conversation._id,
      recipientId: currentUserId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt,
      },
    }
  );

  if (conversation.unreadCounts) {
    if (typeof conversation.unreadCounts.set === "function") {
      conversation.unreadCounts.set(currentUserId, 0);
    } else {
      conversation.unreadCounts[currentUserId] = 0;
    }
    await conversation.save();
  }

  return {
    success: true,
    message: "Conversation marked as read",
    conversation_id: toId(conversation._id),
    read_at: readAt.toISOString(),
  };
};
