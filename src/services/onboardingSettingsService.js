import CmsSetting from "../models/CmsSetting.js";
import {
  ALLOWED_CITIES,
  PLATFORM_OPTIONS,
  PRIMARY_PLATFORMS,
  CONTENT_CATEGORIES,
  CONTENT_LANGUAGES,
  COLLABORATION_PREFERENCES,
} from "../constants/onboardingConstants.js";

const ONBOARDING_SETTINGS_KEY = "influencer_onboarding";

const getDefaultOnboardingSettings = () => ({
  cities: ALLOWED_CITIES,
  platforms: PLATFORM_OPTIONS,
  primaryPlatforms: PRIMARY_PLATFORMS,
  contentCategories: CONTENT_CATEGORIES,
  contentLanguages: CONTENT_LANGUAGES,
  collaborationPreferences: COLLABORATION_PREFERENCES,
});

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

export {
  ONBOARDING_SETTINGS_KEY,
  getDefaultOnboardingSettings,
  getOnboardingSettings,
};
