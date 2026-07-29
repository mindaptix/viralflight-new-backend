import "dotenv/config";
import mongoose from "mongoose";

import Community from "../src/models/Community.js";

const communities = [
  {
    name: "Glow Circle Mumbai",
    tagline: "Beauty creators sharing routines, drops & collab tips.",
    category: "Beauty",
    city: "Mumbai",
    baseMemberCount: 1840,
    imageUrl:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
    tags: ["Skincare", "Reels", "UGC"],
    sortOrder: 1,
  },
  {
    name: "Style Lab Delhi",
    tagline: "Street style, thrift finds, and brand try-ons.",
    category: "Fashion",
    city: "Delhi",
    baseMemberCount: 2210,
    imageUrl:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
    tags: ["OOTD", "Lookbooks"],
    sortOrder: 2,
  },
  {
    name: "Fit Flight India",
    tagline: "Trainers & wellness creators across India.",
    category: "Fitness",
    city: "Pan-India",
    baseMemberCount: 3120,
    imageUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
    tags: ["Gym", "Nutrition"],
    sortOrder: 3,
  },
  {
    name: "Byte Creators Bengaluru",
    tagline: "Gadgets, AI tools, and honest reviews.",
    category: "Tech",
    city: "Bengaluru",
    baseMemberCount: 980,
    imageUrl:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
    tags: ["Reviews", "Shorts"],
    sortOrder: 4,
  },
  {
    name: "Wander Goa",
    tagline: "Travel vlogs, staycations, and hidden spots.",
    category: "Travel",
    city: "Goa",
    baseMemberCount: 1460,
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    tags: ["Vlogs", "Hotels"],
    sortOrder: 5,
  },
  {
    name: "Plate & Pour Hyderabad",
    tagline: "Foodies mapping cafes, biryani runs & recipes.",
    category: "Food",
    city: "Hyderabad",
    baseMemberCount: 1280,
    imageUrl:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    tags: ["Cafes", "Recipes"],
    sortOrder: 6,
  },
  {
    name: "Everyday Creators",
    tagline: "Lifestyle storytellers — home, habits, soft launches.",
    category: "Lifestyle",
    city: "Pan-India",
    baseMemberCount: 4050,
    imageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80",
    tags: ["Daily", "Collabs"],
    sortOrder: 7,
  },
  {
    name: "Level Up India",
    tagline: "Streamers, esports clips, and gaming setups.",
    category: "Gaming",
    city: "Pan-India",
    baseMemberCount: 870,
    imageUrl:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
    tags: ["Streams", "Clips"],
    sortOrder: 8,
  },
];

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("MONGO_URI or DATABASE_URL is required");
  }

  await mongoose.connect(mongoUri);

  for (const community of communities) {
    await Community.findOneAndUpdate(
      { name: community.name },
      { $set: { ...community, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seeded ${communities.length} communities`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});
