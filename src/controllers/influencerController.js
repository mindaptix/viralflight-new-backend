import InfluencerProfile from "../models/InfluencerProfile.js";
import {
  getOnboardingSettings,
} from "../services/onboardingSettingsService.js";

const normalizeCity = (city, cities) => {
  if (!city || typeof city !== "string") return null;

  const allowedCities = normalizeAllowedValues(cities);
  return allowedCities.find(
    (allowedCity) => allowedCity.toLowerCase() === city.trim().toLowerCase()
  );
};

const extractOptionValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const candidate = value.value ?? value.label ?? value.name;
    return typeof candidate === "string" ? candidate.trim() : null;
  }
  return null;
};

const normalizeAllowedValues = (allowedValues) => {
  if (!Array.isArray(allowedValues)) return [];

  return allowedValues
    .map((value) => extractOptionValue(value))
    .filter(Boolean);
};

const normalizeSelectedValues = (values, allowedValues) => {
  const normalizedAllowedValues = normalizeAllowedValues(allowedValues);
  const normalizedInputValues = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : values && typeof values === "object"
        ? [values]
        : [];

  return [
    ...new Set(
      normalizedInputValues
        .map((value) => {
          const candidateValue = extractOptionValue(value);
          if (!candidateValue) return null;

          return normalizedAllowedValues.find(
            (allowedValue) =>
              allowedValue.toLowerCase() === candidateValue.toLowerCase()
          );
        })
        .filter(Boolean)
    ),
  ];
};

const getSelectedValues = (body, keys) => {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      return body[key];
    }
  }

  return [];
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
    profile.contentCategories.length > 5 ||
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

const buildPlatformData = (body, settings) => {
  const allowedPlatforms = settings.platforms.map((item) => item.platform);
  const platformRequiredFields = getPlatformRequiredFields(settings);
  const platform = body.platform;

  if (!allowedPlatforms.includes(platform)) {
    return {
      error: `Valid platform is required: ${allowedPlatforms.join(", ")}`,
    };
  }

  const requiredFields = platformRequiredFields[platform];
  const platformData = { platform };

  for (const field of requiredFields) {
    const value = body[field];

    if (value === undefined || value === null || value === "") {
      return { error: `${field} is required for ${platform}` };
    }

    platformData[field] =
      typeof value === "string" ? value.trim() : Number(value);
  }

  if (
    platformData.followers !== undefined &&
    (!Number.isFinite(platformData.followers) || platformData.followers < 0)
  ) {
    return { error: "Followers must be a valid number" };
  }

  if (
    platformData.subscribers !== undefined &&
    (!Number.isFinite(platformData.subscribers) ||
      platformData.subscribers < 0)
  ) {
    return { error: "Subscribers must be a valid number" };
  }

  if (
    !Number.isFinite(platformData.engagement) ||
    platformData.engagement < 0 ||
    platformData.engagement > 100
  ) {
    return { error: "Engagement must be a valid percentage from 0 to 100" };
  }

  return { platformData };
};

