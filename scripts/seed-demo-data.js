import "dotenv/config";
import mongoose from "mongoose";

import User from "../src/models/User.js";
import InfluencerProfile from "../src/models/InfluencerProfile.js";
import BrandProfile from "../src/models/BrandProfile.js";
import AgencyProfile from "../src/models/AgencyProfile.js";
import Campaign from "../src/models/Campaign.js";
import BrandInvite from "../src/models/BrandInvite.js";
import Collaboration from "../src/models/Collaboration.js";
import InfluencerProfileView from "../src/models/InfluencerProfileView.js";
import Notification from "../src/models/Notification.js";
import CampaignApplication from "../src/models/CampaignApplication.js";

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);
  return date;
};

const influencers = [
  {
    mobile: "+919000000001",
    name: "Ananya Sharma",
    city: "Mumbai",
    bio: "Beauty & lifestyle creator sharing honest skincare routines, GRWM reels, and everyday fashion from Mumbai.",
    contentCategories: ["Beauty", "Fashion", "Lifestyle"],
    contentLanguages: ["Hindi", "English"],
    platform: {
      platform: "instagram",
      username: "ananya.sharma",
      followers: 812000,
      engagement: 5.2,
    },
    rateRange: { min: 15000, max: 45000, currency: "INR" },
    profession: 'Beauty creator',
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000002",
    name: "Rohit Verma",
    city: "Delhi",
    bio: "Fitness coach and transformation storyteller helping busy professionals build sustainable workout habits.",
    contentCategories: ["Fitness", "Health & Wellness"],
    contentLanguages: ["Hindi", "English"],
    platform: {
      platform: "instagram",
      username: "rohit.fit",
      followers: 240000,
      engagement: 4.1,
    },
    rateRange: { min: 8000, max: 25000, currency: "INR" },
    profession: 'Fitness coach',
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000003",
    name: "Priya Nair",
    city: "Bengaluru",
    bio: "Tech reviewer covering gadgets, AI tools, and productivity apps with crisp explainers for Indian audiences.",
    contentCategories: ["Tech", "Education"],
    contentLanguages: ["English", "Tamil"],
    platform: {
      platform: "youtube",
      channelName: "Priya Tech Talk",
      subscribers: 520000,
      engagement: 3.8,
    },
    rateRange: { min: 20000, max: 60000, currency: "INR" },
    profession: 'Tech reviewer',
    imageUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000004",
    name: "Kabir Singh",
    city: "Jaipur",
    bio: "Travel vlogger documenting hidden gems, boutique stays, and food trails across Rajasthan and beyond.",
    contentCategories: ["Travel", "Food"],
    contentLanguages: ["Hindi", "English"],
    platform: {
      platform: "instagram",
      username: "kabir.wanders",
      followers: 390000,
      engagement: 4.6,
    },
    rateRange: { min: 12000, max: 35000, currency: "INR" },
    profession: 'Travel vlogger',
    imageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000005",
    name: "Sneha Reddy",
    city: "Hyderabad",
    bio: "Food creator exploring cafes, home recipes, and regional flavours with quick reels and story takeovers.",
    contentCategories: ["Food", "Lifestyle"],
    contentLanguages: ["Telugu", "English"],
    platform: {
      platform: "instagram",
      username: "sneha.bites",
      followers: 175000,
      engagement: 6.1,
    },
    rateRange: { min: 6000, max: 18000, currency: "INR" },
    profession: 'Food creator',
    imageUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000006",
    name: "Arjun Mehta",
    city: "Pune",
    bio: "Gaming streamer and esports commentator covering mobile titles, setup tours, and tournament highlights.",
    contentCategories: ["Gaming", "Tech"],
    contentLanguages: ["English", "Hindi"],
    platform: {
      platform: "youtube",
      channelName: "Arjun Plays",
      subscribers: 680000,
      engagement: 4.9,
    },
    rateRange: { min: 25000, max: 75000, currency: "INR" },
    profession: 'Gaming streamer',
    imageUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000007",
    name: "Megha Sharma",
    city: "Mumbai",
    bio: "Lifestyle creator known for GRWM reels, apartment tours, and weekend city diaries from Bandra.",
    contentCategories: ["Lifestyle", "Fashion", "Beauty"],
    contentLanguages: ["Hindi", "English"],
    platform: {
      platform: "instagram",
      username: "megha.sharma",
      followers: 428000,
      engagement: 5.8,
    },
    rateRange: { min: 18000, max: 42000, currency: "INR" },
    profession: "Lifestyle creator",
    imageUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000008",
    name: "Arjun Verma",
    city: "Delhi",
    bio: "Music and culture creator covering indie gigs, headphones, and late-night studio sessions.",
    contentCategories: ["Music", "Lifestyle"],
    contentLanguages: ["Hindi", "English"],
    platform: {
      platform: "instagram",
      username: "arjun.verma",
      followers: 196000,
      engagement: 4.4,
    },
    rateRange: { min: 9000, max: 28000, currency: "INR" },
    profession: "Music creator",
    imageUrl:
      "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000009",
    name: "Riya Malhotra",
    city: "Chandigarh",
    bio: "Fitness and wellness creator running 30-day challenges, meal prep reels, and gym form breakdowns.",
    contentCategories: ["Fitness", "Health & Wellness", "Food"],
    contentLanguages: ["Hindi", "English"],
    platform: {
      platform: "instagram",
      username: "riya.moves",
      followers: 312000,
      engagement: 6.4,
    },
    rateRange: { min: 14000, max: 38000, currency: "INR" },
    profession: "Fitness creator",
    imageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000010",
    name: "Ishaan Kapoor",
    city: "Lucknow",
    bio: "Comedy sketches on Indian family life, campus humour, and relatable office bits.",
    contentCategories: ["Comedy", "Lifestyle"],
    contentLanguages: ["Hindi", "English"],
    platform: {
      platform: "instagram",
      username: "ishaan.kapoor",
      followers: 540000,
      engagement: 7.1,
    },
    rateRange: { min: 20000, max: 55000, currency: "INR" },
    profession: "Comedy creator",
    imageUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000011",
    name: "Tara Joshi",
    city: "Goa",
    bio: "Beauty and travel creator shooting beach makeup looks, monsoon fashion, and boutique stay reviews.",
    contentCategories: ["Beauty", "Travel", "Fashion"],
    contentLanguages: ["English", "Hindi"],
    platform: {
      platform: "instagram",
      username: "tara.joshi",
      followers: 267000,
      engagement: 5.5,
    },
    rateRange: { min: 11000, max: 32000, currency: "INR" },
    profession: "Beauty creator",
    imageUrl:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&h=400&q=80",
  },
  {
    mobile: "+919000000012",
    name: "Neel Patel",
    city: "Ahmedabad",
    bio: "Personal finance explainers for first-time investors, UPI habits, and D2C money stories.",
    contentCategories: ["Finance", "Education"],
    contentLanguages: ["Gujarati", "Hindi", "English"],
    platform: {
      platform: "youtube",
      channelName: "Neel Money",
      subscribers: 410000,
      engagement: 3.6,
    },
    rateRange: { min: 16000, max: 48000, currency: "INR" },
    profession: "Finance creator",
    imageUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&h=400&q=80",
  },
];

