const CmsSetting = require("../models/CmsSetting");
const {
  ALLOWED_CITIES,
  PLATFORM_OPTIONS,
  PRIMARY_PLATFORMS,
  CONTENT_CATEGORIES,
  CONTENT_LANGUAGES,
  COLLABORATION_PREFERENCES,
} = require("../constants/onboardingConstants");

const ONBOARDING_SETTINGS_KEY = "influencer_onboarding";

const getDefaultOnboardingSettings = () => ({
  cities: ALLOWED_CITIES,
  platforms: PLATFORM_OPTIONS,
  primaryPlatforms: PRIMARY_PLATFORMS,
  contentCategories: CONTENT_CATEGORIES,
  contentLanguages: CONTENT_LANGUAGES,
  collaborationPreferences: COLLABORATION_PREFERENCES,
});

const normalizeStringArray = (values) => {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];
};

const normalizePlatforms = (platforms) => {
  if (!Array.isArray(platforms)) return [];

  const normalized = platforms
    .map((platform) => {
      if (!platform || typeof platform !== "object") return null;

      const platformKey =
        typeof platform.platform === "string"
          ? platform.platform.trim().toLowerCase()
          : "";
      const label =
        typeof platform.label === "string" ? platform.label.trim() : "";
      const fields = normalizeStringArray(platform.fields);

      if (!platformKey || !label || fields.length === 0) return null;

      return {
        platform: platformKey,
        label,
        fields,
      };
    })
    .filter(Boolean);

  return normalized.filter(
    (platform, index, allPlatforms) =>
      allPlatforms.findIndex((item) => item.platform === platform.platform) ===
      index
  );
};

const normalizeOnboardingSettings = (payload) => {
  const platforms = normalizePlatforms(payload.platforms);
  const platformKeys = platforms.map((platform) => platform.platform);
  const primaryPlatforms = normalizeStringArray(payload.primaryPlatforms).filter(
    (platform) => platformKeys.includes(platform)
  );

  return {
    cities: normalizeStringArray(payload.cities),
    platforms,
    primaryPlatforms,
    contentCategories: normalizeStringArray(payload.contentCategories),
    contentLanguages: normalizeStringArray(payload.contentLanguages),
    collaborationPreferences: normalizeStringArray(
      payload.collaborationPreferences
    ),
  };
};

const validateOnboardingSettings = (settings) => {
  if (settings.cities.length === 0) return "At least 1 city is required";
  if (settings.platforms.length === 0) return "At least 1 platform is required";
  if (settings.primaryPlatforms.length === 0) {
    return "At least 1 primary platform is required";
  }
  if (settings.contentCategories.length < 5) {
    return "At least 5 content categories are required";
  }
  if (settings.contentLanguages.length === 0) {
    return "At least 1 content language is required";
  }
  if (settings.collaborationPreferences.length === 0) {
    return "At least 1 collaboration preference is required";
  }

  return null;
};

const getOnboardingSettings = async () => {
  let setting = await CmsSetting.findOne({ key: ONBOARDING_SETTINGS_KEY });

  if (!setting) {
    setting = await CmsSetting.create({
      key: ONBOARDING_SETTINGS_KEY,
      value: getDefaultOnboardingSettings(),
    });
  }

  return setting.value;
};

const updateOnboardingSettings = async (payload, adminId) => {
  const settings = normalizeOnboardingSettings(payload);
  const validationError = validateOnboardingSettings(settings);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  return CmsSetting.findOneAndUpdate(
    { key: ONBOARDING_SETTINGS_KEY },
    {
      value: settings,
      updatedBy: adminId,
    },
    { upsert: true, new: true, runValidators: true }
  );
};

module.exports = {
  ONBOARDING_SETTINGS_KEY,
  getDefaultOnboardingSettings,
  getOnboardingSettings,
  updateOnboardingSettings,
};
