import {
  createTokens,
  hashToken,
  verifyRefreshToken,
} from "../../../utils/tokenUtils.js";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";

export class JwtAuthService {
  createSessionTokens(user) {
    return createTokens({
      userId: user._id.toString(),
      mobile: user.mobile,
      role: user.role,
    });
  }

  verifyRefreshToken(token) {
    try {
      return verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  hashToken(token) {
    return hashToken(token);
  }
}