const brands = [
  {
    mobile: "+919000000101",
    brandName: "Glow Co.",
    contactPerson: "Meera Kapoor",
    city: "Mumbai",
    industry: "Beauty & Personal Care",
    website: "https://glowco.example.com",
    instagramHandle: "glowco.in",
    campaignInterests: ["Reels & short video", "UGC content"],
    monthlyCampaignBudget: "₹2L - ₹10L",
    description: "Clean beauty brand looking for authentic skincare creators.",
  },
  {
    mobile: "+919000000102",
    brandName: "StyleMint",
    contactPerson: "Rahul Jain",
    city: "Delhi",
    industry: "Fashion & Apparel",
    website: "https://stylemint.example.com",
    instagramHandle: "stylemint.in",
    campaignInterests: ["Influencer posts", "Brand ambassador"],
    monthlyCampaignBudget: "₹10L - ₹50L",
    description: "D2C fashion label focused on festive drops and lookbooks.",
  },
  {
    mobile: "+919000000103",
    brandName: "NovaBits",
    contactPerson: "Isha Malhotra",
    city: "Bengaluru",
    industry: "Technology",
    website: "https://novabits.example.com",
    instagramHandle: "novabits.tech",
    campaignInterests: ["Reels & short video", "Product seeding"],
    monthlyCampaignBudget: "₹50K - ₹2L",
    description: "Consumer electronics brand launching accessories and audio gear.",
  },
  {
    mobile: "+919000000104",
    brandName: "FitFuel",
    contactPerson: "Dev Sharma",
    city: "Pune",
    industry: "Health & Fitness",
    website: "https://fitfuel.example.com",
    instagramHandle: "fitfuel.india",
    campaignInterests: ["UGC content", "Affiliate marketing"],
    monthlyCampaignBudget: "₹2L - ₹10L",
    description: "Protein and wellness supplements for active lifestyles.",
  },
];

