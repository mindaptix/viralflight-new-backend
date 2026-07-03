const InfluencerProfile = require("../models/InfluencerProfile");
const {
  ALLOWED_CITIES,
  ALLOWED_PLATFORMS,
  COLLABORATION_PREFERENCES,
  CONTENT_CATEGORIES,
  CONTENT_LANGUAGES,
  PLATFORM_OPTIONS,
  PLATFORM_REQUIRED_FIELDS,
  PRIMARY_PLATFORMS,
} = require("../constants/onboardingConstants");

const normalizeCity = (city) => {
  if (!city || typeof city !== "string") return null;

  return ALLOWED_CITIES.find(
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

const hasPrimaryPlatform = (profile) =>
  profile.platforms.some((item) => PRIMARY_PLATFORMS.includes(item.platform));

const getOnboardingStep = (profile) => {
  if (!profile.name || !profile.city) return "basic-info";
  if (!profile.platforms || !hasPrimaryPlatform(profile)) {
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

exports.saveBasicInfo = async (req, res) => {
  try {
    const { name, city } = req.body;
    const selectedCity = normalizeCity(city);

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name is required and must be at least 2 characters",
      });
    }

    if (!selectedCity) {
      return res.status(400).json({
        success: false,
        message:
          "Valid city is required: Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, or Kolkata",
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
      onboardingStep: getOnboardingStep(profile),
      nextStep: "connect-platform",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.connectPlatform = async (req, res) => {
  try {
    const { platform } = req.body;

    if (!ALLOWED_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid platform is required: instagram, youtube, tiktok, twitter, facebook, linkedin, or snapchat",
      });
    }

    const profile = await getOrCreateProfile(req.user);

    if (!profile.name || !profile.city) {
      return res.status(400).json({
        success: false,
        message: "Please complete name and city before connecting a platform",
      });
    }

    if (profile.platforms.length === 0 && !PRIMARY_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        success: false,
        message:
          "Please connect Instagram, YouTube, or TikTok before adding more platforms",
      });
    }

    const requiredFields = PLATFORM_REQUIRED_FIELDS[platform];
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
      onboardingStep: getOnboardingStep(profile),
      nextStep: getOnboardingStep(profile),
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveContentPreferences = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);

    if (!profile.platforms || !hasPrimaryPlatform(profile)) {
      return res.status(400).json({
        success: false,
        message: "Please connect Instagram, YouTube, or TikTok first",
      });
    }

    const contentCategories = normalizeSelectedValues(
      req.body.contentCategories,
      CONTENT_CATEGORIES
    );
    const contentLanguages = normalizeSelectedValues(
      req.body.contentLanguages,
      CONTENT_LANGUAGES
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
      onboardingStep: getOnboardingStep(profile),
      nextStep: "finish-profile",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.finishProfile = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);

    if (getOnboardingStep(profile) === "basic-info") {
      return res
        .status(400)
        .json({ success: false, message: "Please complete basic info first" });
    }

    if (getOnboardingStep(profile) === "connect-platform") {
      return res.status(400).json({
        success: false,
        message: "Please connect Instagram, YouTube, or TikTok first",
      });
    }

    if (getOnboardingStep(profile) === "content-preferences") {
      return res.status(400).json({
        success: false,
        message: "Please complete content preferences first",
      });
    }

    const bio = typeof req.body.bio === "string" ? req.body.bio.trim() : "";
    const collaborationPreferences = normalizeSelectedValues(
      req.body.collaborationPreferences,
      COLLABORATION_PREFERENCES
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

exports.getMyProfile = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);

    res.json({
      success: true,
      onboardingStep: getOnboardingStep(profile),
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPlatformOptions = async (req, res) => {
  res.json({
    success: true,
    platforms: PLATFORM_OPTIONS,
  });
};

exports.getOnboardingOptions = async (req, res) => {
  res.json({
    success: true,
    cities: ALLOWED_CITIES,
    platforms: PLATFORM_OPTIONS,
    primaryPlatforms: PRIMARY_PLATFORMS,
    contentCategories: CONTENT_CATEGORIES,
    contentLanguages: CONTENT_LANGUAGES,
    collaborationPreferences: COLLABORATION_PREFERENCES,
  });
};
