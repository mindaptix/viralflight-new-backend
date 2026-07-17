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

export class SendOtpUseCase extends UseCase {
  constructor({ userRepository, otpService }) {
    super();
    this.userRepository = userRepository;
    this.otpService = otpService;
  }

  async execute({ mobile: rawMobile, role }) {
    const mobile = normalizeMobile(rawMobile);

    if (!mobile) {
      throw new ValidationError(
        "Valid mobile number is required. Use 10 digits or +91 format, e.g. +917018319344"
      );
    }

    if (!ALLOWED_ROLES.includes(role)) {
      throw new ValidationError("Valid role is required: agency, influencer, or brand");
    }

    const existingUser = await this.userRepository.findByMobileAndRole(mobile, role);
    const lastOtpUser = await this.userRepository.findLatestByMobile(mobile);

    if (lastOtpUser?.lastOtpRequestedAt) {
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

    await this.otpService.sendOtp(mobile);
    await this.userRepository.upsertOtpRequest({
      mobile,
      role,
      isMobileVerified: existingUser?.isMobileVerified ?? false,
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

  async execute({ mobile: rawMobile, otp, role }) {
    const mobile = normalizeMobile(rawMobile);
    const selectedRole =
      typeof role === "string" ? role.trim().toLowerCase() : undefined;

    if (!mobile || !otp) {
      throw new ValidationError("Mobile number and OTP are required");
    }

    if (selectedRole !== undefined && !ALLOWED_ROLES.includes(selectedRole)) {
      throw new ValidationError("Valid role is required: agency, influencer, or brand");
    }

    const user = await this.userRepository.findLatestByMobile(mobile, selectedRole);
    if (!user) {
      throw new ValidationError("Please select a role and request OTP first");
    }

    const approved = await this.otpService.verifyOtp(mobile, otp);
    if (!approved) {
      throw new ValidationError("Invalid OTP");
    }

    const { accessToken, refreshToken } = this.authService.createSessionTokens(user);

    user.isMobileVerified = true;
    user.lastLoginAt = new Date();
    user.refreshTokenHash = this.authService.hashToken(refreshToken);
    user.refreshTokenIssuedAt = new Date();
    await this.userRepository.save(user);

    const profile = await this.profileRepository.ensureRoleProfile(user, mobile);
    const isProfileComplete = Boolean(profile?.isProfileComplete);

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
