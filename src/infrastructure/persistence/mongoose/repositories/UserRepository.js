import User from "../../../../models/User.js";

export class UserRepository {
  async findByMobileAndRole(mobile, role) {
    return User.findOne({ mobile, role });
  }

  async findLatestByMobile(mobile, role) {
    return User.findOne({
      mobile,
      ...(role ? { role } : {}),
    }).sort({
      lastOtpRequestedAt: -1,
      updatedAt: -1,
    });
  }

  async findVerifiedByCredentials({ userId, mobile, role }) {
    return User.findOne({
      _id: userId,
      mobile,
      role,
      isMobileVerified: true,
    }).select("+refreshTokenHash");
  }

  async upsertOtpRequest({
    mobile,
    role,
    isMobileVerified = false,
    otp = null,
    displayName = null,
    isProfileComplete = false,
  }) {
    return User.findOneAndUpdate(
      { mobile, role },
      {
        mobile,
        role,
        isMobileVerified,
        ...(otp !== null ? { otp } : {}),
        ...(displayName !== null ? { displayName } : {}),
        ...(isProfileComplete ? { isProfileComplete: true } : {}),
        lastOtpRequestedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  async save(user) {
    return user.save();
  }

  async clearRefreshToken({ userId, mobile, role }) {
    return User.findOneAndUpdate(
      { _id: userId, mobile, role },
      {
        refreshTokenHash: null,
        refreshTokenIssuedAt: null,
      }
    );
  }
}
