import BrandProfile from "../models/BrandProfile.js";
import {
  BRAND_CAMPAIGN_INTERESTS,
  BRAND_INDUSTRIES,
  BRAND_MONTHLY_CAMPAIGN_BUDGETS,
} from "../constants/profileOptions.js";
import {
  applyProfileData,
  getOrCreateRoleProfile,
  getSelectedValue,
  isValidUrl,
  mergeNestedProfileBody,
  normalizeOption,
  normalizeSelectedOptions,
  normalizeText,
  normalizeWebsite,
} from "../utils/profileControllerUtils.js";

const getBrandBody = (body) => ({
  ...mergeNestedProfileBody(body, ["data", "profile", "brand", "brandProfile"]),
});

const getOrCreateProfile = (user) => getOrCreateRoleProfile(user, BrandProfile);

const buildBrandData = (body, { requireComplete = false } = {}) => {
  const brandName = normalizeText(
    getSelectedValue(body, ["brandName", "brand_name", "companyName"])
  );
  const contactPerson = normalizeText(
    getSelectedValue(body, [
      "contactPerson",
      "contact_person",
      "contactName",
      "contact_name",
      "personName",
      "ownerName",
      "fullName",
    ])
  );
  const city = normalizeText(getSelectedValue(body, ["city", "selectedCity", "location"]));
  const industry = normalizeOption(
    getSelectedValue(body, ["industry", "category", "brandIndustry", "selectedIndustry"]),
    BRAND_INDUSTRIES
  );
  const website = normalizeWebsite(getSelectedValue(body, ["website", "websiteUrl", "url"]));
  const instagramHandle = normalizeText(
    getSelectedValue(body, ["instagramHandle", "instagram", "instagram_handle", "instaHandle"])
  );
  const campaignInterests = normalizeSelectedOptions(
    getSelectedValue(body, [
      "campaignInterests",
      "campaign_interests",
      "campaignInterest",
      "campaignTypes",
      "campaigns",
      "interests",
      "selectedCampaignInterests",
      "selectedInterests",
      "partnershipTypes",
      "partnerships",
    ]),
    BRAND_CAMPAIGN_INTERESTS
  );
  const monthlyCampaignBudget = normalizeOption(
    getSelectedValue(body, [
      "monthlyCampaignBudget",
      "monthly_campaign_budget",
      "budget",
      "campaignBudget",
      "selectedBudget",
    ]),
    BRAND_MONTHLY_CAMPAIGN_BUDGETS
  );
  const description = normalizeText(
    getSelectedValue(body, ["description", "aboutBrand", "about_brand", "bio"])
  );

  if (requireComplete) {
    if (!brandName || brandName.length < 2) {
      return { error: "Brand name is required and must be at least 2 characters" };
    }

    if (!contactPerson || contactPerson.length < 2) {
      return { error: "Contact person is required and must be at least 2 characters" };
    }

    if (!city) {
      return { error: "City is required" };
    }

    if (!industry) {
      return { error: `Valid industry is required: ${BRAND_INDUSTRIES.join(", ")}` };
    }

    if (!website) {
      return { error: "Website is required" };
    }

    if (!instagramHandle) {
      return { error: "Instagram handle is required" };
    }

    if (campaignInterests.length === 0) {
      const rawCampaignInterests = getSelectedValue(body, [
        "campaignInterests",
        "campaign_interests",
        "campaignInterest",
        "campaignTypes",
        "campaigns",
        "interests",
        "selectedCampaignInterests",
        "selectedInterests",
        "partnershipTypes",
        "partnerships",
      ]);

      if (rawCampaignInterests !== undefined && rawCampaignInterests !== null) {
        return {
          error: `Invalid campaign interest value. Allowed values: ${BRAND_CAMPAIGN_INTERESTS.join(", ")}`,
        };
      }

      return { error: "Please select at least 1 campaign interest" };
    }

    if (!description || description.length < 30) {
      return { error: "About your brand must be at least 30 characters" };
    }
  }

  if (website && !isValidUrl(website)) {
    return { error: "Website must be a valid http or https URL" };
  }

  return {
    profileData: {
      brandName,
      contactPerson,
      city,
      industry,
      website,
      instagramHandle,
      campaignInterests,
      monthlyCampaignBudget,
      description,
    },
  };
};

export const saveFullOnboarding = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);
    const { profileData, error } = buildBrandData(
      { ...profile.toObject(), ...getBrandBody(req.body) },
      { requireComplete: true }
    );

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    profile.userId = req.user.userId;
    profile.mobile = req.user.mobile;
    applyProfileData(profile, profileData);
    profile.isProfileComplete = true;
    profile.completedAt = new Date();
    await profile.save();

    res.json({
      success: true,
      message: "Brand profile saved successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardingOptions = (req, res) => {
  res.json({
    success: true,
    industries: BRAND_INDUSTRIES,
    campaignInterests: BRAND_CAMPAIGN_INTERESTS.map((value) => ({
      label: value,
      value,
    })),
    monthlyCampaignBudgets: BRAND_MONTHLY_CAMPAIGN_BUDGETS.map((value) => ({
      label: value,
      value,
    })),
    validation: {
      brandNameMinLength: 2,
      contactPersonMinLength: 2,
      descriptionMinLength: 30,
    },
  });
};
