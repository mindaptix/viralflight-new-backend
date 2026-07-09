const AGENCY_TYPES = [
  "Talent Management",
  "Influencer Marketing",
  "Creative / Production",
  "PR & Communications",
  "Full-service Agency",
  "Boutique Agency",
];

const AGENCY_TEAM_SIZES = ["Solo", "2-5", "6-15", "16-50", "50+"];

const AGENCY_CREATORS_MANAGED_RANGES = [
  "1-10",
  "11-25",
  "26-50",
  "51-100",
  "100+",
];

const AGENCY_FOCUS_AREAS = [
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

const BRAND_INDUSTRIES = [
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

const BRAND_CAMPAIGN_INTERESTS = [
  "Influencer posts",
  "Reels & short video",
  "UGC content",
  "Product seeding",
  "Brand ambassador",
  "Event appearances",
  "Affiliate marketing",
];

const BRAND_MONTHLY_CAMPAIGN_BUDGETS = [
  "Under ₹50K",
  "₹50K - ₹2L",
  "₹2L - ₹10L",
  "₹10L - ₹50L",
  "₹50L+",
  "Not sure yet",
];

const toPayloadOptions = (values) =>
  values.map((value) => ({
    label: value,
    value,
  }));

export {
  AGENCY_CREATORS_MANAGED_RANGES,
  AGENCY_FOCUS_AREAS,
  AGENCY_TEAM_SIZES,
  AGENCY_TYPES,
  BRAND_CAMPAIGN_INTERESTS,
  BRAND_INDUSTRIES,
  BRAND_MONTHLY_CAMPAIGN_BUDGETS,
  toPayloadOptions,
};
