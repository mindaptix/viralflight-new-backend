import AgencyProfile from "../models/AgencyProfile.js";
import {
  AGENCY_CREATORS_MANAGED_RANGES,
  AGENCY_FOCUS_AREAS,
  AGENCY_TEAM_SIZES,
  AGENCY_TYPES,
} from "../constants/profileOptions.js";
import {
  applyProfileData,
  getOrCreateRoleProfile,
  getSelectedValue as getSelectedValues,
  isValidUrl,
  mergeNestedProfileBody,
  normalizeOption,
  normalizeSelectedOptions,
  normalizeText,
  normalizeWebsite,
} from "../utils/profileControllerUtils.js";

const getAgencyBody = (body) => ({
  ...mergeNestedProfileBody(body, ["data", "profile", "agency", "agencyProfile"]),
});

const getOrCreateProfile = (user) => getOrCreateRoleProfile(user, AgencyProfile);

const AGENCY_PROFILE_DISPLAY_FIELDS = [
  { key: "agencyName", label: "Agency / Company Name" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "city", label: "City" },
  { key: "agencyType", label: "Agency Type" },
  { key: "teamSize", label: "Team Size" },
  { key: "creatorsManaged", label: "Creators Managed" },
  { key: "focusAreas", label: "Focus Areas" },
  { key: "website", label: "Website" },
  { key: "description", label: "About Agency" },
];

const hasDisplayValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
};

const buildProfileFields = (profile) => {
  const profileObject = typeof profile.toObject === "function" ? profile.toObject() : profile;

  return AGENCY_PROFILE_DISPLAY_FIELDS
    .filter(({ key }) => hasDisplayValue(profileObject[key]))
    .map(({ key, label }) => ({
      key,
      label,
      value: profileObject[key],
    }));
};

const FOCUS_AREA_KEYS = [
  "focusAreas",
  "focus_areas",
  "focusArea",
  "focus_area",
  "focus",
  "services",
  "clientIndustries",
  "client_industries",
  "industries",
  "industry",
  "categories",
  "category",
  "selectedFocusAreas",
  "selected_focus_areas",
  "selectedFocusArea",
  "selected_focus_area",
  "selectedServices",
  "selected_services",
  "agencyFocusAreas",
  "agency_focus_areas",
  "specializations",
  "specialisations",
  "specialties",
  "specialities",
  "expertise",
  "niches",
  "verticals",
  "targetIndustries",
  "target_industries",
  "businessCategories",
  "business_categories",
];

const collectFocusAreasFromNestedBody = (value, matches = [], depth = 0) => {
  if (!value || typeof value !== "object" || depth > 4) {
    return matches;
  }

  for (const [key, entryValue] of Object.entries(value)) {
    if (FOCUS_AREA_KEYS.includes(key)) {
      matches.push(entryValue);
      continue;
    }

    if (entryValue && typeof entryValue === "object") {
      collectFocusAreasFromNestedBody(entryValue, matches, depth + 1);
    }
  }

  return matches;
};

const buildAgencyData = (body, { requireComplete = false } = {}) => {
  const agencyName = normalizeText(
    getSelectedValues(body, ["agencyName", "agency_name", "companyName"])
  );
  const contactPerson = normalizeText(
    getSelectedValues(body, [
      "contactPerson",
      "contact_person",
      "contactName",
      "contact_name",
      "personName",
      "ownerName",
      "fullName",
    ])
  );
  const city = normalizeText(getSelectedValues(body, ["city", "selectedCity", "location"]));
  const agencyType = normalizeOption(
    getSelectedValues(body, ["agencyType", "agency_type", "type", "selectedAgencyType"]),
    AGENCY_TYPES
  );
  const teamSize = normalizeOption(
    getSelectedValues(body, ["teamSize", "team_size", "team", "selectedTeamSize"]),
    AGENCY_TEAM_SIZES
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
    AGENCY_CREATORS_MANAGED_RANGES
  );
  const directFocusAreaValue = getSelectedValues(body, FOCUS_AREA_KEYS);
  const directFocusAreas = normalizeSelectedOptions(directFocusAreaValue, AGENCY_FOCUS_AREAS);
  const nestedFocusAreas =
    directFocusAreas.length > 0
      ? []
      : normalizeSelectedOptions(
          collectFocusAreasFromNestedBody(body),
          AGENCY_FOCUS_AREAS
        );
  const focusAreas = directFocusAreas.length > 0 ? directFocusAreas : nestedFocusAreas;
  const website = normalizeWebsite(getSelectedValues(body, ["website", "websiteUrl", "url"]));
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
      return { error: `Valid team size is required: ${AGENCY_TEAM_SIZES.join(", ")}` };
    }

    if (!creatorsManaged) {
      return {
        error: `Valid creators managed range is required: ${AGENCY_CREATORS_MANAGED_RANGES.join(", ")}`,
      };
    }

    if (focusAreas.length === 0) {
      const rawFocusAreas = directFocusAreaValue ?? collectFocusAreasFromNestedBody(body);

      if (rawFocusAreas !== undefined && rawFocusAreas !== null) {
        return {
          error: `Invalid focus area value. Allowed values: ${AGENCY_FOCUS_AREAS.join(", ")}`,
        };
      }

      return { error: "Please select at least 1 focus area" };
    }

    if (!description || description.length < 30) {
      return { error: "About your agency must be at least 30 characters" };
    }
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

export const saveFullOnboarding = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);
    const { profileData, error } = buildAgencyData(
      { ...profile.toObject(), ...getAgencyBody(req.body) },
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
      message: "Agency profile saved successfully",
      isProfileComplete: true,
      redirectTo: "/dashboard/agency",
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);
    const profileFields = buildProfileFields(profile);

    res.json({
      success: true,
      message: "Agency profile fetched successfully",
      onboardingStep: profile.isProfileComplete ? "completed" : "agency-details",
      user: {
        userId: req.user.userId,
        mobile: req.user.mobile,
        role: req.user.role,
      },
      profile,
      profileFields,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardingOptions = (req, res) => {
  res.json({
    success: true,
    agencyTypes: AGENCY_TYPES.map((value) => ({ label: value, value })),
    teamSizes: AGENCY_TEAM_SIZES.map((value) => ({ label: value, value })),
    creatorsManagedRanges: AGENCY_CREATORS_MANAGED_RANGES.map((value) => ({
      label: value,
      value,
    })),
    focusAreas: AGENCY_FOCUS_AREAS.map((value) => ({ label: value, value })),
    validation: {
      agencyNameMinLength: 2,
      contactPersonMinLength: 2,
      descriptionMinLength: 30,
    },
  });
};
