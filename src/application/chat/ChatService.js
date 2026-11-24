import mongoose from "mongoose";

import AgencyProfile from "../../models/AgencyProfile.js";
import BrandProfile from "../../models/BrandProfile.js";
import Campaign from "../../models/Campaign.js";
import ChatMessage from "../../models/ChatMessage.js";
import Conversation from "../../models/Conversation.js";
import CommunityMembership from "../../models/CommunityMembership.js";
import InfluencerProfile from "../../models/InfluencerProfile.js";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/AppError.js";
import { sendPushNotificationSafe } from "../../infrastructure/notifications/pushNotificationService.js";
import { moderateCommunityMessage } from "./communityModerationService.js";

const toId = (val) => (val ? String(val) : "");

export const mobileLookupCandidates = (value) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  const local = digits.length >= 10 ? digits.slice(-10) : digits;
  return [raw, digits, local, local ? `+91${local}` : ""]
    .filter(Boolean)
    .filter((item, index, values) => values.indexOf(item) === index);
};

const firstPlatformUsername = (profile) => {
  if (!Array.isArray(profile?.platforms)) return "";
  const platform = profile.platforms.find((item) => item?.username?.trim());
  return platform?.username?.trim() || "";
};

export const resolveParticipantDisplayName = ({ user, profile, role }) => {
  if (role === "influencer") {
    return (
      profile?.name?.trim() ||
      user?.displayName?.trim() ||
      profile?.linkedin?.name?.trim() ||
      profile?.instagram?.handle?.trim() ||
      firstPlatformUsername(profile) ||
      "Creator"
    );
  }

  if (role === "brand") {
    return (
      profile?.brandName?.trim() ||
      profile?.contactPerson?.trim() ||
      user?.displayName?.trim() ||
      "Brand"
    );
  }

  if (role === "agency") {
    return (
      profile?.agencyName?.trim() ||
      profile?.contactPerson?.trim() ||
      user?.displayName?.trim() ||
      "Agency"
    );
  }

  return user?.displayName?.trim() || "Partner";
};

