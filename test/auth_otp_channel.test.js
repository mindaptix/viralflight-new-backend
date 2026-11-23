import test from "node:test";
import assert from "node:assert/strict";
import { SendOtpUseCase } from "../src/application/auth/usecases/AuthUseCases.js";

test("SendOtpUseCase passes whatsapp channel to otpService when selected", async () => {
  let sentMobile;
  let sentChannel;

  const mockOtpService = {
    sendOtp: async (mobile, channel) => {
      sentMobile = mobile;
      sentChannel = channel;
      return true;
    },
  };

  const mockUserRepo = {
    findByMobileAndRole: async () => null,
    findLatestByMobile: async () => null,
    upsertOtpRequest: async () => ({}),
  };

  const usecase = new SendOtpUseCase({
    userRepository: mockUserRepo,
    otpService: mockOtpService,
    profileRepository: {},
  });

  // Test WhatsApp
  const resultWhatsApp = await usecase.execute({
    mobile: "+919123456789",
    role: "influencer",
    channel: "whatsapp",
  });

  assert.equal(sentMobile, "+919123456789");
  assert.equal(sentChannel, "whatsapp");
  assert.equal(resultWhatsApp.channel, "whatsapp");

  // Test SMS default
  const resultSms = await usecase.execute({
    mobile: "+919123456789",
    role: "influencer",
  });

  assert.equal(sentChannel, "sms");
  assert.equal(resultSms.channel, "sms");
});

test("TwilioOtpService.verifyOtp throws friendly ValidationError when check is not found (404)", async () => {
  const { env } = await import("../src/shared/config/env.js");
  const originalSid = env.twilioVerifyServiceSid;
  env.twilioVerifyServiceSid = "VA_test_sid";

  const { TwilioOtpService } = await import("../src/infrastructure/external/otp/TwilioOtpService.js");
  const service = new TwilioOtpService();

  service.client = {
    verify: {
      v2: {
        services: () => ({
          verificationChecks: {
            create: async () => {
              const err = new Error("The requested resource was not found");
              err.status = 404;
              err.code = 20404;
              throw err;
            },
          },
        }),
      },
    },
  };

  try {
    await assert.rejects(
      async () => {
        await service.verifyOtp("+917591033165", "798498");
      },
      (err) => {
        assert.equal(err.name, "ValidationError");
        assert.match(err.message, /expired or was already used/i);
        return true;
      }
    );
  } finally {
    env.twilioVerifyServiceSid = originalSid;
  }
});
