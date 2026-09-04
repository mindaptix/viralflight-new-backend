import mongoose from "mongoose";

import InfluencerProfile from "../../models/InfluencerProfile.js";
import Notification from "../../models/Notification.js";
import ProfileConnection from "../../models/ProfileConnection.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/AppError.js";

const toId = (value) => String(value);

const mapInfluencerSummary = (profile) => {
  if (!profile) return null;

  return {
    id: toId(profile._id),
    name: profile.name || "",
    city: profile.city || "",
    profileImageUrl: profile.profileImageUrl || "",
    instagramHandle: profile.instagramHandle || profile.instagram?.handle || "",
    youtubeHandle: profile.youtubeHandle || "",
    mobile: profile.mobile || "",
  };
};

const mapConnection = (connection, influencerProfile) => ({
  id: toId(connection._id),
  status: connection.status,
  note: connection.note || "",
  connectedAt: connection.connectedAt || connection.createdAt,
  fromUserId: toId(connection.fromUserId),
  fromRole: connection.fromRole,
  influencerProfileId: toId(connection.influencerProfileId),
  influencer: mapInfluencerSummary(influencerProfile),
});

const requireBrandOrAgency = (user) => {
  if (!["brand", "agency"].includes(user.role)) {
    throw new ForbiddenError("Only brand or agency accounts can manage connections");
  }
};

const findInfluencerProfile = async (influencerProfileId) => {
  if (!mongoose.Types.ObjectId.isValid(influencerProfileId)) {
    throw new ValidationError("Valid influencerProfileId is required");
  }

  const profile = await InfluencerProfile.findById(influencerProfileId);
  if (!profile) {
    throw new NotFoundError("Influencer profile not found");
  }

  return profile;
};

export const connectToInfluencer = async ({ user, body = {} }) => {
  requireBrandOrAgency(user);

  const influencerProfileId =
    body.influencerProfileId || body.profileId || body.influencerId;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const profile = await findInfluencerProfile(influencerProfileId);

  const existing = await ProfileConnection.findOne({
    fromUserId: user.userId,
    influencerProfileId: profile._id,
  });

  if (existing?.status === "connected") {
    throw new ConflictError("Already connected to this influencer");
  }

  let connection;
  if (existing) {
    existing.status = "connected";
    existing.note = note;
    existing.connectedAt = new Date();
    existing.removedAt = undefined;
    existing.fromRole = user.role;
    existing.fromMobile = user.mobile;
    existing.influencerUserId = profile.userId;
    existing.influencerMobile = profile.mobile;
    connection = await existing.save();
  } else {
    connection = await ProfileConnection.create({
      fromUserId: user.userId,
      fromRole: user.role,
      fromMobile: user.mobile,
      influencerProfileId: profile._id,
      influencerUserId: profile.userId,
      influencerMobile: profile.mobile,
      note,
      status: "connected",
      connectedAt: new Date(),
    });
  }

  if (profile.userId) {
    await Notification.create({
      userId: profile.userId,
      role: "influencer",
      title: "New connection",
      body: `A ${user.role} connected with your profile`,
      type: "general",
      targetId: toId(connection._id),
      metadata: {
        connectionId: toId(connection._id),
        fromUserId: toId(user.userId),
        fromRole: user.role,
      },
    });
  }

  return {
    message: "Connected successfully",
    connection: mapConnection(connection, profile),
  };
};

export const listConnections = async ({ user }) => {
  if (user.role === "influencer") {
    const profile = await InfluencerProfile.findOne({
      $or: [{ userId: user.userId }, { mobile: user.mobile }],
    }).select("_id");

    if (!profile) {
      return { count: 0, connections: [] };
    }

    const connections = await ProfileConnection.find({
      influencerProfileId: profile._id,
      status: "connected",
    })
      .sort({ connectedAt: -1 })
      .lean();

    return {
      count: connections.length,
      connections: connections.map((item) => mapConnection(item, null)),
    };
  }

  requireBrandOrAgency(user);

  const connections = await ProfileConnection.find({
    fromUserId: user.userId,
    status: "connected",
  })
    .sort({ connectedAt: -1 })
    .lean();

  const profileIds = connections.map((item) => item.influencerProfileId);
  const profiles = await InfluencerProfile.find({
    _id: { $in: profileIds },
  }).lean();
  const profileMap = new Map(profiles.map((item) => [toId(item._id), item]));

  return {
    count: connections.length,
    connections: connections.map((item) =>
      mapConnection(item, profileMap.get(toId(item.influencerProfileId)))
    ),
  };
};

export const getConnectionStatus = async ({ user, influencerProfileId }) => {
  requireBrandOrAgency(user);
  await findInfluencerProfile(influencerProfileId);

  const connection = await ProfileConnection.findOne({
    fromUserId: user.userId,
    influencerProfileId,
    status: "connected",
  }).lean();

  return {
    isConnected: Boolean(connection),
    connection: connection ? mapConnection(connection, null) : null,
  };
};

export const disconnectInfluencer = async ({ user, influencerProfileId }) => {
  requireBrandOrAgency(user);
  await findInfluencerProfile(influencerProfileId);

  const connection = await ProfileConnection.findOne({
    fromUserId: user.userId,
    influencerProfileId,
  });

  if (!connection || connection.status !== "connected") {
    throw new NotFoundError("Connection not found");
  }

  connection.status = "removed";
  connection.removedAt = new Date();
  await connection.save();

  return {
    message: "Disconnected successfully",
    isConnected: false,
  };
};
