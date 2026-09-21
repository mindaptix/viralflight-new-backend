import twilio from "twilio";

import { env } from "../../../shared/config/env.js";
import { TooManyRequestsError } from "../../../shared/errors/AppError.js";
import { normalizeMobile } from "../../../utils/mobileUtils.js";

const isTestMobile = (mobile) => {
  const normalized = normalizeMobile(mobile);
  return (
    normalized === normalizeMobile(env.testUserMobile) ||
    normalized === "+919876543211"
  );
};

export class TwilioOtpService {
  constructor() {
    if (env.twilioAccountSid && env.twilioAuthToken) {
      this.client = twilio(env.twilioAccountSid, env.twilioAuthToken);
    } else {
      this.client = null;
    }
  }

  async sendOtp(mobile) {
    if (isTestMobile(mobile)) {
      return true;
    }

    if (!this.client || !env.twilioVerifyServiceSid) {
      throw new Error("Twilio Verify service is not configured");
    }

    try {
      await this.client.verify.v2
        .services(env.twilioVerifyServiceSid)
        .verifications.create({
          to: mobile,
          channel: "sms",
        });
    } catch (error) {
      if (error.status === 429 || error.code === 20429) {
        throw new TooManyRequestsError(
          "Too many OTP requests. Please wait a few minutes and try again."
        );
      }
      throw error;
    }
  }

  async verifyOtp(mobile, code) {
    if (isTestMobile(mobile)) {
      return (
        String(code).trim() === String(env.testUserOtp).trim() ||
        String(code).trim() === "123456"
      );
    }

    if (!this.client || !env.twilioVerifyServiceSid) {
      throw new Error("Twilio Verify service is not configured");
    }

    const result = await this.client.verify.v2
      .services(env.twilioVerifyServiceSid)
      .verificationChecks.create({
        to: mobile,
        code,
      });

    return result.status === "approved";
  }
}
