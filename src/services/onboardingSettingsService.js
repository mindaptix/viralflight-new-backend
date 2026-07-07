import CmsSetting from "../models/CmsSetting.js";
import { getDefaultOnboardingSettings } from "../models/InfluencerProfile.js";

const ONBOARDING_SETTINGS_KEY = "influencer_onboarding";

const getOnboardingSettings = async () => {
  let setting = await CmsSetting.findOne({ key: ONBOARDING_SETTINGS_KEY });

  if (!setting) {
    setting = await CmsSetting.create({
      key: ONBOARDING_SETTINGS_KEY,
      value: getDefaultOnboardingSettings(),
    });
  }

  return {
    ...getDefaultOnboardingSettings(),
    ...setting.value,
  };
};

export { ONBOARDING_SETTINGS_KEY, getDefaultOnboardingSettings, getOnboardingSettings };
