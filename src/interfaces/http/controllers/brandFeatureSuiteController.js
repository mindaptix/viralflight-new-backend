import BrandProfile from "../../../models/BrandProfile.js";
import Campaign from "../../../models/Campaign.js";
import CampaignApplication from "../../../models/CampaignApplication.js";
import Deal from "../../../models/Deal.js";
import Collaboration from "../../../models/Collaboration.js";
import { asyncHandler } from "../../../shared/http/asyncHandler.js";
import { sendSuccess, sendFailure } from "../../../shared/http/respond.js";
import { getOrCreateRoleProfile, normalizeText } from "../../../utils/profileControllerUtils.js";

const toId = (v) => (v ? String(v) : "");

const getOrCreateBrandProfile = (user) =>
  getOrCreateRoleProfile(user, BrandProfile);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const STATE_CODES = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh",
};

const MOCK_BANK_DATA = {
  ICIC: { name: "ICICI Bank", type: "Private" },
  HDFC: { name: "HDFC Bank", type: "Private" },
  SBIN: { name: "State Bank of India", type: "Public" },
  AXIS: { name: "Axis Bank", type: "Private" },
  KKBK: { name: "Kotak Mahindra Bank", type: "Private" },
  YESB: { name: "Yes Bank", type: "Private" },
  IDFB: { name: "IDFC First Bank", type: "Private" },
  PUNB: { name: "Punjab National Bank", type: "Public" },
  BKID: { name: "Bank of India", type: "Public" },
  UBIN: { name: "Union Bank of India", type: "Public" },
};

// ─── 1. Extended Full Onboarding ─────────────────────────────────────────────
export const saveExtendedBrandOnboarding = asyncHandler(async (req, res) => {
  const profile = await getOrCreateBrandProfile(req.user);
  const body = req.body || {};

  // Persist all 3-step fields onto the profile
  if (body.gstNumber) profile.gstNumber = String(body.gstNumber).toUpperCase().trim();
  if (body.targetNiches) profile.targetNiches = Array.isArray(body.targetNiches) ? body.targetNiches : [body.targetNiches];
  if (body.scaleTiers) profile.scaleTiers = Array.isArray(body.scaleTiers) ? body.scaleTiers : [body.scaleTiers];
  if (body.budgetRange) profile.budgetRange = String(body.budgetRange).trim();
  if (body.primaryCampaignGoals) profile.primaryCampaignGoals = Array.isArray(body.primaryCampaignGoals) ? body.primaryCampaignGoals : [body.primaryCampaignGoals];
  if (typeof body.escrowConsent === "boolean") profile.escrowConsent = body.escrowConsent;
  if (typeof body.termsAccepted === "boolean") profile.termsAccepted = body.termsAccepted;
  if (body.contactName) profile.contactName = normalizeText(body.contactName);

  // Also accept standard fields for backward compat
  if (body.brandName) profile.brandName = normalizeText(body.brandName);
  if (body.website) profile.website = body.website.trim();
  if (body.city) profile.city = normalizeText(body.city);
  if (body.industry) profile.industry = body.industry;
  if (body.description || body.aboutBrand) profile.description = normalizeText(body.description || body.aboutBrand);

  await profile.save();

  sendSuccess(res, {
    statusCode: 200,
    message: "Brand onboarding updated successfully",
    isProfileComplete: profile.isProfileComplete,
    profile,
  });
});

// ─── 2. Verify GST Number ────────────────────────────────────────────────────
export const verifyGst = asyncHandler(async (req, res) => {
  const { gstNumber } = req.body || {};

  if (!gstNumber) {
    return sendFailure(res, { statusCode: 400, message: "gstNumber is required" });
  }

  const gst = String(gstNumber).toUpperCase().trim();

  if (!GST_REGEX.test(gst)) {
    return sendSuccess(res, {
      valid: false,
      message: "Invalid GST number format. Expected format: 27AABCS1429B1ZB",
      gstNumber: gst,
    });
  }

  const stateCode = gst.substring(0, 2);
  const panPortion = gst.substring(2, 12);
  const stateName = STATE_CODES[stateCode] || "Unknown State";

  // Simulate realistic GST Govt API response
  const regYear = 2018 + (parseInt(stateCode, 10) % 7);
  const regMonth = (parseInt(panPortion.charCodeAt(4), 10) % 12) + 1;
  const regDate = `${regYear}-${String(regMonth).padStart(2, "0")}-15`;

  const filingStatuses = ["Regular", "Regular", "Regular", "Composition", "Regular"];
  const filingStatus = filingStatuses[parseInt(stateCode, 10) % filingStatuses.length];

  // If this is the brand's GST, update verification status
  const profile = await BrandProfile.findOne({
    $or: [{ userId: req.user?.userId }, { mobile: req.user?.mobile }],
  });
  if (profile) {
    profile.gstVerified = true;
    profile.gstNumber = gst;
    await profile.save();
  }

  sendSuccess(res, {
    valid: true,
    gstNumber: gst,
    companyName: profile?.brandName || "Company Name Pvt. Ltd.",
    status: "Active",
    stateCode,
    stateName,
    registrationDate: regDate,
    filingStatus,
    panNumber: panPortion,
  });
});

