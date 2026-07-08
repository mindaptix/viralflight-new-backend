import AgencyProfile from "../models/AgencyProfile.js";

const AGENCY_TYPES = [
  "Talent Management",
  "Influencer Marketing",
  "Creative / Production",
  "PR & Communications",
  "Full-service Agency",
  "Boutique Agency",
];

const TEAM_SIZES = ["Solo", "2-5", "6-15", "16-50", "50+"];

const CREATORS_MANAGED_RANGES = ["1-10", "11-25", "26-50", "51-100", "100+"];

const FOCUS_AREAS = [
  "Fashion",
  "Beauty",
  "Lifestyle",
  "Food & Beverage",
  "Tech",
  "Finance",
  "Gaming",
  "Travel",
  "Health & Wellness",
  "Entertainment",
  "Automobile",
  "Real Estate",
  "Education",
  "D2C / E-commerce",
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

const getSelectedValues = (body, keys) => {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      return body[key];
    }
  }

  return undefined;
};

const getAgencyBody = (body) => ({
  ...body,
  ...(body.data && typeof body.data === "object" ? body.data : {}),
  ...(body.profile && typeof body.profile === "object" ? body.profile : {}),
  ...(body.agency && typeof body.agency === "object" ? body.agency : {}),
  ...(body.agencyProfile && typeof body.agencyProfile === "object"
    ? body.agencyProfile
    : {}),
});

const getAgencyStep = (profile) => {
  if (!profile.agencyName || !profile.contactPerson || !profile.city) {
    return "agency-details";
  }

  if (!profile.agencyType || !profile.teamSize || !profile.creatorsManaged) {
    return "how-you-operate";
  }

  if (
    !profile.focusAreas ||
    profile.focusAreas.length === 0 ||
    !profile.description ||
    profile.description.length < 30
  ) {
    return "focus-services";
  }

  return "completed";
};

const getOrCreateProfile = async (user) => {
  let profile = await AgencyProfile.findOne(getProfileQuery(user));

  if (!profile) {
    profile = await AgencyProfile.create({
      userId: user.userId,
      mobile: user.mobile,
    });
  } else if (user.userId && !profile.userId) {
    profile.userId = user.userId;
    await profile.save();
  }

  return profile;
};