const agencies = [
  {
    mobile: "+919000000201",
    agencyName: "Creator Hive",
    contactPerson: "Nisha Agarwal",
    city: "Mumbai",
    agencyType: "Influencer Marketing",
    teamSize: "6-15",
    creatorsManaged: "26-50",
    focusAreas: ["Fashion", "Beauty", "Lifestyle"],
    website: "https://creatorhive.example.com",
    description: "Full-service influencer campaigns for D2C and FMCG brands.",
  },
  {
    mobile: "+919000000202",
    agencyName: "Pulse Media",
    contactPerson: "Vikram Desai",
    city: "Bengaluru",
    agencyType: "Talent Management",
    teamSize: "16-50",
    creatorsManaged: "51-100",
    focusAreas: ["Tech", "Gaming", "Education"],
    website: "https://pulsemedia.example.com",
    description: "Talent management and campaign ops for tech-first creators.",
  },
];

const campaignTemplates = [
  {
    brandMobile: "+919000000101",
    title: "Summer Skincare Reel",
    description: "Need 1 Instagram reel + 3 stories showcasing our new sunscreen range.",
    category: "Beauty",
    platforms: ["instagram"],
    deliverables: ["1 Reel", "3 Stories"],
    budgetAmount: 25000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=640&q=80",
    location: "Mumbai",
    daysLeft: 3,
  },
  {
    brandMobile: "+919000000102",
    title: "Festive Fashion Series",
    description: "3-post carousel + 1 reel for our festive collection launch.",
    category: "Fashion",
    platforms: ["instagram"],
    deliverables: ["1 Reel", "1 Carousel"],
    budgetAmount: 40000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=640&q=80",
    location: "Delhi",
    daysLeft: 5,
  },
  {
    brandMobile: "+919000000103",
    title: "Tech Unboxing Video",
    description: "Honest unboxing and 60-second review of our new earbuds.",
    category: "Tech",
    platforms: ["youtube", "instagram"],
    deliverables: ["1 Short", "1 Reel"],
    budgetAmount: 18000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=640&q=80",
    location: "Pan-India",
    daysLeft: 7,
  },
  {
    brandMobile: "+919000000104",
    title: "Protein Shake Review",
    description: "Fitness creator to share post-workout routine featuring FitFuel shake.",
    category: "Fitness",
    platforms: ["instagram"],
    deliverables: ["1 Reel", "2 Stories"],
    budgetAmount: 12000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=640&q=80",
    location: "Pune",
    daysLeft: 2,
  },
  {
    brandMobile: "+919000000101",
    title: "Monsoon Glow Routine",
    description: "Skincare routine series for humid weather — reels preferred.",
    category: "Beauty",
    platforms: ["instagram"],
    deliverables: ["2 Reels"],
    budgetAmount: 32000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=640&q=80",
    location: "Mumbai",
    daysLeft: 10,
  },
  {
    brandMobile: "+919000000102",
    title: "Street Style Lookbook",
    description: "OOTD content with StyleMint pieces in urban locations.",
    category: "Fashion",
    platforms: ["instagram", "youtube"],
    deliverables: ["1 Reel", "1 Post"],
    budgetAmount: 28000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=640&q=80",
    location: "Delhi",
    daysLeft: 12,
  },
  {
    agencyMobile: "+919000000201",
    title: "Creator Hive x D2C Launch",
    description: "Agency-managed campaign for a new home fragrance brand.",
    category: "Lifestyle",
    platforms: ["instagram"],
    deliverables: ["1 Reel", "1 Story set"],
    budgetAmount: 22000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=640&q=80",
    location: "Mumbai",
    daysLeft: 8,
  },
  {
    agencyMobile: "+919000000202",
    title: "Gaming Gear Drop",
    description: "Pulse Media campaign for a gaming peripheral launch.",
    category: "Gaming",
    platforms: ["youtube", "instagram"],
    deliverables: ["1 Integration", "2 Shorts"],
    budgetAmount: 55000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80",
    location: "Bengaluru",
    daysLeft: 14,
  },
];

