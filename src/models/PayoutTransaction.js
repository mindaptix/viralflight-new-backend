import mongoose from "mongoose";

const payoutTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["campaign_payout", "referral_bonus", "withdrawal"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["processed", "pending", "failed"],
      default: "processed",
      index: true,
    },
    method: {
      type: String,
      enum: ["bank_account", "upi", "system"],
      default: "system",
    },
    referenceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

payoutTransactionSchema.index({ userId: 1, createdAt: -1 });

const PayoutTransaction =
  mongoose.models.PayoutTransaction ||
  mongoose.model(
    "PayoutTransaction",
    payoutTransactionSchema,
    "payout_transactions"
  );

export default PayoutTransaction;