const buildAgencyData = (body, { requireComplete = false } = {}) => {
  const agencyName = normalizeText(
    getSelectedValues(body, ["agencyName", "agency_name", "name", "companyName"])
  );
  const contactPerson = normalizeText(
    getSelectedValues(body, [
      "contactPerson",
      "contact_person",
      "contactName",
      "contact_name",
      "personName",
      "ownerName",
    ])
  );
  const city = normalizeText(getSelectedValues(body, ["city", "selectedCity", "location"]));
  const agencyType = normalizeOption(
    getSelectedValues(body, ["agencyType", "agency_type", "type", "selectedAgencyType"]),
    AGENCY_TYPES
  );
  const teamSize = normalizeOption(
    getSelectedValues(body, ["teamSize", "team_size", "team", "selectedTeamSize"]),
    TEAM_SIZES
  );
  const creatorsManaged = normalizeOption(
    getSelectedValues(body, [
      "creatorsManaged",
      "creators_managed",
      "creatorManaged",
      "creatorCount",
      "managedCreators",
      "selectedCreatorsManaged",
    ]),
    CREATORS_MANAGED_RANGES
  );
  const focusAreas = normalizeSelectedOptions(
    getSelectedValues(body, [
      "focusAreas",
      "focus_areas",
      "services",
      "clientIndustries",
      "industries",
      "categories",
      "selectedFocusAreas",
    ]),
    FOCUS_AREAS
  );
  const website = normalizeText(getSelectedValues(body, ["website", "websiteUrl", "url"]));
  const description = normalizeText(
    getSelectedValues(body, ["description", "aboutAgency", "about_agency", "bio"])
  );

  if (requireComplete) {
    if (!agencyName || agencyName.length < 2) {
      return { error: "Agency name is required and must be at least 2 characters" };
    }

    if (!contactPerson || contactPerson.length < 2) {
      return { error: "Contact person is required and must be at least 2 characters" };
    }

    if (!city) {
      return { error: "City is required" };
    }

    if (!agencyType) {
      return { error: `Valid agency type is required: ${AGENCY_TYPES.join(", ")}` };
    }

    if (!teamSize) {
      return { error: `Valid team size is required: ${TEAM_SIZES.join(", ")}` };
    }

    if (!creatorsManaged) {
      return {
        error: `Valid creators managed range is required: ${CREATORS_MANAGED_RANGES.join(", ")}`,
      };
    }

    if (focusAreas.length === 0) {
      return { error: "Please select at least 1 focus area" };
    }

    if (!description || description.length < 30) {
      return { error: "About your agency must be at least 30 characters" };
    }
  }

  if (
    getSelectedValues(body, ["agencyType", "agency_type", "type", "selectedAgencyType"]) !==
      undefined &&
    getSelectedValues(body, ["agencyType", "agency_type", "type", "selectedAgencyType"]) !==
      null &&
    !agencyType
  ) {
    return { error: `Valid agency type is required: ${AGENCY_TYPES.join(", ")}` };
  }

  if (
    getSelectedValues(body, ["teamSize", "team_size", "team", "selectedTeamSize"]) !==
      undefined &&
    getSelectedValues(body, ["teamSize", "team_size", "team", "selectedTeamSize"]) !==
      null &&
    !teamSize
  ) {
    return { error: `Valid team size is required: ${TEAM_SIZES.join(", ")}` };
  }

  if (
    getSelectedValues(body, [
      "creatorsManaged",
      "creators_managed",
      "creatorManaged",
      "creatorCount",
      "managedCreators",
      "selectedCreatorsManaged",
    ]) !== undefined &&
    getSelectedValues(body, [
      "creatorsManaged",
      "creators_managed",
      "creatorManaged",
      "creatorCount",
      "managedCreators",
      "selectedCreatorsManaged",
    ]) !== null &&
    !creatorsManaged
  ) {
    return {
      error: `Valid creators managed range is required: ${CREATORS_MANAGED_RANGES.join(", ")}`,
    };
  }

  if (website && !isValidUrl(website)) {
    return { error: "Website must be a valid http or https URL" };
  }

  return {
    profileData: {
      agencyName,
      contactPerson,
      city,
      agencyType,
      teamSize,
      creatorsManaged,
      focusAreas,
      website,
      description,
    },
  };
};

const applyProfileData = (profile, profileData) => {
  for (const [key, value] of Object.entries(profileData)) {
    if (value !== null && !(Array.isArray(value) && value.length === 0)) {
      profile[key] = value;
    }
  }
};