async function upsertUser({ mobile, role }) {
  return User.findOneAndUpdate(
    { mobile, role },
    {
      mobile,
      role,
      isMobileVerified: true,
      lastLoginAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seedInfluencer(data) {
  const user = await upsertUser({ mobile: data.mobile, role: "influencer" });
  const profile = await InfluencerProfile.findOneAndUpdate(
    { mobile: data.mobile },
    {
      userId: user._id,
      mobile: data.mobile,
      name: data.name,
      city: data.city,
      bio: data.bio,
      contentCategories: data.contentCategories,
      contentLanguages: data.contentLanguages,
      platforms: [data.platform],
      collaborationPreference: "paid_and_barter",
      rateRange: data.rateRange,
      rateCard: {
        currency: "INR",
        items: [
          {
            platform: data.platform.platform,
            deliverable: data.platform.platform === "youtube" ? "integration" : "reel",
            price: data.rateRange.max,
          },
          {
            platform: data.platform.platform,
            deliverable: "story",
            price: Math.round(data.rateRange.min / 3),
          },
        ],
      },
      mediaKit: {
        about: data.bio,
        audience: {
          ageGroups: ["18-24", "25-34"],
          topCities: [data.city, "Mumbai", "Delhi"],
          genderSplit: { female: 62, male: 38 },
        },
        caseStudies: [
          {
            brand: brands[0].brandName,
            title: "Launch Reel",
            result: "1.1M reach",
            url: "",
          },
        ],
        portfolioImages: [data.imageUrl],
      },
      profileImageUrl: data.imageUrl,
      profession: data.profession || data.contentCategories[0] || 'Creator',
      instagram: {
        handle: data.platform.username || data.platform.channelName,
        followers: data.platform.followers || data.platform.subscribers,
        engagementRate: data.platform.engagement,
        profilePictureUrl: data.imageUrl,
        isConnected: true,
        connectedAt: new Date(),
        lastSyncedAt: new Date(),
      },
      isProfileComplete: true,
      completedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { user, profile };
}

async function seedBrand(data) {
  const user = await upsertUser({ mobile: data.mobile, role: "brand" });
  const profile = await BrandProfile.findOneAndUpdate(
    { mobile: data.mobile },
    {
      userId: user._id,
      mobile: data.mobile,
      ...data,
      isProfileComplete: true,
      completedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { user, profile };
}

async function seedAgency(data) {
  const user = await upsertUser({ mobile: data.mobile, role: "agency" });
  const profile = await AgencyProfile.findOneAndUpdate(
    { mobile: data.mobile },
    {
      userId: user._id,
      mobile: data.mobile,
      ...data,
      isProfileComplete: true,
      completedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { user, profile };
}

async function seedCampaign(template, brandMap, agencyMap) {
  const brandEntry = template.brandMobile
    ? brandMap.get(template.brandMobile)
    : null;
  const agencyEntry = template.agencyMobile
    ? agencyMap.get(template.agencyMobile)
    : null;

  const ownerRole = brandEntry ? "brand" : "agency";
  const owner = brandEntry || agencyEntry;
  if (!owner) {
    return null;
  }

  const ownerName = brandEntry
    ? brandEntry.profile.brandName
    : agencyEntry.profile.agencyName;

  return Campaign.findOneAndUpdate(
    { title: template.title, ownerMobile: owner.profile.mobile },
    {
      ownerRole,
      ownerUserId: owner.user._id,
      ownerProfileId: owner.profile._id,
      ownerMobile: owner.profile.mobile,
      ownerName,
      brandUserId: brandEntry?.user._id,
      brandProfileId: brandEntry?.profile._id,
      brandMobile: brandEntry?.profile.mobile,
      brandName: brandEntry?.profile.brandName,
      agencyUserId: agencyEntry?.user._id,
      agencyProfileId: agencyEntry?.profile._id,
      agencyMobile: agencyEntry?.profile.mobile,
      agencyName: agencyEntry?.profile.agencyName,
      title: template.title,
      description: template.description,
      category: template.category,
      platforms: template.platforms,
      deliverables: template.deliverables,
      budgetAmount: template.budgetAmount,
      budgetCurrency: "INR",
      coverImageUrl: template.coverImageUrl,
      location: template.location,
      applicationDeadline: daysFromNow(template.daysLeft),
      status: "active",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("MONGO_URI or DATABASE_URL is required");
  }

  await mongoose.connect(mongoUri);

  const influencerRecords = [];
  for (const item of influencers) {
    influencerRecords.push(await seedInfluencer(item));
  }

  const brandRecords = [];
  for (const item of brands) {
    brandRecords.push(await seedBrand(item));
  }

  const agencyRecords = [];
  for (const item of agencies) {
    agencyRecords.push(await seedAgency(item));
  }

  const brandMap = new Map(
    brandRecords.map((entry) => [entry.profile.mobile, entry])
  );
  const agencyMap = new Map(
    agencyRecords.map((entry) => [entry.profile.mobile, entry])
  );

  const campaigns = [];
  for (const template of campaignTemplates) {
    const campaign = await seedCampaign(template, brandMap, agencyMap);
    if (campaign) {
      campaigns.push(campaign);
    }
  }

  const primaryInfluencer = influencerRecords[0];
  const primaryBrand = brandRecords[0];

  for (const brandEntry of brandRecords) {
    await BrandInvite.findOneAndUpdate(
      {
        influencerProfileId: primaryInfluencer.profile._id,
        brandUserId: brandEntry.user._id,
        status: "pending",
      },
      {
        influencerProfileId: primaryInfluencer.profile._id,
        influencerUserId: primaryInfluencer.user._id,
        influencerMobile: primaryInfluencer.profile.mobile,
        brandUserId: brandEntry.user._id,
        brandMobile: brandEntry.profile.mobile,
        campaignId: campaigns[0]?._id,
        message: `${brandEntry.profile.brandName} wants to collaborate with you`,
        status: "pending",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  for (const brandEntry of brandRecords.slice(0, 3)) {
    await InfluencerProfileView.findOneAndUpdate(
      {
        influencerProfileId: primaryInfluencer.profile._id,
        viewerUserId: brandEntry.user._id,
      },
      {
        influencerProfileId: primaryInfluencer.profile._id,
        influencerUserId: primaryInfluencer.user._id,
        influencerMobile: primaryInfluencer.profile.mobile,
        viewerUserId: brandEntry.user._id,
        viewerMobile: brandEntry.profile.mobile,
        viewerRole: "brand",
        lastViewedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await Collaboration.findOneAndUpdate(
    {
      influencerProfileId: primaryInfluencer.profile._id,
      brandUserId: primaryBrand.user._id,
      title: "Summer Skincare Reel",
    },
    {
      influencerProfileId: primaryInfluencer.profile._id,
      influencerUserId: primaryInfluencer.user._id,
      influencerMobile: primaryInfluencer.profile.mobile,
      brandUserId: primaryBrand.user._id,
      brandMobile: primaryBrand.profile.mobile,
      campaignId: campaigns[0]?._id,
      title: "Summer Skincare Reel",
      status: "active",
      startedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Collaboration.findOneAndUpdate(
    {
      influencerProfileId: primaryInfluencer.profile._id,
      brandUserId: brandRecords[1].user._id,
      title: "Festive Fashion Series",
    },
    {
      influencerProfileId: primaryInfluencer.profile._id,
      influencerUserId: primaryInfluencer.user._id,
      influencerMobile: primaryInfluencer.profile.mobile,
      brandUserId: brandRecords[1].user._id,
      brandMobile: brandRecords[1].profile.mobile,
      campaignId: campaigns[1]?._id,
      title: "Festive Fashion Series",
      status: "active",
      startedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (campaigns[0]) {
    await CampaignApplication.findOneAndUpdate(
      {
        campaignId: campaigns[0]._id,
        influencerProfileId: influencerRecords[1].profile._id,
      },
      {
        campaignId: campaigns[0]._id,
        influencerProfileId: influencerRecords[1].profile._id,
        influencerUserId: influencerRecords[1].user._id,
        influencerMobile: influencerRecords[1].profile.mobile,
        influencerName: influencerRecords[1].profile.name,
        pitch: "I can deliver an engaging reel with before/after skincare results.",
        proposedRate: 22000,
        currency: "INR",
        status: "applied",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await Notification.findOneAndUpdate(
    {
      userId: primaryInfluencer.user._id,
      title: "New brand invite",
    },
    {
      userId: primaryInfluencer.user._id,
      role: "influencer",
      title: "New brand invite",
      body: "Glow Co. invited you to Summer Skincare Reel",
      type: "campaign_invite",
      targetId: String(campaigns[0]?._id || ""),
      metadata: {
        brandName: primaryBrand.profile.brandName,
      },
      isRead: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log("Demo data seeded successfully");
  console.log(`Influencers: ${influencerRecords.length}`);
  console.log(`Brands: ${brandRecords.length}`);
  console.log(`Agencies: ${agencyRecords.length}`);
  console.log(`Campaigns: ${campaigns.length}`);
  console.log("");
  console.log("Test logins (OTP via Twilio):");
  console.log("  Primary influencer: +919000000001 (Ananya Sharma)");
  console.log("  Primary brand:      +919000000101 (Glow Co.)");
  console.log("  Primary agency:     +919000000201 (Creator Hive)");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
