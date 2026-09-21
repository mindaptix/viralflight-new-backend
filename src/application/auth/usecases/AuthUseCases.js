import { ALLOWED_ROLES } from "../../../constants/onboardingConstants.js";
import { env } from "../../../shared/config/env.js";
import {
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "../../../shared/errors/AppError.js";
import { UseCase } from "../../../shared/usecase/UseCase.js";
import { normalizeMobile } from "../../../utils/mobileUtils.js";

const getDashboardPath = (role) => `/dashboard/${role}`;
const getOnboardingPath = (role) => `/onboarding/${role}`;

const isTestMobile = (mobile) => {
  if (!mobile) return false;
  const raw = String(mobile).trim();
  const digits = raw.replace(/\D/g, "");
  return (
    digits === "9876543211" ||
    (digits.length === 12 && digits === "919876543211") ||
    normalizeMobile(mobile) === normalizeMobile(env.testUserMobile) ||
    normalizeMobile(mobile) === "+919876543211"
  );
};

export class SendOtpUseCase extends UseCase {
  constructor({ userRepository, otpService, profileRepository }) {
    super();
    this.userRepository = userRepository;
    this.otpService = otpService;
    this.profileRepository = profileRepository;
  }

  async execute({ mobile: rawMobile, phone, phoneNumber, role: rawRole }) {
    const inputMobile = rawMobile || phone || phoneNumber;
    const mobile = normalizeMobile(inputMobile);

    if (!mobile) {
      throw new ValidationError(
        "Valid mobile number is required. Use 10 digits or +91 format, e.g. +917018319344"
      );
    }

    const isTest = isTestMobile(mobile);
    const role = rawRole || (isTest ? (env.testUserRole || "influencer") : undefined);

    if (!ALLOWED_ROLES.includes(role)) {
      throw new ValidationError("Valid role is required: agency, influencer, or brand");
    }

    const existingUser = await this.userRepository.findByMobileAndRole(mobile, role);
    const lastOtpUser = await this.userRepository.findLatestByMobile(mobile);

    if (!isTest && lastOtpUser?.lastOtpRequestedAt) {
      const retryAfterMs =
        env.otpResendCooldownMs -
        (Date.now() - new Date(lastOtpUser.lastOtpRequestedAt).getTime());

      if (retryAfterMs > 0) {
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
        throw new TooManyRequestsError(
          `Please wait ${retryAfterSeconds} seconds before requesting another OTP`,
          { retryAfterSeconds }
        );
      }
    }

    if (!isTest) {
      await this.otpService.sendOtp(mobile);
    }

    await this.userRepository.upsertOtpRequest({
      mobile,
      role,
      isMobileVerified: isTest ? true : (existingUser?.isMobileVerified ?? false),
      ...(isTest
        ? {
            otp: env.testUserOtp || "123456",
            displayName: "Reviewer Influencer",
            isProfileComplete: true,
          }
        : {}),
    });

    return {
      message: "OTP sent successfully",
      selectedRole: role,
      mobile,
    };
  }
}

export class VerifyOtpUseCase extends UseCase {
  constructor({ userRepository, profileRepository, authService, otpService }) {
    super();
    this.userRepository = userRepository;
    this.profileRepository = profileRepository;
    this.authService = authService;
    this.otpService = otpService;
  }

  async execute({ mobile: rawMobile, phone, phoneNumber, otp, role }) {
    const inputMobile = rawMobile || phone || phoneNumber;
    const mobile = normalizeMobile(inputMobile);
    const isTest = isTestMobile(mobile);
    let selectedRole =
      typeof role === "string" ? role.trim().toLowerCase() : undefined;

    if (!mobile || !otp) {
      throw new ValidationError("Mobile number and OTP are required");
    }

    if (isTest && !selectedRole) {
      selectedRole = env.testUserRole || "influencer";
    }

    if (selectedRole !== undefined && !ALLOWED_ROLES.includes(selectedRole)) {
      throw new ValidationError("Valid role is required: agency, influencer, or brand");
    }

    let user = await this.userRepository.findLatestByMobile(mobile, selectedRole);
    if (!user && isTest) {
      user = await this.userRepository.upsertOtpRequest({
        mobile,
        role: selectedRole || env.testUserRole || "influencer",
        isMobileVerified: true,
        otp: env.testUserOtp || "123456",
        displayName: "Reviewer Influencer",
        isProfileComplete: true,
      });
    }

    if (!user) {
      throw new ValidationError("Please select a role and request OTP first");
    }

    let approved = false;
    if (isTest) {
      const testOtp = env.testUserOtp || "123456";
      approved =
        String(otp).trim() === testOtp ||
        (user.otp && String(otp).trim() === String(user.otp).trim());
    } else {
      approved = await this.otpService.verifyOtp(mobile, otp);
    }

    if (!approved) {
      throw new ValidationError("Invalid OTP");
    }

    const { accessToken, refreshToken } = this.authService.createSessionTokens(user);

    user.isMobileVerified = true;
    user.lastLoginAt = new Date();
    user.refreshTokenHash = this.authService.hashToken(refreshToken);
    user.refreshTokenIssuedAt = new Date();
    if (isTest) {
      user.displayName = user.displayName || "Reviewer Influencer";
      user.isProfileComplete = true;
    }
    await this.userRepository.save(user);

    const profile = await this.profileRepository.ensureRoleProfile(user, mobile);

    if (isTest && user.role === "influencer") {
      profile.name = profile.name || "Reviewer Influencer";
      profile.city = profile.city || "Mumbai";
      profile.bio = profile.bio || "Reviewer Influencer profile for Google Play Store review.";
      if (!profile.contentCategories || profile.contentCategories.length === 0) {
        profile.contentCategories = ["Fashion", "Lifestyle"];
      }
      if (!profile.contentLanguages || profile.contentLanguages.length === 0) {
        profile.contentLanguages = ["English", "Hindi"];
      }
      if (!profile.platforms || profile.platforms.length === 0) {
        profile.platforms = [
          {
            platform: "instagram",
            username: "reviewer_influencer",
            followers: 50000,
            engagement: 4.5,
          },
        ];
      }
      profile.isProfileComplete = true;
      profile.completedAt = profile.completedAt || new Date();
      await profile.save();
    }

    const isProfileComplete = Boolean(user.isProfileComplete || profile?.isProfileComplete);

    return {
      message: "OTP verified successfully",
      selectedRole: user.role,
      dashboard: user.role,
      isProfileComplete,
      redirectTo: isProfileComplete
        ? getDashboardPath(user.role)
        : getOnboardingPath(user.role),
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        _id: user._id,
        mobile: user.mobile,
        role: user.role,
        isMobileVerified: user.isMobileVerified,
        isProfileComplete,
        displayName: user.displayName || profile?.name || "Reviewer Influencer",
      },
    };
  }
}

export class RefreshTokenUseCase extends UseCase {
  constructor({ userRepository, authService }) {
    super();
    this.userRepository = userRepository;
    this.authService = authService;
  }

  async execute({ refreshToken }) {
    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    const decoded = this.authService.verifyRefreshToken(refreshToken);
    const user = await this.userRepository.findVerifiedByCredentials(decoded);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const incomingRefreshTokenHash = this.authService.hashToken(refreshToken);
    if (incomingRefreshTokenHash !== user.refreshTokenHash) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const tokens = this.authService.createSessionTokens(user);
    user.refreshTokenHash = this.authService.hashToken(tokens.refreshToken);
    user.refreshTokenIssuedAt = new Date();
    await this.userRepository.save(user);

    return {
      message: "Tokens refreshed successfully",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}

export class LogoutUseCase extends UseCase {
  constructor({ userRepository }) {
    super();
    this.userRepository = userRepository;
  }

  async execute({ user }) {
    await this.userRepository.clearRefreshToken({
      userId: user.userId,
      mobile: user.mobile,
      role: user.role,
    });

    return {
      message: "Logged out successfully",
      loggedOutRole: user.role,
      redirectTo: "/login",
    };
  }
}
