import crypto from "crypto";
import InfluencerProfile from "../../models/InfluencerProfile.js";
import PayoutTransaction from "../../models/PayoutTransaction.js";
import { getOrCreateRoleProfile } from "../../utils/profileControllerUtils.js";
import { ValidationError, NotFoundError, AppError } from "../../shared/errors/AppError.js";
import payoutGateway, {
  maskPan,
  maskAccountNumber,
  validatePanFormat,
  validateGstFormat,
  validateIfscFormat,
  validateVpaFormat,
} from "../../infrastructure/external/payout/PayoutGatewayService.js";

const MINIMUM_WITHDRAWAL_THRESHOLD = 500;

export const getKycStatus = async ({ user }) => {
  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);
  const kyc = profile.kyc || {};

  return {
    status: kyc.status || "not_submitted",
    panNumber: kyc.panNumber ? maskPan(kyc.panNumber) : null,
    panName: kyc.panName || null,
    gstNumber: kyc.gstNumber || null,
    rejectionReason: kyc.rejectionReason || null,
    verifiedAt: kyc.verifiedAt || null,
  };
};

export const submitKyc = async ({ user, body }) => {
  const { panNumber, panName, dob, gstNumber } = body || {};

  if (!panNumber || typeof panNumber !== "string") {
    throw new ValidationError("panNumber is required");
  }

  const normalizedPan = panNumber.trim().toUpperCase();
  if (!validatePanFormat(normalizedPan)) {
    throw new ValidationError(
      "Invalid PAN format. Expected format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)"
    );
  }

  if (!panName || typeof panName !== "string" || panName.trim().length < 2) {
    throw new ValidationError("Valid panName is required (at least 2 characters)");
  }

  let normalizedGst = null;
  if (gstNumber) {
    normalizedGst = String(gstNumber).trim().toUpperCase();
    if (!validateGstFormat(normalizedGst)) {
      throw new ValidationError(
        "Invalid GST format. Expected 15-character GSTIN (e.g. 07AAAAA0000A1Z5)"
      );
    }
  }

  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);

  const verificationResult = await payoutGateway.verifyPan({
    panNumber: normalizedPan,
    panName: panName.trim(),
    dob,
  });

  const isVerified = verificationResult.isValid && verificationResult.status === "verified";
  const status = isVerified ? "verified" : "pending";
  const verifiedAt = isVerified ? verificationResult.verifiedAt || new Date() : null;

  profile.kyc = {
    status,
    panNumber: normalizedPan,
    panName: panName.trim(),
    dob: dob ? String(dob).trim() : undefined,
    gstNumber: normalizedGst,
    rejectionReason: null,
    verifiedAt,
  };

  await profile.save();

  return {
    status: profile.kyc.status,
    panNumber: maskPan(profile.kyc.panNumber),
    panName: profile.kyc.panName,
    gstNumber: profile.kyc.gstNumber,
    rejectionReason: profile.kyc.rejectionReason,
    verifiedAt: profile.kyc.verifiedAt,
  };
};

export const getPayoutAccount = async ({ user }) => {
  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);
  const payout = profile.payoutAccount || {};

  return {
    bankAccount: payout.bankAccount?.isVerified
      ? {
          accountNumberMasked:
            payout.bankAccount.accountNumberMasked ||
            maskAccountNumber(payout.bankAccount.accountNumber),
          ifsc: payout.bankAccount.ifsc,
          bankName: payout.bankAccount.bankName,
          beneficiaryName: payout.bankAccount.beneficiaryName,
          isVerified: Boolean(payout.bankAccount.isVerified),
        }
      : null,
    vpa: payout.vpa || null,
  };
};

export const setupPayoutAccount = async ({ user, body }) => {
  const { type, accountNumber, ifsc, beneficiaryName, vpa } = body || {};

  if (!type || !["bank_account", "upi"].includes(type)) {
    throw new ValidationError("type must be either 'bank_account' or 'upi'");
  }

  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);
  if (!profile.payoutAccount) {
    profile.payoutAccount = {};
  }

  if (type === "bank_account") {
    if (!accountNumber || String(accountNumber).trim().length < 8) {
      throw new ValidationError("Valid accountNumber is required");
    }
    if (!ifsc || !validateIfscFormat(ifsc)) {
      throw new ValidationError("Valid IFSC code is required (e.g. HDFC0001234)");
    }
    if (!beneficiaryName || String(beneficiaryName).trim().length < 2) {
      throw new ValidationError("Valid beneficiaryName is required");
    }

    const gatewayResult = await payoutGateway.createContactAndFundAccount({
      user,
      type: "bank_account",
      accountNumber,
      ifsc,
      beneficiaryName: beneficiaryName.trim(),
    });

    profile.payoutAccount.bankAccount = gatewayResult.bankAccount;
    profile.payoutAccount.contactId = gatewayResult.contactId;
    profile.payoutAccount.fundAccountId = gatewayResult.fundAccountId;
  } else if (type === "upi") {
    if (!vpa || !validateVpaFormat(vpa)) {
      throw new ValidationError("Valid VPA (UPI ID) is required (e.g. creator@upi)");
    }

    const gatewayResult = await payoutGateway.createContactAndFundAccount({
      user,
      type: "upi",
      vpa,
    });

    profile.payoutAccount.vpa = gatewayResult.vpa;
    profile.payoutAccount.contactId = gatewayResult.contactId;
    profile.payoutAccount.fundAccountId = gatewayResult.fundAccountId;
  }

  await profile.save();

  return {
    bankAccount: profile.payoutAccount.bankAccount
      ? {
          accountNumberMasked: profile.payoutAccount.bankAccount.accountNumberMasked,
          ifsc: profile.payoutAccount.bankAccount.ifsc,
          bankName: profile.payoutAccount.bankAccount.bankName,
          beneficiaryName: profile.payoutAccount.bankAccount.beneficiaryName,
          isVerified: Boolean(profile.payoutAccount.bankAccount.isVerified),
        }
      : null,
    vpa: profile.payoutAccount.vpa || null,
  };
};

