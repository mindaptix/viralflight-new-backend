const BRAND_IMAGES = {
  "Beauty & Personal Care":
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80",
  "Fashion & Apparel":
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
  Technology:
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80",
  "Health & Fitness":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80",
  "Food & Beverage":
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
  "D2C / E-commerce":
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80",
};

const getBrandImage = (industry) =>
  BRAND_IMAGES[industry] ||
  "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=400&q=80";

export const buildBrandDiscoveryQuery = ({ search, industry, city }) => {
  const query = { isProfileComplete: true };

  if (city && city !== "All") {
    query.city = city;
  }

  if (industry && industry !== "All") {
    query.industry = industry;
  }

  if (search) {
    const regex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    query.$or = [
      { brandName: regex },
      { industry: regex },
      { city: regex },
      { description: regex },
    ];
  }

  return query;
};

export const toDiscoveryBrandDto = (profile) => {
  const interests = profile.campaignInterests || [];
  const lookingFor = interests[0] || "Creator collaborations";

  return {
    id: profile._id,
    _id: profile._id,
    profileId: profile._id,
    name: profile.brandName || "Brand",
    brandName: profile.brandName || "Brand",
    displayName: profile.brandName || "Brand",
    niche: profile.industry || "",
    industry: profile.industry || "",
    category: profile.industry || "",
    city: profile.city || "",
    subtitle: lookingFor,
    lookingFor,
    imageUrl: getBrandImage(profile.industry),
    logoUrl: getBrandImage(profile.industry),
    verified: profile.isProfileComplete === true,
    mobile: profile.mobile || "",
    campaignInterests: interests,
  };
};

export const buildAgencyDiscoveryQuery = ({ search, agencyType, niche, city }) => {
  const query = { isProfileComplete: true };

  if (city && city !== "All") {
    query.city = city;
  }

  if (agencyType && agencyType !== "All") {
    query.agencyType = agencyType;
  }

  if (niche && niche !== "All") {
    query.focusAreas = niche;
  }

  if (search) {
    const regex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    query.$or = [
      { agencyName: regex },
      { agencyType: regex },
      { city: regex },
      { description: regex },
      { focusAreas: regex },
    ];
  }

  return query;
};

export const toDiscoveryAgencyDto = (profile) => {
  const focus = (profile.focusAreas || []).slice(0, 2).join(" · ");

  return {
    id: profile._id,
    _id: profile._id,
    profileId: profile._id,
    name: profile.agencyName || "Agency",
    agencyName: profile.agencyName || "Agency",
    displayName: profile.agencyName || "Agency",
    niche: focus || profile.agencyType || "Agency",
    category: (profile.focusAreas || [])[0] || profile.agencyType || "",
    city: profile.city || "",
    subtitle: profile.agencyType || "",
    imageUrl:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80",
    verified: profile.isProfileComplete === true,
    mobile: profile.mobile || "",
    focusAreas: profile.focusAreas || [],
  };
};