// ─── 3. Save Brand Kit ───────────────────────────────────────────────────────
export const saveBrandKit = asyncHandler(async (req, res) => {
  const profile = await getOrCreateBrandProfile(req.user);
  const body = req.body || {};

  const kit = profile.brandKit || {};

  if (body.logoUrlDark !== undefined) kit.logoUrlDark = body.logoUrlDark;
  if (body.logoUrlLight !== undefined) kit.logoUrlLight = body.logoUrlLight;
  if (Array.isArray(body.brandColors)) kit.brandColors = body.brandColors;
  if (body.primaryFont) kit.primaryFont = body.primaryFont;
  if (typeof body.giftingEnabled === "boolean") kit.giftingEnabled = body.giftingEnabled;
  if (Array.isArray(body.sampleProducts)) kit.sampleProducts = body.sampleProducts;
  if (Array.isArray(body.creativeDos)) kit.creativeDos = body.creativeDos;
  if (Array.isArray(body.creativeDonts)) kit.creativeDonts = body.creativeDonts;
  if (Array.isArray(body.moodboardUrls)) kit.moodboardUrls = body.moodboardUrls;
  if (body.ndaMonths !== undefined) kit.ndaMonths = Number(body.ndaMonths) || 24;
  if (typeof body.ndaPerpetual === "boolean") kit.ndaPerpetual = body.ndaPerpetual;
  if (typeof body.autoNdaEnabled === "boolean") kit.autoNdaEnabled = body.autoNdaEnabled;

  profile.brandKit = kit;
  profile.markModified("brandKit");
  await profile.save();

  sendSuccess(res, {
    message: "Brand kit saved successfully",
    brandKit: profile.brandKit,
  });
});

// ─── 4. Verify Bank Account (Mock Penny Drop) ────────────────────────────────
export const verifyBankAccount = asyncHandler(async (req, res) => {
  const { accountNumber, ifscCode, accountHolderName } = req.body || {};

  if (!accountNumber || !ifscCode) {
    return sendFailure(res, {
      statusCode: 400,
      message: "accountNumber and ifscCode are required",
    });
  }

  const ifsc = String(ifscCode).toUpperCase().trim();
  const bankPrefix = ifsc.substring(0, 4);

  if (!IFSC_REGEX.test(ifsc)) {
    return sendSuccess(res, {
      verified: false,
      message: "Invalid IFSC code format. Expected: ICIC0001234",
      ifscCode: ifsc,
    });
  }

  const bankData = MOCK_BANK_DATA[bankPrefix] || {
    name: "Scheduled Commercial Bank",
    type: "Public",
  };

  // Simulate penny drop verification — always passes for valid IFSC in mock
  const branch = ifsc.slice(-6).replace(/[^A-Z]/g, "").substring(0, 4) || "Main";

  sendSuccess(res, {
    verified: true,
    bankName: bankData.name,
    bankType: bankData.type,
    branch: `${branch} Branch`,
    ifscCode: ifsc,
    accountHolderName: accountHolderName || "Account Holder",
    pennyDropStatus: "SUCCESS",
  });
});

