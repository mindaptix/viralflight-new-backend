import mongoose from "mongoose";

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    tagline: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    city: { type: String, required: true, trim: true, index: true },
    imageUrl: { type: String, trim: true, default: "" },
    tags: { type: [{ type: String, trim: true }], default: [] },
    baseMemberCount: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

communitySchema.index({ isActive: 1, sortOrder: 1, createdAt: -1 });
communitySchema.index({ name: "text", tagline: "text", category: "text", tags: "text" });

const Community =
  mongoose.models.Community ||
  mongoose.model("Community", communitySchema, "communities");

export default Community;
