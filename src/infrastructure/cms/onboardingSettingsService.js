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

  const stored =
    setting.value && typeof setting.value === "object" ? setting.value : {};

  const mergeLists = (defaultList = [], storedList = []) =>
    Array.from(
      new Set(
        [...(Array.isArray(defaultList) ? defaultList : []), ...(Array.isArray(storedList) ? storedList : [])]
          .map((item) =>
            typeof item === "string"
              ? item.trim()
              : item && typeof item === "object"
                ? String(item.value ?? item.label ?? item.name ?? "").trim()
                : ""
          )
          .filter(Boolean)
      )
    );

  return {
    ...defaults,
    ...stored,
    cities: mergeLists(defaults.cities, stored.cities),
    contentCategories: mergeLists(
      defaults.contentCategories,
      stored.contentCategories
    ),
    contentLanguages: mergeLists(
      defaults.contentLanguages,
      stored.contentLanguages
    ),
    collaborationPreferences: mergeLists(
      defaults.collaborationPreferences,
      stored.collaborationPreferences
    ),
  };
};

export { ONBOARDING_SETTINGS_KEY, getDefaultOnboardingSettings, getOnboardingSettings };
