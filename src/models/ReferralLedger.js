import mongoose from "mongoose";

const referralLedgerSchema = new mongoose.Schema(
  {
    referrerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "registered",
        "profile_completed",
        "first_deal_completed",
        "completed",
      ],
      default: "registered",
      index: true,
    },
    rewardAmount: {
      type: Number,
      default: 500,
      min: 0,
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

referralLedgerSchema.index(
  { referrerUserId: 1, referredUserId: 1 },
  { unique: true }
);

const ReferralLedger =
  mongoose.models.ReferralLedger ||
  mongoose.model("ReferralLedger", referralLedgerSchema, "referral_ledger");

export default ReferralLedger;