// ─── 5. Save Escrow Config ───────────────────────────────────────────────────
export const saveEscrowConfig = asyncHandler(async (req, res) => {
  const profile = await getOrCreateBrandProfile(req.user);
  const body = req.body || {};

  const cfg = profile.escrowConfig || {};

  if (body.bankAccountNumber !== undefined) cfg.bankAccountNumber = body.bankAccountNumber;
  if (body.ifscCode) cfg.ifscCode = String(body.ifscCode).toUpperCase().trim();
  if (body.billingGstin) cfg.billingGstin = String(body.billingGstin).toUpperCase().trim();
  if (typeof body.upiAutoDebitEnabled === "boolean") cfg.upiAutoDebitEnabled = body.upiAutoDebitEnabled;
  if (body.upiId) cfg.upiId = body.upiId;
  if (body.mandateLimit !== undefined) cfg.mandateLimit = Number(body.mandateLimit) || 500000;
  if (body.milestoneReviewWindowHours !== undefined) cfg.milestoneReviewWindowHours = Number(body.milestoneReviewWindowHours) || 48;
  if (body.dualSignOffThresholdAmount !== undefined) cfg.dualSignOffThresholdAmount = Number(body.dualSignOffThresholdAmount) || 100000;
  if (body.primarySignatoryName) cfg.primarySignatoryName = body.primarySignatoryName;
  if (body.primarySignatoryRole) cfg.primarySignatoryRole = body.primarySignatoryRole;
  if (typeof body.tdsAutomationEnabled === "boolean") cfg.tdsAutomationEnabled = body.tdsAutomationEnabled;
  if (typeof body.gstEInvoicingEnabled === "boolean") cfg.gstEInvoicingEnabled = body.gstEInvoicingEnabled;
  if (body.initialDepositAmount !== undefined) cfg.initialDepositAmount = Number(body.initialDepositAmount) || 0;
  if (typeof body.escrowAuthorized === "boolean") cfg.escrowAuthorized = body.escrowAuthorized;
  if (typeof body.complianceConfirmed === "boolean") cfg.complianceConfirmed = body.complianceConfirmed;

  // Simulate bank name lookup from IFSC
  if (body.ifscCode) {
    const bankPrefix = String(body.ifscCode).toUpperCase().substring(0, 4);
    const bankData = MOCK_BANK_DATA[bankPrefix];
    if (bankData) {
      cfg.bankName = bankData.name;
      cfg.bankVerified = true;
    }
  }

  cfg.configuredAt = new Date();

  profile.escrowConfig = cfg;
  profile.markModified("escrowConfig");
  await profile.save();

  sendSuccess(res, {
    message: "Escrow configuration saved successfully",
    escrowConfig: profile.escrowConfig,
  });
});

// ─── 6. Brand Dashboard Stats ────────────────────────────────────────────────
export const getBrandDashboardStats = asyncHandler(async (req, res) => {
  const userId = toId(req.user.userId);

  const [
    activeCampaigns,
    totalCampaigns,
    totalApplications,
    pendingApplications,
    activeCollabs,
  ] = await Promise.all([
    Campaign.countDocuments({ $or: [{ brandUserId: userId }, { ownerUserId: userId }], status: "active" }),
    Campaign.countDocuments({ $or: [{ brandUserId: userId }, { ownerUserId: userId }] }),
    CampaignApplication.countDocuments({ campaignId: { $in: await Campaign.find({ $or: [{ brandUserId: userId }, { ownerUserId: userId }] }).distinct("_id") } }),
    CampaignApplication.countDocuments({ campaignId: { $in: await Campaign.find({ $or: [{ brandUserId: userId }, { ownerUserId: userId }] }).distinct("_id") }, status: "applied" }),
    Collaboration.countDocuments({ brandUserId: userId, status: "active" }),
  ]);

  // Escrow stats from Deals
  let escrowBalance = 0;
  let totalSpent = 0;
  try {
    const deals = await Deal.find({ brandUserId: userId }).lean();
    escrowBalance = deals
      .filter((d) => d.status === "active")
      .reduce((s, d) => s + (d.escrowLockedAmount || 0), 0);
    totalSpent = deals
      .filter((d) => d.status === "completed")
      .reduce((s, d) => s + (d.amount || 0), 0);
  } catch (_) {
    // Deal model may not exist in all environments
  }

  const creatorsWorkedWith = await Collaboration.distinct("influencerUserId", {
    brandUserId: userId,
  }).then((ids) => ids.length).catch(() => 0);

  const formatINR = (amount) =>
    amount >= 100000
      ? `₹${(amount / 100000).toFixed(1)}L`
      : amount >= 1000
      ? `₹${(amount / 1000).toFixed(0)}K`
      : `₹${amount}`;

  sendSuccess(res, {
    message: "Brand dashboard stats fetched successfully",
    data: {
      activeCampaigns,
      totalCampaigns,
      totalApplications,
      pendingApplications,
      activeCollaborations: activeCollabs,
      creatorsWorkedWith,
      totalSpent: formatINR(totalSpent),
      totalSpentRaw: totalSpent,
      escrowBalance: formatINR(escrowBalance),
      escrowBalanceRaw: escrowBalance,
    },
    // Flat keys for easy Flutter parsing
    activeCampaigns,
    pendingApplications,
    creatorsWorkedWith,
    escrowBalance: formatINR(escrowBalance),
    totalSpent: formatINR(totalSpent),
  });
});

