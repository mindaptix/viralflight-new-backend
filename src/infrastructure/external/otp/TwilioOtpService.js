import twilio from "twilio";

import { env } from "../../../shared/config/env.js";
import { TooManyRequestsError } from "../../../shared/errors/AppError.js";

export class TwilioOtpService {
  constructor() {
    this.client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  }

  async sendOtp(mobile) {
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
    const result = await this.client.verify.v2
      .services(env.twilioVerifyServiceSid)
      .verificationChecks.create({
        to: mobile,
        code,
      });

    return result.status === "approved";
  }
}
