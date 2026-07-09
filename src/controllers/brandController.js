import BrandProfile from "../models/BrandProfile.js";
import {
  BRAND_CAMPAIGN_INTERESTS,
  BRAND_INDUSTRIES,
  BRAND_MONTHLY_CAMPAIGN_BUDGETS,
} from "../constants/profileOptions.js";
import {
  applyProfileData,
  getProfileQuery,
  getSelectedValue,
  isValidUrl,
  mergeNestedProfileBody,
  normalizeOption,
  normalizeSelectedOptions,
  normalizeText,
} from "../utils/profileControllerUtils.js";

const getBrandBody = (body) => ({
  ...mergeNestedProfileBody(body, ["data", "profile", "brand", "brandProfile"]),
});

const getBrandStep = (profile) => {
  if (!profile.brandName || !profile.contactPerson || !profile.city) {
    return "brand-details";
  }

  if (!profile.industry || !profile.website || !profile.instagramHandle) {
    return "brand-profile";
  }

  if (
    !profile.campaignInterests ||
    profile.campaignInterests.length === 0 ||
    !profile.description ||
    profile.description.length < 30
  ) {
    return "campaign-preferences";
  }

  return "completed";
};

const getOrCreateProfile = async (user) => {
  let profile = await BrandProfile.findOne(getProfileQuery(user));

  if (!profile) {
    profile = await BrandProfile.create({
      userId: user.userId,
      mobile: user.mobile,
    });
  } else if (user.userId && !profile.userId) {
    profile.userId = user.userId;
    await profile.save();
  }

  return profile;
};

