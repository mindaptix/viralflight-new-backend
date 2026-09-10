import InfluencerProfile, {
  ALLOWED_CITIES,
  CONTENT_CATEGORIES,
  CONTENT_LANGUAGES,
} from "../../../models/InfluencerProfile.js";
import BrandProfile from "../../../models/BrandProfile.js";
import AgencyProfile from "../../../models/AgencyProfile.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { ValidationError } from "../../../shared/errors/AppError.js";
import {
  getOrCreateRoleProfile,
  normalizeSelectedOptions,
  normalizeText,
  normalizeWebsite,
} from "../../../utils/profileControllerUtils.js";
import { buildMeProfileResponse } from "../../../application/profiles/mappers/roleProfileMapper.js";

const MODEL_BY_ROLE = {
  influencer: InfluencerProfile,
  brand: BrandProfile,
  agency: AgencyProfile,
};

const BLOCKED_KEYS = new Set([
  "mobile",
  "phone",
  "phoneNumber",
  "userId",
  "role",
  "_id",
  "id",
  "createdAt",
  "updatedAt",
  "isProfileComplete",
  "completedAt",
]);

const cleanHandle = (value) => {
  const text = normalizeText(value);
  if (!text) return "";
  return text.startsWith("@") ? text.slice(1) : text;
};

const normalizePhone = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return "";
  return value.replace(/[^\d+]/g, "").trim();
};

const upsertPlatformHandle = (platforms, platform, username) => {
  const list = Array.isArray(platforms) ? [...platforms] : [];
  const index = list.findIndex(
    (item) => String(item.platform || "").toLowerCase() === platform
  );

  if (!username) {
    if (index >= 0) {
      list.splice(index, 1);
    }
    return list;
  }

  const next = {
    platform,
    username,
    engagement: index >= 0 ? list[index].engagement ?? 0 : 0,
    followers: index >= 0 ? list[index].followers ?? 0 : 0,
  };

  if (platform === "youtube") {
    next.channelName = username;
  }

  if (index >= 0) {
    list[index] = { ...list[index], ...next };
  } else {
    list.push(next);
  }

  return list;
};

const applyInfluencerPatch = (profile, body) => {
  if (body.name !== undefined) {
    profile.name = normalizeText(body.name) || profile.name;
  }

  if (body.city !== undefined) {
    const city = normalizeText(body.city);
    if (city && ALLOWED_CITIES.includes(city)) {
      profile.city = city;
    } else if (city === null || city === "") {
      // keep existing if invalid empty; ignore invalid city names
    }
  }

  if (body.bio !== undefined) {
    profile.bio = normalizeText(body.bio) || "";
  }

  if (body.profession !== undefined) {
    profile.profession = normalizeText(body.profession) || "";
  }

  if (body.profileImageUrl !== undefined || body.avatarUrl !== undefined) {
    profile.profileImageUrl =
      normalizeText(body.profileImageUrl ?? body.avatarUrl) || "";
  }

  if (body.portfolioLink !== undefined) {
    profile.portfolioLink = normalizeWebsite(body.portfolioLink) || "";
  }

  if (body.youtubeHandle !== undefined) {
    profile.youtubeHandle = cleanHandle(body.youtubeHandle);
  }

  const categoriesInput =
    body.contentCategories !== undefined
      ? body.contentCategories
      : body.niches;
  if (categoriesInput !== undefined) {
    profile.contentCategories = normalizeSelectedOptions(
      categoriesInput,
      CONTENT_CATEGORIES
    );
  }

  const languagesInput =
    body.contentLanguages !== undefined
      ? body.contentLanguages
      : body.languages;
  if (languagesInput !== undefined) {
    profile.contentLanguages = normalizeSelectedOptions(
      languagesInput,
      CONTENT_LANGUAGES
    );
  }

  const managerNested =
    body.manager && typeof body.manager === "object" ? body.manager : null;
  if (
    body.managerName !== undefined ||
    body.managerMobile !== undefined ||
    managerNested
  ) {
    if (body.managerName !== undefined || managerNested?.name !== undefined) {
      profile.managerName =
        normalizeText(body.managerName ?? managerNested?.name) || "";
    }
    if (
      body.managerMobile !== undefined ||
      managerNested?.mobile !== undefined ||
      managerNested?.whatsapp !== undefined ||
      managerNested?.phone !== undefined
    ) {
      profile.managerMobile =
        normalizePhone(
          body.managerMobile ??
            managerNested?.mobile ??
            managerNested?.whatsapp ??
            managerNested?.phone
        ) || "";
    }
  }

  if (body.instagramHandle !== undefined) {
    const handle = cleanHandle(body.instagramHandle);
    profile.platforms = upsertPlatformHandle(
      profile.platforms,
      "instagram",
      handle
    );
  }

  if (body.youtubeHandle !== undefined) {
    const handle = cleanHandle(body.youtubeHandle);
    profile.platforms = upsertPlatformHandle(
      profile.platforms,
      "youtube",
      handle
    );
  }
};

