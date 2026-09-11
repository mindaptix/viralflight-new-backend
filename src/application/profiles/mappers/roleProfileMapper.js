const cleanHandle = (value) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  return text.startsWith("@") ? text.slice(1) : text;
};

const normalizePhone = (value) => {
  if (typeof value !== "string") return "";
  return value.replace(/[^\d+]/g, "").trim();
};

const resolveAvatarUrl = (profile) => {
  const direct =
    profile.profileImageUrl || profile.avatarUrl || profile.imageUrl || "";
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const ig =
    profile.instagram?.profilePictureUrl ||
    profile.instagram?.profilePicture ||
    "";
  return typeof ig === "string" ? ig.trim() : "";
};

const findPlatformHandle = (platforms, platform) => {
  if (!Array.isArray(platforms)) return "";
  const match = platforms.find(
    (item) => String(item.platform || "").toLowerCase() === platform
  );
  if (!match) return "";
  return cleanHandle(match.username || match.channelName || match.handle || "");
};

const toPlainProfile = (profile) =>
  typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

export const enrichRoleProfileDocument = (profile, role) => {
  const plain = toPlainProfile(profile);
  const avatarUrl = resolveAvatarUrl(plain);
  const categories = plain.contentCategories || plain.niches || [];
  const languages = plain.contentLanguages || plain.languages || [];
  const managerName = (plain.managerName || "").trim();
  const managerMobile = normalizePhone(plain.managerMobile || "");
  const contactWhatsApp = managerMobile || normalizePhone(plain.mobile || "");

  const instagramHandle =
    cleanHandle(plain.instagramHandle) ||
    cleanHandle(plain.instagram?.handle) ||
    findPlatformHandle(plain.platforms, "instagram");
  const youtubeHandle =
    cleanHandle(plain.youtubeHandle) ||
    findPlatformHandle(plain.platforms, "youtube");

  const displayName =
    plain.name ||
    plain.brandName ||
    plain.agencyName ||
    (role === "brand" ? "Brand" : role === "agency" ? "Agency" : "Creator");

  return {
    ...plain,
    id: plain._id,
    _id: plain._id,
    profileId: plain._id,
    name: plain.name || displayName,
    brandName:
      plain.brandName || (role === "brand" ? displayName : plain.brandName),
    agencyName:
      plain.agencyName || (role === "agency" ? displayName : plain.agencyName),
    displayName,
    city: plain.city || "",
    bio: plain.bio || plain.description || "",
    description: plain.description || plain.bio || "",
    profession: plain.profession || "",
    contentCategories: categories,
    niches: categories,
    contentLanguages: languages,
    languages,
    profileImageUrl: avatarUrl,
    avatarUrl,
    imageUrl: avatarUrl,
    managerName,
    managerMobile,
    manager: {
      name: managerName,
      mobile: managerMobile,
      whatsapp: managerMobile,
    },
    contactWhatsApp,
    whatsapp: contactWhatsApp,
    instagramHandle,
    youtubeHandle,
    contactName: plain.contactName || plain.contactPerson || "",
    contactPerson: plain.contactPerson || plain.contactName || "",
  };
};

export const buildRoleProfileFields = (enriched, role) => {
  const fieldsByRole = {
    influencer: [
      ["city", "City"],
      ["bio", "Bio"],
      ["profession", "Profession"],
      ["contentCategories", "Categories"],
      ["contentLanguages", "Languages"],
      ["managerName", "Manager / Agency"],
      ["managerMobile", "Manager WhatsApp"],
      ["instagramHandle", "Instagram"],
      ["youtubeHandle", "YouTube"],
      ["portfolioLink", "Portfolio"],
    ],
    brand: [
      ["brandName", "Brand name"],
      ["contactName", "Contact person"],
      ["city", "City"],
      ["industry", "Industry"],
      ["website", "Website"],
      ["instagramHandle", "Instagram"],
      ["bio", "Bio"],
    ],
    agency: [
      ["agencyName", "Agency name"],
      ["contactName", "Contact person"],
      ["city", "City"],
      ["agencyType", "Agency type"],
      ["website", "Website"],
      ["niches", "Focus areas"],
      ["bio", "Bio"],
    ],
  };

  const list = fieldsByRole[role] || fieldsByRole.influencer;

  return list
    .map(([key, label]) => {
      const value = enriched[key];
      if (value === undefined || value === null || value === "") return null;
      if (Array.isArray(value) && value.length === 0) return null;
      return { key, label, value };
    })
    .filter(Boolean);
};

export const buildMeProfileResponse = ({ user, profile, role, onboardingStep }) => {
  const enriched = enrichRoleProfileDocument(profile, role);
  return {
    success: true,
    message: "Profile fetched successfully",
    onboardingStep: onboardingStep || null,
    user: {
      userId: user.userId,
      _id: user.userId,
      id: user.userId,
      mobile: user.mobile,
      role: user.role || role,
    },
    profile: enriched,
    profileFields: buildRoleProfileFields(enriched, role),
  };
};

export const toPublicCreatorProfile = (profile) => {
  const enriched = enrichRoleProfileDocument(profile, "influencer");
  const platforms = (profile.platforms || []).map((item) => ({
    platform: item.platform,
    username: item.username || item.channelName || "",
    handle: item.username || item.channelName || "",
    followers: item.followers ?? item.subscribers ?? 0,
    followersDisplay: "",
    engagement: item.engagement ?? item.engagementRate ?? 0,
    engagementDisplay:
      item.engagement || item.engagementRate
        ? `${Number(item.engagement ?? item.engagementRate).toFixed(1)}%`
        : "",
    isConnected: Boolean(item.isConnected),
  }));

  return {
    id: enriched._id,
    _id: enriched._id,
    profileId: enriched._id,
    userId: enriched.userId,
    name: enriched.name,
    displayName: enriched.displayName,
    city: enriched.city,
    bio: enriched.bio,
    mobile: enriched.mobile || "",
    whatsapp: enriched.contactWhatsApp,
    contactWhatsApp: enriched.contactWhatsApp,
    managerName: enriched.managerName,
    managerMobile: enriched.managerMobile,
    manager: enriched.manager,
    contentCategories: enriched.contentCategories,
    niches: enriched.niches,
    contentLanguages: enriched.contentLanguages,
    languages: enriched.languages,
    platforms,
    rateRange: profile.rateRange || {},
    pastCollaborations: profile.pastCollaborations || [],
    portfolioLink: profile.portfolioLink || "",
    collaborationPreference: profile.collaborationPreference || "",
    profileImageUrl: enriched.profileImageUrl,
    imageUrl: enriched.imageUrl,
    avatarUrl: enriched.avatarUrl,
    profession: enriched.profession,
    instagramHandle: enriched.instagramHandle,
    youtubeHandle: enriched.youtubeHandle,
    verified: profile.isProfileComplete === true,
    isProfileComplete: profile.isProfileComplete === true,
  };
};
