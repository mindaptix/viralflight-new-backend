import crypto from "crypto";

import { ValidationError } from "../../../shared/errors/AppError.js";

const OTP_EXPIRY_MS = Number(process.env.OTP_EXPIRY_MS || 10 * 60 * 1000);
const otpStore = new Map();

const generateSixDigitOtp = () =>
  String(crypto.randomInt(100000, 1000000));

const isTenDigitIndianMobile = (mobile) => /^\+91\d{10}$/.test(mobile);

export class LocalOtpService {
  async sendOtp(mobile) {
    if (!isTenDigitIndianMobile(mobile)) {
      throw new ValidationError(
        "Valid 10-digit Indian mobile number is required, e.g. 7018319344"
      );
    }

    const code = generateSixDigitOtp();
    otpStore.set(mobile, {
      code,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    });

    console.log(`[LocalOTP] ${mobile} -> ${code}`);

    const response = {};
    if (process.env.NODE_ENV !== "production") {
      response.debugOtp = code;
    }

    return response;
  }

  async verifyOtp(mobile, code) {
    const entry = otpStore.get(mobile);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(mobile);
      return false;
    }

    const isValid = entry.code === String(code).trim();
    if (isValid) {
      otpStore.delete(mobile);
    }

    return isValid;
  }
}
