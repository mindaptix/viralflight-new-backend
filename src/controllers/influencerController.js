import InfluencerProfile from "../models/InfluencerProfile.js";
import {
  getOnboardingSettings,
} from "../services/onboardingSettingsService.js";

const normalizeCity = (city, cities) => {
  if (!city || typeof city !== "string") return null;

  return cities.find(
    (allowedCity) => allowedCity.toLowerCase() === city.trim().toLowerCase()
  );
};

const normalizeSelectedValues = (values, allowedValues) => {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .map((value) => {
          if (!value || typeof value !== "string") return null;

          return allowedValues.find(
            (allowedValue) =>
              allowedValue.toLowerCase() === value.trim().toLowerCase()
          );
        })
        .filter(Boolean)
    ),
  ];
};

const normalizeStringList = (values) => {
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

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

const getPlatformRequiredFields = (settings) =>
  settings.platforms.reduce((fields, option) => {
    fields[option.platform] = option.fields;
    return fields;
  }, {});

const hasPrimaryPlatform = (profile, settings) =>
  profile.platforms.some((item) =>
    settings.primaryPlatforms.includes(item.platform)
  );

const getOnboardingStep = (profile, settings) => {
  if (!profile.name || !profile.city) return "basic-info";
  if (!profile.platforms || !hasPrimaryPlatform(profile, settings)) {
    return "connect-platform";
  }
  if (
    !profile.contentCategories ||
    profile.contentCategories.length < 5 ||
    !profile.contentLanguages ||
    profile.contentLanguages.length === 0
  ) {
    return "content-preferences";
  }
  if (!profile.isProfileComplete) return "finish-profile";

  return "completed";
};

const getProfileQuery = (user) =>
  user.userId ? { userId: user.userId } : { mobile: user.mobile };

const getOrCreateProfile = async (user) => {
  let profile = await InfluencerProfile.findOne(getProfileQuery(user));

  if (!profile) {
    profile = await InfluencerProfile.create({
      userId: user.userId,
      mobile: user.mobile,
    });
  } else if (user.userId && !profile.userId) {
    profile.userId = user.userId;
    await profile.save();
  }

  return profile;
};

export const saveBasicInfo = async (req, res) => {
  try {
    const settings = await getOnboardingSettings();
    const { name, city } = req.body;
    const selectedCity = normalizeCity(city, settings.cities);

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name is required and must be at least 2 characters",
      });
    }

    if (!selectedCity) {
      return res.status(400).json({
        success: false,
        message: `Valid city is required: ${settings.cities.join(", ")}`,
      });
    }

    const profile = await InfluencerProfile.findOneAndUpdate(
      getProfileQuery(req.user),
      {
        userId: req.user.userId,
        mobile: req.user.mobile,
        name: name.trim(),
        city: selectedCity,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Basic info saved successfully",
      onboardingStep: getOnboardingStep(profile, settings),
      nextStep: "connect-platform",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const connectPlatform = async (req, res) => {
  try {
    const settings = await getOnboardingSettings();
    const allowedPlatforms = settings.platforms.map((item) => item.platform);
    const platformRequiredFields = getPlatformRequiredFields(settings);
    const { platform } = req.body;

    if (!allowedPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: `Valid platform is required: ${allowedPlatforms.join(", ")}`,
      });
    }

    const profile = await getOrCreateProfile(req.user);

    if (!profile.name || !profile.city) {
      return res.status(400).json({
        success: false,
        message: "Please complete name and city before connecting a platform",
      });
    }

    if (
      profile.platforms.length === 0 &&
      !settings.primaryPlatforms.includes(platform)
    ) {
      return res.status(400).json({
        success: false,
        message: `Please connect ${settings.primaryPlatforms.join(
          ", "
        )} before adding more platforms`,
      });
    }

    const requiredFields = platformRequiredFields[platform];
    const platformData = { platform };

    for (const field of requiredFields) {
      const value = req.body[field];

      if (value === undefined || value === null || value === "") {
        return res.status(400).json({
          success: false,
          message: `${field} is required for ${platform}`,
        });
      }

      platformData[field] =
        typeof value === "string" ? value.trim() : Number(value);
    }

    if (
      platformData.followers !== undefined &&
      (!Number.isFinite(platformData.followers) || platformData.followers < 0)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Followers must be a valid number" });
    }

    if (
      platformData.subscribers !== undefined &&
      (!Number.isFinite(platformData.subscribers) ||
        platformData.subscribers < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Subscribers must be a valid number",
      });
    }

    if (
      !Number.isFinite(platformData.engagement) ||
      platformData.engagement < 0 ||
      platformData.engagement > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Engagement must be a valid percentage from 0 to 100",
      });
    }

    const platformIndex = profile.platforms.findIndex(
      (item) => item.platform === platform
    );

    if (platformIndex >= 0) {
      profile.platforms[platformIndex] = platformData;
    } else {
      profile.platforms.push(platformData);
    }

    await profile.save();

    res.json({
      success: true,
      message: `${platform} connected successfully`,
      onboardingStep: getOnboardingStep(profile, settings),
      nextStep: getOnboardingStep(profile, settings),
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveContentPreferences = async (req, res) => {
  try {
    const settings = await getOnboardingSettings();
    const profile = await getOrCreateProfile(req.user);

    if (!profile.platforms || !hasPrimaryPlatform(profile, settings)) {
      return res.status(400).json({
        success: false,
        message: `Please connect ${settings.primaryPlatforms.join(", ")} first`,
      });
    }

    const contentCategories = normalizeSelectedValues(
      req.body.contentCategories,
      settings.contentCategories
    );
    const contentLanguages = normalizeSelectedValues(
      req.body.contentLanguages,
      settings.contentLanguages
    );

    if (contentCategories.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please select at least 5 content categories",
      });
    }

    if (contentLanguages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least 1 content language",
      });
    }

    profile.contentCategories = contentCategories;
    profile.contentLanguages = contentLanguages;
    profile.isProfileComplete = false;
    profile.completedAt = undefined;

    await profile.save();

    res.json({
      success: true,
      message: "Content preferences saved successfully",
      onboardingStep: getOnboardingStep(profile, settings),
      nextStep: "finish-profile",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const finishProfile = async (req, res) => {
  try {
    const settings = await getOnboardingSettings();
    const profile = await getOrCreateProfile(req.user);

    if (getOnboardingStep(profile, settings) === "basic-info") {
      return res
        .status(400)
        .json({ success: false, message: "Please complete basic info first" });
    }

    if (getOnboardingStep(profile, settings) === "connect-platform") {
      return res.status(400).json({
        success: false,
        message: "Please connect Instagram, YouTube, or TikTok first",
      });
    }

    if (getOnboardingStep(profile, settings) === "content-preferences") {
      return res.status(400).json({
        success: false,
        message: "Please complete content preferences first",
      });
    }

    const bio = typeof req.body.bio === "string" ? req.body.bio.trim() : "";
    const collaborationPreferences = normalizeSelectedValues(
      req.body.collaborationPreferences,
      settings.collaborationPreferences
    );
    const pastCollaborations = normalizeStringList(req.body.pastCollaborations);
    const portfolioLinks = normalizeStringList(req.body.portfolioLinks);
    const rateRange = req.body.rateRange || {};
    const minRate = Number(rateRange.min);
    const maxRate = Number(rateRange.max);
    const currency =
      typeof rateRange.currency === "string" && rateRange.currency.trim()
        ? rateRange.currency.trim().toUpperCase()
        : "INR";

    if (bio.length < 30) {
      return res.status(400).json({
        success: false,
        message: "Bio must be at least 30 characters",
      });
    }

    if (
      collaborationPreferences.length < 1 ||
      collaborationPreferences.length > 2
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select 1 or 2 collaboration preferences",
      });
    }

    if (
      !Number.isFinite(minRate) ||
      !Number.isFinite(maxRate) ||
      minRate < 0 ||
      maxRate < minRate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid rate range",
      });
    }

    const invalidPortfolioLink = portfolioLinks.find((link) => !isValidUrl(link));

    if (invalidPortfolioLink) {
      return res.status(400).json({
        success: false,
        message: "Portfolio links must be valid http or https URLs",
      });
    }

    profile.bio = bio;
    profile.collaborationPreferences = collaborationPreferences;
    profile.rateRange = {
      min: minRate,
      max: maxRate,
      currency,
    };
    profile.pastCollaborations = pastCollaborations;
    profile.portfolioLinks = portfolioLinks;
    profile.isProfileComplete = true;
    profile.completedAt = new Date();

    await profile.save();

    res.json({
      success: true,
      message: "Influencer profile completed successfully",
      onboardingStep: "completed",
      redirectTo: "/dashboard/influencer",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const settings = await getOnboardingSettings();
    const profile = await getOrCreateProfile(req.user);

    res.json({
      success: true,
      onboardingStep: getOnboardingStep(profile, settings),
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlatformOptions = async (req, res) => {
  const settings = await getOnboardingSettings();

  res.json({
    success: true,
    platforms: settings.platforms,
  });
};

export const getOnboardingOptions = async (req, res) => {
  const settings = await getOnboardingSettings();

  res.json({
    success: true,
    cities: settings.cities,
    platforms: settings.platforms,
    primaryPlatforms: settings.primaryPlatforms,
    contentCategories: settings.contentCategories,
    contentLanguages: settings.contentLanguages,
    collaborationPreferences: settings.collaborationPreferences,
  });
};
