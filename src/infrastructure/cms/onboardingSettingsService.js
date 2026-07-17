import CmsSetting from "../../models/CmsSetting.js";
import { getDefaultOnboardingSettings } from "../../models/InfluencerProfile.js";

const ONBOARDING_SETTINGS_KEY = "influencer_onboarding";

const getOnboardingSettings = async () => {
  const defaults = getDefaultOnboardingSettings();
  let setting = await CmsSetting.findOne({ key: ONBOARDING_SETTINGS_KEY });

  if (!setting) {
    setting = await CmsSetting.create({
      key: ONBOARDING_SETTINGS_KEY,
      value: defaults,
    });
  }

  const stored = setting.value && typeof setting.value === "object" ? setting.value : {};
  const storedCities = Array.isArray(stored.cities) ? stored.cities : [];
  const cities = Array.from(
    new Set([...(defaults.cities || []), ...storedCities])
  );

  return {
    ...defaults,
    ...stored,
    cities,
  };
};

export { ONBOARDING_SETTINGS_KEY, getDefaultOnboardingSettings, getOnboardingSettings };