const applyBrandPatch = (profile, body) => {
  if (body.brandName !== undefined || body.name !== undefined) {
    profile.brandName =
      normalizeText(body.brandName ?? body.name) || profile.brandName;
  }
  if (body.contactName !== undefined || body.contactPerson !== undefined) {
    const contact =
      normalizeText(body.contactName ?? body.contactPerson) || "";
    profile.contactPerson = contact;
    profile.contactName = contact;
  }
  if (body.city !== undefined) {
    profile.city = normalizeText(body.city) || "";
  }
  if (body.industry !== undefined) {
    profile.industry = normalizeText(body.industry) || profile.industry;
  }
  if (body.website !== undefined) {
    profile.website = normalizeWebsite(body.website) || "";
  }
  if (body.instagramHandle !== undefined) {
    profile.instagramHandle = cleanHandle(body.instagramHandle);
  }
  if (body.bio !== undefined || body.description !== undefined) {
    const bio = normalizeText(body.bio ?? body.description) || "";
    profile.bio = bio;
    profile.description = bio;
  }
  if (body.profileImageUrl !== undefined || body.avatarUrl !== undefined) {
    profile.profileImageUrl =
      normalizeText(body.profileImageUrl ?? body.avatarUrl) || "";
  }
};

const applyAgencyPatch = (profile, body) => {
  if (body.agencyName !== undefined || body.name !== undefined) {
    profile.agencyName =
      normalizeText(body.agencyName ?? body.name) || profile.agencyName;
  }
  if (body.contactName !== undefined || body.contactPerson !== undefined) {
    const contact =
      normalizeText(body.contactName ?? body.contactPerson) || "";
    profile.contactPerson = contact;
    profile.contactName = contact;
  }
  if (body.city !== undefined) {
    profile.city = normalizeText(body.city) || "";
  }
  if (body.agencyType !== undefined || body.industry !== undefined) {
    profile.agencyType =
      normalizeText(body.agencyType ?? body.industry) || profile.agencyType;
  }
  if (body.website !== undefined) {
    profile.website = normalizeWebsite(body.website) || "";
  }
  if (body.bio !== undefined || body.description !== undefined) {
    const bio = normalizeText(body.bio ?? body.description) || "";
    profile.bio = bio;
    profile.description = bio;
  }
  if (body.profileImageUrl !== undefined || body.avatarUrl !== undefined) {
    profile.profileImageUrl =
      normalizeText(body.profileImageUrl ?? body.avatarUrl) || "";
  }
  if (body.niches !== undefined || body.focusAreas !== undefined) {
    const value = body.niches ?? body.focusAreas;
    profile.niches = Array.isArray(value)
      ? value.map((item) => String(item).trim()).filter(Boolean)
      : [];
  }
};

const stripBlockedKeys = (body = {}) => {
  const next = { ...body };
  for (const key of BLOCKED_KEYS) {
    delete next[key];
  }
  return next;
};

export const getMyRoleProfile = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const Model = MODEL_BY_ROLE[role];
  if (!Model) {
    throw new ValidationError("Unsupported role");
  }

  const profile = await getOrCreateRoleProfile(req.user, Model);
  res.json(
    buildMeProfileResponse({
      user: req.user,
      profile,
      role,
      onboardingStep: profile.isProfileComplete ? "completed" : "in_progress",
    })
  );
});

export const patchMyRoleProfile = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const Model = MODEL_BY_ROLE[role];
  if (!Model) {
    throw new ValidationError("Unsupported role");
  }

  const body = stripBlockedKeys(req.body || {});
  const profile = await getOrCreateRoleProfile(req.user, Model);

  if (role === "influencer") {
    applyInfluencerPatch(profile, body);
  } else if (role === "brand") {
    applyBrandPatch(profile, body);
  } else if (role === "agency") {
    applyAgencyPatch(profile, body);
  }

  // Never allow identity mobile overwrite even if somehow set on doc
  if (req.user.mobile) {
    profile.mobile = req.user.mobile;
  }
  if (req.user.userId) {
    profile.userId = req.user.userId;
  }

  await profile.save();

  res.json({
    ...buildMeProfileResponse({
      user: req.user,
      profile,
      role,
      onboardingStep: profile.isProfileComplete ? "completed" : "in_progress",
    }),
    message: "Profile updated successfully",
  });
});