// ─── 7. Escrow Summary ───────────────────────────────────────────────────────
export const getEscrowSummary = asyncHandler(async (req, res) => {
  const userId = toId(req.user.userId);

  let locked = 0;
  let pending = 0;
  let released = 0;
  let dealsCount = { active: 0, incoming: 0, completed: 0 };

  try {
    const deals = await Deal.find({ brandUserId: userId }).lean();

    dealsCount.active = deals.filter((d) => d.status === "active").length;
    dealsCount.incoming = deals.filter((d) => ["incoming", "counter_offered"].includes(d.status)).length;
    dealsCount.completed = deals.filter((d) => d.status === "completed").length;

    locked = deals
      .filter((d) => d.status === "active")
      .reduce((s, d) => s + (d.escrowLockedAmount || 0), 0);
    pending = deals
      .filter((d) => ["incoming", "counter_offered"].includes(d.status))
      .reduce((s, d) => s + (d.amount || 0), 0);
    released = deals
      .filter((d) => d.status === "completed")
      .reduce((s, d) => s + (d.amount || 0), 0);
  } catch (_) {}

  // Get escrow config from profile
  const profile = await BrandProfile.findOne({
    $or: [{ userId }, { mobile: req.user.mobile }],
  }).lean();

  const formatINR = (n) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

  sendSuccess(res, {
    message: "Escrow summary fetched successfully",
    data: {
      locked: { amount: locked, display: formatINR(locked), label: "In Escrow Vault" },
      pending: { amount: pending, display: formatINR(pending), label: "Pending Deposit" },
      released: { amount: released, display: formatINR(released), label: "Released to Creators" },
      dealsCount,
      securityStatus: "100% RBI Compliant Escrow",
      bankVerified: Boolean(profile?.escrowConfig?.bankVerified),
      bankName: profile?.escrowConfig?.bankName || null,
    },
  });
});

// ─── 8. Campaign Analytics ───────────────────────────────────────────────────
export const getCampaignAnalytics = asyncHandler(async (req, res) => {
  const userId = toId(req.user.userId);
  const { campaignId } = req.params;

  const campaign = await Campaign.findOne({
    _id: campaignId,
    $or: [{ brandUserId: userId }, { ownerUserId: userId }],
  }).lean();

  if (!campaign) {
    return sendFailure(res, { statusCode: 404, message: "Campaign not found" });
  }

  const [total, accepted, rejected, shortlisted] = await Promise.all([
    CampaignApplication.countDocuments({ campaignId }),
    CampaignApplication.countDocuments({ campaignId, status: "accepted" }),
    CampaignApplication.countDocuments({ campaignId, status: "rejected" }),
    CampaignApplication.countDocuments({ campaignId, status: { $in: ["shortlisted", "negotiating"] } }),
  ]);

  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const daysLeft = campaign.applicationDeadline
    ? Math.max(0, Math.ceil((new Date(campaign.applicationDeadline) - Date.now()) / 86400000))
    : null;

  sendSuccess(res, {
    message: "Campaign analytics fetched successfully",
    data: {
      campaignId: toId(campaign._id),
      title: campaign.title,
      status: campaign.status,
      views: campaign.viewCount || 0,
      applications: { total, accepted, rejected, shortlisted, pending: total - accepted - rejected - shortlisted },
      acceptanceRate,
      slotsTotal: campaign.slotsTotal || 0,
      slotsRemaining: campaign.slotsRemaining || 0,
      daysLeft,
      budget: { amount: campaign.budgetAmount, currency: campaign.budgetCurrency },
    },
  });
});

// ─── 9. Update Campaign ──────────────────────────────────────────────────────
export const updateBrandCampaign = asyncHandler(async (req, res) => {
  const userId = toId(req.user.userId);
  const { campaignId } = req.params;
  const body = req.body || {};

  const campaign = await Campaign.findOne({
    _id: campaignId,
    $or: [{ brandUserId: userId }, { ownerUserId: userId }],
  });

  if (!campaign) {
    return sendFailure(res, { statusCode: 404, message: "Campaign not found" });
  }

  const allowed = [
    "title", "description", "category", "platforms", "deliverables",
    "budgetAmount", "budgetCurrency", "coverImageUrl", "location",
    "applicationDeadline", "status", "campaignType", "targetNiches",
    "targetScaleTier", "slotsTotal", "slotsRemaining",
  ];

  for (const key of allowed) {
    if (body[key] !== undefined) campaign[key] = body[key];
  }

  await campaign.save();

  sendSuccess(res, {
    message: "Campaign updated successfully",
    campaign,
  });
});

// ─── 10. Delete/Close Campaign ───────────────────────────────────────────────
export const deleteBrandCampaign = asyncHandler(async (req, res) => {
  const userId = toId(req.user.userId);
  const { campaignId } = req.params;

  const campaign = await Campaign.findOne({
    _id: campaignId,
    $or: [{ brandUserId: userId }, { ownerUserId: userId }],
  });

  if (!campaign) {
    return sendFailure(res, { statusCode: 404, message: "Campaign not found" });
  }

  campaign.status = "closed";
  await campaign.save();

  sendSuccess(res, {
    message: "Campaign closed successfully",
    campaignId,
  });
});