const buildBrandData = (body, { requireComplete = false } = {}) => {
  const brandName = normalizeText(
    getSelectedValue(body, ["brandName", "brand_name", "companyName", "name"])
  );
  const contactPerson = normalizeText(
    getSelectedValue(body, [
      "contactPerson",
      "contact_person",
      "contactName",
      "contact_name",
      "personName",
      "ownerName",
    ])
  );
  const city = normalizeText(getSelectedValue(body, ["city", "selectedCity", "location"]));
  const industry = normalizeOption(
    getSelectedValue(body, ["industry", "category", "brandIndustry", "selectedIndustry"]),
    BRAND_INDUSTRIES
  );
  const website = normalizeText(getSelectedValue(body, ["website", "websiteUrl", "url"]));
  const instagramHandle = normalizeText(
    getSelectedValue(body, ["instagramHandle", "instagram", "instagram_handle", "instaHandle"])
  );
  const campaignInterests = normalizeSelectedOptions(
    getSelectedValue(body, [
      "campaignInterests",
      "campaign_interests",
      "campaignTypes",
      "campaigns",
      "interests",
      "selectedCampaignInterests",
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
      return { error: "Please select at least 1 campaign interest" };
    }

    if (!description || description.length < 30) {
      return { error: "About your brand must be at least 30 characters" };
    }
  }

  if (industry === null && getSelectedValue(body, ["industry", "category"]) !== undefined) {
    return { error: `Valid industry is required: ${BRAND_INDUSTRIES.join(", ")}` };
  }

  if (
    monthlyCampaignBudget === null &&
    getSelectedValue(body, ["monthlyCampaignBudget", "budget", "campaignBudget"]) !== undefined
  ) {
    return {
      error: `Valid monthly campaign budget is required: ${BRAND_MONTHLY_CAMPAIGN_BUDGETS.join(", ")}`,
    };
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

export const saveBrandDetails = async (req, res) => {
  try {
    const body = getBrandBody(req.body);
    const { profileData, error } = buildBrandData(body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    if (!profileData.brandName || profileData.brandName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required and must be at least 2 characters",
      });
    }

    if (!profileData.contactPerson || profileData.contactPerson.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Contact person is required and must be at least 2 characters",
      });
    }

    if (!profileData.city) {
      return res.status(400).json({ success: false, message: "City is required" });
    }

    const profile = await BrandProfile.findOneAndUpdate(
      getProfileQuery(req.user),
      {
        userId: req.user.userId,
        mobile: req.user.mobile,
        brandName: profileData.brandName,
        contactPerson: profileData.contactPerson,
        city: profileData.city,
        isProfileComplete: false,
        completedAt: undefined,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Brand details saved successfully",
      onboardingStep: getBrandStep(profile),
      nextStep: "brand-profile",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveBrandProfile = async (req, res) => {
  try {
    const body = getBrandBody(req.body);
    const { profileData, error } = buildBrandData(body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    if (!profileData.industry) {
      return res.status(400).json({
        success: false,
        message: `Valid industry is required: ${BRAND_INDUSTRIES.join(", ")}`,
      });
    }

    if (!profileData.website) {
      return res.status(400).json({ success: false, message: "Website is required" });
    }

    if (!profileData.instagramHandle) {
      return res.status(400).json({
        success: false,
        message: "Instagram handle is required",
      });
    }

    const profile = await getOrCreateProfile(req.user);
    profile.industry = profileData.industry;
    profile.website = profileData.website;
    profile.instagramHandle = profileData.instagramHandle;
    profile.isProfileComplete = false;
    profile.completedAt = undefined;
    await profile.save();

    res.json({
      success: true,
      message: "Brand profile saved successfully",
      onboardingStep: getBrandStep(profile),
      nextStep: "campaign-preferences",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveCampaignPreferences = async (req, res) => {
  try {
    const body = getBrandBody(req.body);
    const { profileData, error } = buildBrandData(body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    if (!profileData.campaignInterests || profileData.campaignInterests.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least 1 campaign interest",
      });
    }

    if (!profileData.description || profileData.description.length < 30) {
      return res.status(400).json({
        success: false,
        message: "About your brand must be at least 30 characters",
      });
    }

    const profile = await getOrCreateProfile(req.user);
    profile.campaignInterests = profileData.campaignInterests;
    profile.monthlyCampaignBudget = profileData.monthlyCampaignBudget || undefined;
    profile.description = profileData.description;
    profile.isProfileComplete = true;
    profile.completedAt = new Date();
    await profile.save();

    res.json({
      success: true,
      message: "Brand profile completed successfully",
      onboardingStep: "completed",
      dashboard: "brand",
      redirectTo: "/dashboard/brand",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveFullOnboarding = async (req, res) => {
  try {
    const { profileData, error } = buildBrandData(getBrandBody(req.body), {
      requireComplete: true,
    });

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const profile = await getOrCreateProfile(req.user);
    profile.userId = req.user.userId;
    profile.mobile = req.user.mobile;
    applyProfileData(profile, profileData);
    profile.isProfileComplete = true;
    profile.completedAt = new Date();
    await profile.save();

    res.json({
      success: true,
      message: "Brand onboarding completed successfully",
      onboardingStep: "completed",
      dashboard: "brand",
      redirectTo: "/dashboard/brand",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeBrandProfile = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);
    const currentData = profile.toObject();
    const { profileData, error } = buildBrandData(
      { ...currentData, ...getBrandBody(req.body) },
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
      message: "Brand profile completed successfully",
      onboardingStep: "completed",
      dashboard: "brand",
      redirectTo: "/dashboard/brand",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const savePartialProfile = async (req, res) => {
  try {
    const { profileData, error } = buildBrandData(getBrandBody(req.body));

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const profile = await getOrCreateProfile(req.user);
    applyProfileData(profile, profileData);

    if (getBrandStep(profile) === "completed") {
      profile.isProfileComplete = true;
      profile.completedAt = profile.completedAt || new Date();
    } else {
      profile.isProfileComplete = false;
      profile.completedAt = undefined;
    }

    await profile.save();

    res.json({
      success: true,
      message: "Brand profile saved successfully",
      onboardingStep: getBrandStep(profile),
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
      onboardingStep: getBrandStep(profile),
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
    campaignInterests: BRAND_CAMPAIGN_INTERESTS,
    monthlyCampaignBudgets: BRAND_MONTHLY_CAMPAIGN_BUDGETS,
    validation: {
      brandNameMinLength: 2,
      contactPersonMinLength: 2,
      descriptionMinLength: 30,
    },
    steps: [
      { step: 1, key: "brand-details", title: "Set up your brand" },
      { step: 2, key: "brand-profile", title: "Brand profile" },
      { step: 3, key: "campaign-preferences", title: "Campaign preferences" },
    ],
  });
};
