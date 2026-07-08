import BrandProfile from "../models/BrandProfile.js";

const INDUSTRIES = [
  "Fashion & Apparel",
  "Beauty & Personal Care",
  "Food & Beverage",
  "Technology",
  "Finance & Fintech",
  "Health & Fitness",
  "Travel & Hospitality",
  "Automobile",
  "Real Estate",
  "Education",
  "Entertainment",
  "D2C / E-commerce",
  "FMCG",
  "Gaming",
];

const CAMPAIGN_INTERESTS = [
  "Influencer posts",
  "Reels & short video",
  "UGC content",
  "Product seeding",
  "Brand ambassador",
  "Event appearances",
  "Affiliate marketing",
];

const MONTHLY_CAMPAIGN_BUDGETS = [
  "Under ₹50K",
  "₹50K - ₹2L",
  "₹2L - ₹10L",
  "₹10L - ₹50L",
  "₹50L+",
  "Not sure yet",
];

const getProfileQuery = (user) =>
  user.userId ? { userId: user.userId } : { mobile: user.mobile };

const normalizeComparableText = (value) =>
  value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const extractOptionValue = (value) => {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const candidate = value.value ?? value.label ?? value.name;
    return typeof candidate === "string" ? candidate.trim() : null;
  }

  return null;
};

const normalizeOption = (value, options) => {
  const candidateValue = extractOptionValue(value);
  if (!candidateValue) return null;
  const comparableCandidate = normalizeComparableText(candidateValue);

  return options.find(
    (option) => normalizeComparableText(option) === comparableCandidate
  );
};

const normalizeSelectedOptions = (values, options) => {
  const inputValues = Array.isArray(values)
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
      inputValues
        .map((value) => normalizeOption(value, options))
        .filter(Boolean)
    ),
  ];
};

const normalizeText = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

const getSelectedValue = (body, keys) => {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      return body[key];
    }
  }

  return undefined;
};

const getBrandBody = (body) => ({
  ...body,
  ...(body.data && typeof body.data === "object" ? body.data : {}),
  ...(body.profile && typeof body.profile === "object" ? body.profile : {}),
  ...(body.brand && typeof body.brand === "object" ? body.brand : {}),
  ...(body.brandProfile && typeof body.brandProfile === "object"
    ? body.brandProfile
    : {}),
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
    INDUSTRIES
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
    CAMPAIGN_INTERESTS
  );
  const monthlyCampaignBudget = normalizeOption(
    getSelectedValue(body, [
      "monthlyCampaignBudget",
      "monthly_campaign_budget",
      "budget",
      "campaignBudget",
      "selectedBudget",
    ]),
    MONTHLY_CAMPAIGN_BUDGETS
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
      return { error: `Valid industry is required: ${INDUSTRIES.join(", ")}` };
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
    return { error: `Valid industry is required: ${INDUSTRIES.join(", ")}` };
  }

  if (
    monthlyCampaignBudget === null &&
    getSelectedValue(body, ["monthlyCampaignBudget", "budget", "campaignBudget"]) !== undefined
  ) {
    return {
      error: `Valid monthly campaign budget is required: ${MONTHLY_CAMPAIGN_BUDGETS.join(", ")}`,
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

const applyProfileData = (profile, profileData) => {
  for (const [key, value] of Object.entries(profileData)) {
    if (value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)) {
      profile[key] = value;
    }
  }
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
        message: `Valid industry is required: ${INDUSTRIES.join(", ")}`,
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
    industries: INDUSTRIES,
    campaignInterests: CAMPAIGN_INTERESTS,
    monthlyCampaignBudgets: MONTHLY_CAMPAIGN_BUDGETS,
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