export const getWalletBalance = async ({ user }) => {
  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);
  const wallet = profile.wallet || {};

  return {
    availableBalance: wallet.availableBalance ?? 0,
    pendingClearance: wallet.pendingClearance ?? 0,
    lifetimeEarnings: wallet.lifetimeEarnings ?? 0,
    currency: wallet.currency || "INR",
  };
};

export const withdrawFunds = async ({ user, body }) => {
  const { amount, method } = body || {};

  if (!amount || typeof amount !== "number" || amount <= 0) {
    throw new ValidationError("A positive withdrawal amount is required");
  }

  if (amount < MINIMUM_WITHDRAWAL_THRESHOLD) {
    throw new ValidationError(
      `Minimum withdrawal threshold is ₹${MINIMUM_WITHDRAWAL_THRESHOLD}`
    );
  }

  if (!method || !["bank_account", "upi"].includes(method)) {
    throw new ValidationError("Withdrawal method must be either 'bank_account' or 'upi'");
  }

  const profile = await getOrCreateRoleProfile(user, InfluencerProfile);

  // Validation 1: KYC status must be "verified"
  if (profile.kyc?.status !== "verified") {
    const error = new AppError(
      "KYC verification is required before withdrawing campaign earnings. Current status: " +
        (profile.kyc?.status || "not_submitted"),
      403,
      { code: "KYC_NOT_VERIFIED" }
    );
    error.code = "KYC_NOT_VERIFIED";
    throw error;
  }

  // Validation 2: Destination method must be configured
  if (method === "bank_account") {
    if (!profile.payoutAccount?.bankAccount?.isVerified) {
      throw new ValidationError(
        "A verified bank account is required for bank transfer withdrawal"
      );
    }
  } else if (method === "upi") {
    if (!profile.payoutAccount?.vpa) {
      throw new ValidationError("A saved UPI ID (VPA) is required for UPI withdrawal");
    }
  }

  // Validation 3: Balance check and atomic deduction
  const updatedProfile = await InfluencerProfile.findOneAndUpdate(
    {
      _id: profile._id,
      "wallet.availableBalance": { $gte: amount },
    },
    {
      $inc: { "wallet.availableBalance": -amount },
    },
    { new: true }
  );

  if (!updatedProfile) {
    throw new ValidationError(
      `Insufficient available balance for withdrawal. Current balance: ₹${profile.wallet?.availableBalance ?? 0}`
    );
  }

  const referenceId = `pout_${crypto.randomBytes(8).toString("hex")}`;

  // Execute transfer with payment gateway
  await payoutGateway.createPayoutTransfer({
    amount,
    method,
    referenceId,
  });

  // Record ledger transaction
  const transaction = await PayoutTransaction.create({
    userId: user.userId,
    amount,
    type: "withdrawal",
    status: "processed",
    method,
    referenceId,
  });

  return {
    transaction: {
      id: String(transaction._id),
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      createdAt: transaction.createdAt,
      referenceId: transaction.referenceId,
    },
    balance: {
      availableBalance: updatedProfile.wallet?.availableBalance ?? 0,
      pendingClearance: updatedProfile.wallet?.pendingClearance ?? 0,
      lifetimeEarnings: updatedProfile.wallet?.lifetimeEarnings ?? 0,
      currency: updatedProfile.wallet?.currency || "INR",
    },
  };
};

export const getPayoutHistory = async ({ user, query }) => {
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query?.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, transactions] = await Promise.all([
    PayoutTransaction.countDocuments({ userId: user.userId }),
    PayoutTransaction.find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const mapped = transactions.map((tx) => ({
    id: String(tx._id),
    amount: tx.amount,
    type: tx.type,
    status: tx.status,
    createdAt: tx.createdAt,
    referenceId: tx.referenceId,
  }));

  return {
    transactions: mapped,
    data: mapped,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};
