// Backwards-compatible re-exports — use MetaGraphService for new code.
import {
  MetaApiError,
  MetaConfigError,
  buildConnectUrl as buildMetaConnectUrl,
  decryptToken,
  encryptToken,
  exchangeCodeAndSync as exchangeCodeAndSyncMeta,
  normalizeHandle,
  syncWithStoredToken as syncWithStoredTokenMeta,
  verifyStateToken as verifyStateTokenMeta,
} from "../meta/MetaGraphService.js";

const buildConnectUrl = (user) => buildMetaConnectUrl(user, "instagram");

const verifyStateToken = (state) => verifyStateTokenMeta(state, "instagram");

const exchangeCodeAndSync = ({ code, preferredHandle }) =>
  exchangeCodeAndSyncMeta({ code, platform: "instagram", preferredHandle });

const syncWithStoredToken = (encryptedToken, preferredHandle) =>
  syncWithStoredTokenMeta({
    encryptedToken,
    platform: "instagram",
    preferredHandle,
  });

export {
  MetaApiError as InstagramApiError,
  MetaConfigError as InstagramConfigError,
  buildConnectUrl,
  decryptToken,
  encryptToken,
  exchangeCodeAndSync,
  normalizeHandle,
  syncWithStoredToken,
  verifyStateToken,
};