const buildFinishProfileData = (body, settings) => {
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  const collaborationPreference = normalizeSelectedValues(
    Array.isArray(body.collaborationPreferences)
      ? body.collaborationPreferences
      : body.collaborationPreference
        ? [body.collaborationPreference]
        : [],
    settings.collaborationPreferences
  )[0];

  const pastCollaborations = normalizeStringList(
    body.pastCollaborations ?? body.pastCollaboration
  );

  const portfolioLinkRaw =
    typeof body.portfolioLink === "string"
      ? body.portfolioLink.trim()
      : Array.isArray(body.portfolioLinks) && body.portfolioLinks[0]
        ? String(body.portfolioLinks[0]).trim()
        : "";
  const rateRange = body.rateRange || {};
  const minRate = Number(rateRange.min);
  const maxRate = Number(rateRange.max);
  const currency =
    typeof rateRange.currency === "string" && rateRange.currency.trim()
      ? rateRange.currency.trim().toUpperCase()
      : "INR";

  if (bio.length < 30) {
    return { error: "Bio must be at least 30 characters" };
  }

  if (!collaborationPreference) {
    return { error: "Please select exactly 1 collaboration preference" };
  }

  const hasRateRange =
    rateRange.min !== undefined || rateRange.max !== undefined || rateRange.currency;

  if (hasRateRange) {
    if (
      !Number.isFinite(minRate) ||
      !Number.isFinite(maxRate) ||
      minRate < 0 ||
      maxRate < minRate
    ) {
      return { error: "Please enter a valid rate range" };
    }
  }

  if (portfolioLinkRaw && !isValidUrl(portfolioLinkRaw)) {
    return { error: "Portfolio link must be a valid http or https URL" };
  }

  return {
    profileData: {
      bio,
      collaborationPreference,
      rateRange: hasRateRange
        ? {
            min: minRate,
            max: maxRate,
            currency,
          }
        : undefined,
      pastCollaborations,
      portfolioLink: portfolioLinkRaw || undefined,
    },
  };
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
    const { platform } = req.body;
    const { platformData, error } = buildPlatformData(req.body, settings);

    if (error) {
      return res.status(400).json({ success: false, message: error });
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
      getSelectedValues(req.body, [
        "contentCategories",
        "contentCategory",
        "categories",
      ]),
      settings.contentCategories
    );
    const contentLanguages = normalizeSelectedValues(
      getSelectedValues(req.body, [
        "contentLanguages",
        "contentLanguage",
        "languages",
      ]),
      settings.contentLanguages
    );

    if (contentCategories.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please select exactly 5 content categories",
      });
    }

    if (contentCategories.length > 5) {
      return res.status(400).json({
        success: false,
        message: "You can select up to 5 content categories only",
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

    const { profileData, error } = buildFinishProfileData(req.body, settings);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    profile.bio = profileData.bio;
    profile.collaborationPreference = profileData.collaborationPreference;
    profile.rateRange = profileData.rateRange;
    profile.pastCollaborations = profileData.pastCollaborations;
    profile.portfolioLink = profileData.portfolioLink;
    profile.isProfileComplete = true;
    profile.completedAt = new Date();

    await profile.save();

    res.json({
      success: true,
      message: "Influencer profile completed successfully",
      onboardingStep: "completed",
      dashboard: "influencer",
      redirectTo: "/dashboard/influencer",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveFullOnboarding = async (req, res) => {
  try {
    const settings = await getOnboardingSettings();
    const profile = await getOrCreateProfile(req.user);
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

    const platformBody = req.body.platform || req.body;
    const { platformData, error: platformError } = buildPlatformData(
      platformBody,
      settings
    );

    if (platformError) {
      return res.status(400).json({ success: false, message: platformError });
    }

    if (!settings.primaryPlatforms.includes(platformData.platform)) {
      return res.status(400).json({
        success: false,
        message: `Please connect ${settings.primaryPlatforms.join(
          ", "
        )} before adding more platforms`,
      });
    }

    // Last-step apps often omit categories/languages; reuse values already saved in step 3.
    let contentCategories = normalizeSelectedValues(
      getSelectedValues(req.body, [
        "contentCategories",
        "contentCategory",
        "categories",
      ]),
      settings.contentCategories
    );
    let contentLanguages = normalizeSelectedValues(
      getSelectedValues(req.body, [
        "contentLanguages",
        "contentLanguage",
        "languages",
      ]),
      settings.contentLanguages
    );

    if (contentCategories.length === 0) {
      contentCategories = normalizeSelectedValues(
        profile.contentCategories,
        settings.contentCategories
      );
    }

    if (contentLanguages.length === 0) {
      contentLanguages = normalizeSelectedValues(
        profile.contentLanguages,
        settings.contentLanguages
      );
    }

    if (contentCategories.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please select exactly 5 content categories",
      });
    }

    if (contentCategories.length > 5) {
      return res.status(400).json({
        success: false,
        message: "You can select up to 5 content categories only",
      });
    }

    if (contentLanguages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least 1 content language",
      });
    }

    const { profileData, error: profileError } = buildFinishProfileData(
      req.body,
      settings
    );

    if (profileError) {
      return res.status(400).json({ success: false, message: profileError });
    }

    profile.userId = req.user.userId;
    profile.mobile = req.user.mobile;
    profile.name = name.trim();
    profile.city = selectedCity;
    profile.platforms = [platformData];
    profile.contentCategories = contentCategories;
    profile.contentLanguages = contentLanguages;
    profile.bio = profileData.bio;
    profile.collaborationPreference = profileData.collaborationPreference;
    profile.rateRange = profileData.rateRange;
    profile.pastCollaborations = profileData.pastCollaborations;
    profile.portfolioLink = profileData.portfolioLink;
    profile.isProfileComplete = true;
    profile.completedAt = new Date();

    await profile.save();

    res.json({
      success: true,
      message: "Influencer onboarding completed successfully",
      onboardingStep: "completed",
      dashboard: "influencer",
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

export const getFullProfile = async (req, res) => {
  try {
    const settings = await getOnboardingSettings();
    const profile = await getOrCreateProfile(req.user);

    res.json({
      success: true,
      message: "Influencer profile fetched successfully",
      onboardingStep: getOnboardingStep(profile, settings),
      user: {
        userId: req.user.userId,
        mobile: req.user.mobile,
        role: req.user.role,
      },
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
    secondaryPlatforms: settings.secondaryPlatforms,
    contentCategories: settings.contentCategories,
    contentLanguages: settings.contentLanguages,
    collaborationPreferences: settings.collaborationPreferenceOptions,
    validation: settings.validation,
    steps: [
      { step: 1, key: "basic-info", title: "Enter your name" },
      { step: 2, key: "connect-platform", title: "Add your socials" },
      { step: 3, key: "content-preferences", title: "What do you create?" },
      { step: 4, key: "finish-profile", title: "Finish your profile" },
    ],
  });
};
