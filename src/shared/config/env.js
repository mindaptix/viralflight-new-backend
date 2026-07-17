export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  otpResendCooldownMs: Number(process.env.OTP_RESEND_COOLDOWN_MS || 60000),
};