export const saveAgencyDetails = async (req, res) => {
  try {
    const body = getAgencyBody(req.body);
    const agencyName = normalizeText(
      getSelectedValues(body, ["agencyName", "agency_name", "name", "companyName"])
    );
    const contactPerson = normalizeText(
      getSelectedValues(body, [
        "contactPerson",
        "contact_person",
        "contactName",
        "contact_name",
        "personName",
        "ownerName",
      ])
    );
    const city = normalizeText(
      getSelectedValues(body, ["city", "selectedCity", "location"])
    );

    if (!agencyName || agencyName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Agency name is required and must be at least 2 characters",
      });
    }

    if (!contactPerson || contactPerson.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Contact person is required and must be at least 2 characters",
      });
    }

    if (!city) {
      return res.status(400).json({ success: false, message: "City is required" });
    }

    const profile = await AgencyProfile.findOneAndUpdate(
      getProfileQuery(req.user),
      {
        userId: req.user.userId,
        mobile: req.user.mobile,
        agencyName,
        contactPerson,
        city,
        isProfileComplete: false,
        completedAt: undefined,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Agency details saved successfully",
      onboardingStep: getAgencyStep(profile),
      nextStep: "how-you-operate",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveHowYouOperate = async (req, res) => {
  try {
    const body = getAgencyBody(req.body);
    const agencyType = normalizeOption(
      getSelectedValues(body, ["agencyType", "agency_type", "type", "selectedAgencyType"]),
      AGENCY_TYPES
    );
    const teamSize = normalizeOption(
      getSelectedValues(body, ["teamSize", "team_size", "team", "selectedTeamSize"]),
      TEAM_SIZES
    );
    const creatorsManaged = normalizeOption(
      getSelectedValues(body, [
        "creatorsManaged",
        "creators_managed",
        "creatorManaged",
        "creatorCount",
        "managedCreators",
        "selectedCreatorsManaged",
      ]),
      CREATORS_MANAGED_RANGES
    );

    if (!agencyType) {
      return res.status(400).json({
        success: false,
        message: `Valid agency type is required: ${AGENCY_TYPES.join(", ")}`,
      });
    }

    if (!teamSize) {
      return res.status(400).json({
        success: false,
        message: `Valid team size is required: ${TEAM_SIZES.join(", ")}`,
      });
    }

    if (!creatorsManaged) {
      return res.status(400).json({
        success: false,
        message: `Valid creators managed range is required: ${CREATORS_MANAGED_RANGES.join(", ")}`,
      });
    }

    const profile = await getOrCreateProfile(req.user);
    profile.agencyType = agencyType;
    profile.teamSize = teamSize;
    profile.creatorsManaged = creatorsManaged;
    profile.isProfileComplete = false;
    profile.completedAt = undefined;
    await profile.save();

    res.json({
      success: true,
      message: "Agency operating details saved successfully",
      onboardingStep: getAgencyStep(profile),
      nextStep: "focus-services",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveFocusServices = async (req, res) => {
  try {
    const body = getAgencyBody(req.body);
    const focusAreas = normalizeSelectedOptions(
      getSelectedValues(body, [
        "focusAreas",
        "focus_areas",
        "services",
        "clientIndustries",
        "industries",
        "categories",
        "selectedFocusAreas",
      ]),
      FOCUS_AREAS
    );
    const website = normalizeText(getSelectedValues(body, ["website", "websiteUrl", "url"]));
    const description = normalizeText(
      getSelectedValues(body, ["description", "aboutAgency", "about_agency", "bio"])
    );

    if (focusAreas.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least 1 focus area",
      });
    }

    if (website && !isValidUrl(website)) {
      return res.status(400).json({
        success: false,
        message: "Website must be a valid http or https URL",
      });
    }

    if (!description || description.length < 30) {
      return res.status(400).json({
        success: false,
        message: "About your agency must be at least 30 characters",
      });
    }

    const profile = await getOrCreateProfile(req.user);
    profile.focusAreas = focusAreas;
    profile.website = website || undefined;
    profile.description = description;
    profile.isProfileComplete = true;
    profile.completedAt = new Date();
    await profile.save();

    res.json({
      success: true,
      message: "Agency profile completed successfully",
      onboardingStep: "completed",
      dashboard: "agency",
      redirectTo: "/dashboard/agency",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveFullOnboarding = async (req, res) => {
  try {
    const { profileData, error } = buildAgencyData(getAgencyBody(req.body), {
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
      message: "Agency onboarding completed successfully",
      onboardingStep: "completed",
      dashboard: "agency",
      redirectTo: "/dashboard/agency",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeAgencyProfile = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);
    const currentData = profile.toObject();
    const { profileData, error } = buildAgencyData(
      { ...currentData, ...getAgencyBody(req.body) },
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
      message: "Agency profile completed successfully",
      onboardingStep: "completed",
      dashboard: "agency",
      redirectTo: "/dashboard/agency",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const savePartialProfile = async (req, res) => {
  try {
    const { profileData, error } = buildAgencyData(getAgencyBody(req.body));

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const profile = await getOrCreateProfile(req.user);
    applyProfileData(profile, profileData);

    if (getAgencyStep(profile) === "completed") {
      profile.isProfileComplete = true;
      profile.completedAt = profile.completedAt || new Date();
    } else {
      profile.isProfileComplete = false;
      profile.completedAt = undefined;
    }

    await profile.save();

    res.json({
      success: true,
      message: "Agency profile saved successfully",
      onboardingStep: getAgencyStep(profile),
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
      onboardingStep: getAgencyStep(profile),
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardingOptions = (req, res) => {
  res.json({
    success: true,
    agencyTypes: AGENCY_TYPES,
    teamSizes: TEAM_SIZES,
    creatorsManagedRanges: CREATORS_MANAGED_RANGES,
    focusAreas: FOCUS_AREAS,
    validation: {
      agencyNameMinLength: 2,
      contactPersonMinLength: 2,
      descriptionMinLength: 30,
    },
    steps: [
      { step: 1, key: "agency-details", title: "Set up your agency" },
      { step: 2, key: "how-you-operate", title: "Tell us how you work" },
      { step: 3, key: "focus-services", title: "Your focus & services" },
    ],
  });
};
