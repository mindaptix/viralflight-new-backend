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
