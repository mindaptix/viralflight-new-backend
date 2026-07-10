import BrandInvite from "../models/BrandInvite.js";
import Collaboration from "../models/Collaboration.js";
import InfluencerProfile from "../models/InfluencerProfile.js";
import InfluencerProfileView from "../models/InfluencerProfileView.js";

const getInfluencerProfile = async (user) =>
  InfluencerProfile.findOne({
    $or: [{ userId: user.userId }, { mobile: user.mobile }],
  });

const buildInfluencerMatch = (profile, user) => ({
  $or: [
    { influencerProfileId: profile._id },
    { influencerUserId: user.userId },
    { influencerMobile: user.mobile },
  ],
});

const formatCompactCount = (count) => {
  if (count >= 1000000) {
    return `${Number((count / 1000000).toFixed(1))}M`;
  }

  if (count >= 1000) {
    return `${Number((count / 1000).toFixed(1))}K`;
  }

  return String(count);
};

const getInfluencerDashboardStats = async (user) => {
  const profile = await getInfluencerProfile(user);

  if (!profile) {
    return {
      profile: null,
      stats: {
        profileViews: 0,
        brandInvites: 0,
        activeCollabs: 0,
      },
      statCards: [
        { key: "profileViews", label: "Profile views", value: 0, displayValue: "0" },
        { key: "brandInvites", label: "Brand invites", value: 0, displayValue: "0" },
        { key: "activeCollabs", label: "Active collabs", value: 0, displayValue: "0" },
      ],
    };
  }

  const influencerMatch = buildInfluencerMatch(profile, user);
  const [profileViews, brandInvites, activeCollabs] = await Promise.all([
    InfluencerProfileView.countDocuments(influencerMatch),
    BrandInvite.countDocuments({
      ...influencerMatch,
      status: "pending",
    }),
    Collaboration.countDocuments({
      ...influencerMatch,
      status: "active",
    }),
  ]);

  const stats = {
    profileViews,
    brandInvites,
    activeCollabs,
  };

  return {
    profile,
    stats,
    statCards: [
      {
        key: "profileViews",
        label: "Profile views",
        value: profileViews,
        displayValue: formatCompactCount(profileViews),
      },
      {
        key: "brandInvites",
        label: "Brand invites",
        value: brandInvites,
        displayValue: formatCompactCount(brandInvites),
      },
      {
        key: "activeCollabs",
        label: "Active collabs",
        value: activeCollabs,
        displayValue: formatCompactCount(activeCollabs),
      },
    ],
  };
};

const recordInfluencerProfileView = async ({ influencerProfile, viewer }) => {
  const view = await InfluencerProfileView.findOneAndUpdate(
    {
      influencerProfileId: influencerProfile._id,
      viewerUserId: viewer.userId,
    },
    {
      influencerProfileId: influencerProfile._id,
      influencerUserId: influencerProfile.userId,
      influencerMobile: influencerProfile.mobile,
      viewerUserId: viewer.userId,
      viewerMobile: viewer.mobile,
      viewerRole: viewer.role,
      lastViewedAt: new Date(),
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return view;
};

export {
  getInfluencerDashboardStats,
  getInfluencerProfile,
  recordInfluencerProfileView,
};
