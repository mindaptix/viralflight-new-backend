const ALLOWED_ROLES = ["agency", "influencer", "brand"];

const ALLOWED_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
];

const PLATFORM_OPTIONS = [
  {
    platform: "instagram",
    label: "Instagram",
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "youtube",
    label: "YouTube",
    fields: ["channelName", "subscribers", "engagement"],
  },
  {
    platform: "tiktok",
    label: "TikTok",
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "twitter",
    label: "Twitter",
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "facebook",
    label: "Facebook",
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    fields: ["username", "followers", "engagement"],
  },
  {
    platform: "snapchat",
    label: "Snapchat",
    fields: ["username", "followers", "engagement"],
  },
];

const ALLOWED_PLATFORMS = PLATFORM_OPTIONS.map((option) => option.platform);
const PRIMARY_PLATFORMS = ["instagram", "youtube", "tiktok"];

const PLATFORM_REQUIRED_FIELDS = PLATFORM_OPTIONS.reduce((fields, option) => {
  fields[option.platform] = option.fields;
  return fields;
}, {});

const CONTENT_CATEGORIES = [
  "Fashion",
  "Beauty",
  "Travel",
  "Food",
  "Fitness",
  "Technology",
  "Gaming",
  "Lifestyle",
  "Education",
  "Finance",
  "Entertainment",
  "Music",
  "Sports",
  "Health",
  "Business",
  "Parenting",
];

const CONTENT_LANGUAGES = [
  "English",
  "Hindi",
  "Bengali",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Urdu",
];

const COLLABORATION_PREFERENCES = [
  "paid_only",
  "barter_product",
  "paid_and_barter",
];

export {
  ALLOWED_ROLES,
  ALLOWED_CITIES,
  PLATFORM_OPTIONS,
  ALLOWED_PLATFORMS,
  PRIMARY_PLATFORMS,
  PLATFORM_REQUIRED_FIELDS,
  CONTENT_CATEGORIES,
  CONTENT_LANGUAGES,
  COLLABORATION_PREFERENCES,
};