export const getParticipantProfile = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  let user = await User.findById(userId).lean();
  let role = user?.role || "";
  let roleProfile = null;

  // Older conversations could store a role-profile ID instead of the login
  // user ID. Resolve those records too so existing chats retain real names.
  if (!user) {
    const [influencerProfile, agencyProfile, brandProfile] = await Promise.all([
      InfluencerProfile.findById(userId).lean(),
      AgencyProfile.findById(userId).lean(),
      BrandProfile.findById(userId).lean(),
    ]);

    if (influencerProfile) {
      role = "influencer";
      roleProfile = influencerProfile;
    } else if (agencyProfile) {
      role = "agency";
      roleProfile = agencyProfile;
    } else if (brandProfile) {
      role = "brand";
      roleProfile = brandProfile;
    } else {
      return null;
    }

    if (roleProfile.userId) {
      user = await User.findById(roleProfile.userId).lean();
    }
    if (!user && roleProfile.mobile) {
      user = await User.findOne({
        mobile: { $in: mobileLookupCandidates(roleProfile.mobile) },
        role,
      }).lean();
    }
  }

  let profile = {
    // Preserve the ID stored in the conversation. It is the identifier the
    // message endpoints and sockets already use for this participant.
    userId: toId(userId),
    mobile: user?.mobile || roleProfile?.mobile || "",
    role,
    name: resolveParticipantDisplayName({ user, profile: roleProfile, role }),
    profileImageUrl: user?.avatar || "",
    city: "",
  };

  if (role === "influencer") {
    const infProfile =
      roleProfile ||
      (await InfluencerProfile.findOne({
        $or: [
          ...(user?._id ? [{ userId: user._id }] : []),
          ...(user?.mobile
            ? [{ mobile: { $in: mobileLookupCandidates(user.mobile) } }]
            : []),
        ],
      }).lean());
    if (infProfile) {
      profile.name = resolveParticipantDisplayName({
        user,
        profile: infProfile,
        role,
      });
      profile.profileImageUrl =
        infProfile.profileImageUrl ||
        infProfile.instagram?.profilePictureUrl ||
        profile.profileImageUrl;
      profile.city = infProfile.city || "";
      profile.instagramHandle =
        infProfile.instagram?.handle || firstPlatformUsername(infProfile);
    }
  } else if (role === "brand") {
    const brandProfile =
      roleProfile ||
      (await BrandProfile.findOne({
        $or: [
          ...(user?._id ? [{ userId: user._id }] : []),
          ...(user?.mobile
            ? [{ mobile: { $in: mobileLookupCandidates(user.mobile) } }]
            : []),
        ],
      }).lean());
    if (brandProfile) {
      profile.name = resolveParticipantDisplayName({
        user,
        profile: brandProfile,
        role,
      });
      profile.profileImageUrl =
        brandProfile.profileImageUrl || profile.profileImageUrl;
      profile.city = brandProfile.city || "";
      profile.industry = brandProfile.industry || "";
    }
  } else if (role === "agency") {
    const agencyProfile =
      roleProfile ||
      (await AgencyProfile.findOne({
        $or: [
          ...(user?._id ? [{ userId: user._id }] : []),
          ...(user?.mobile
            ? [{ mobile: { $in: mobileLookupCandidates(user.mobile) } }]
            : []),
        ],
      }).lean());
    if (agencyProfile) {
      profile.name = resolveParticipantDisplayName({
        user,
        profile: agencyProfile,
        role,
      });
      profile.profileImageUrl =
        agencyProfile.profileImageUrl || profile.profileImageUrl;
      profile.city = agencyProfile.city || "";
    }
  }

  profile.lastSeenAt = user?.lastSeenAt
    ? new Date(user.lastSeenAt).toISOString()
    : null;

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
  created_at: doc.createdAt
    ? new Date(doc.createdAt).toISOString()
    : new Date().toISOString(),
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
  const profilesArray = await Promise.all(
    uniqueOtherIds.map(getParticipantProfile),
  );
  const profileMap = new Map(profilesArray.map((p) => [toId(p?.userId), p]));

  const data = conversations.map((conv) => {
    const otherId = toId(
      conv.participants.find((p) => toId(p) !== currentUserId),
    );
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

export const getConversationMessages = async ({
  user,
  conversationId,
  query = {},
}) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ValidationError("Valid conversation_id is required");
  }

  const currentUserId = toId(user.userId);
  const conversation = await Conversation.findById(conversationId).lean();

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  const isParticipant = conversation.participants.some(
    (p) => toId(p) === currentUserId,
  );
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

    const isParticipant = conversation.participants.some(
      (p) => toId(p) === currentUserId,
    );
    if (!isParticipant) {
      throw new ForbiddenError("Not a participant in this conversation");
    }

    const otherParticipant = conversation.participants.find(
      (p) => toId(p) !== currentUserId,
    );
    targetRecipientId = toId(otherParticipant);
  } else if (targetRecipientId) {
    const res = await getOrCreateConversation({
      user,
      recipientId: targetRecipientId,
    });
    conversation = await Conversation.findById(res.conversation.id);
  } else {
    throw new ValidationError(
      "Either conversation_id or recipient_id is required",
    );
  }

  // Persist community context so reopening the chat cannot bypass moderation.
  if (!conversation.communityId && metadata?.communityId) {
    if (!mongoose.Types.ObjectId.isValid(metadata.communityId)) {
      throw new ValidationError("Invalid community id");
    }
    const membership = await CommunityMembership.findOne({
      communityId: metadata.communityId,
      userId: currentUserId,
      isJoined: true,
      isBanned: { $ne: true },
    });
    if (!membership) {
      throw new ForbiddenError(
        "Join this community before messaging its members",
      );
    }
    conversation.communityId = metadata.communityId;
    await conversation.save();
  }
  await moderateCommunityMessage({
    communityId: conversation.communityId,
    userId: currentUserId,
    conversationId: conversation._id,
    text: trimmedText,
  });

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
    conversation.unreadCounts.set(
      targetRecipientId,
      currentRecipientUnread + 1,
    );
  } else {
    conversation.unreadCounts[targetRecipientId] = currentRecipientUnread + 1;
  }

  await conversation.save();

  // Fire-and-forget push notification to recipient
  getParticipantProfile(currentUserId)
    .then((senderProfile) => {
      const senderName = senderProfile?.name || "New Message";
      const bodyText =
        trimmedText ||
        (mediaType
          ? `Sent an attachment [${mediaType}]`
          : "Sent an attachment");

      sendPushNotificationSafe({
        userId: targetRecipientId,
        notification: {
          title: senderName,
          body: bodyText,
        },
        data: {
          type: "chat_message",
          conversationId: toId(conversation._id),
          senderId: currentUserId,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      });
    })
    .catch((err) => {
      console.error(
        "Error triggering chat message push notification:",
        err.message,
      );
    });

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

  const isParticipant = conversation.participants.some(
    (p) => toId(p) === currentUserId,
  );
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
    },
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
