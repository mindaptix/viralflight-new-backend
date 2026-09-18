import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging as getAdminMessaging } from "firebase-admin/messaging";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../");

let appInstance = null;
let messagingInstance = null;
let initAttempted = false;

function loadCredentials() {
  // 1. Direct JSON string or base64-encoded JSON in environment
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      const jsonStr = raw.startsWith("{")
        ? raw
        : Buffer.from(raw, "base64").toString("utf-8");
      return JSON.parse(jsonStr);
    } catch (err) {
      console.warn("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", err.message);
    }
  }

  // 2. Specified file path from environment variable or standard locations
  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(projectRoot, "src/config/viral-flight-cfbae-firebase-adminsdk.json"),
    path.join(projectRoot, "src/config/firebase-service-account.json"),
    path.join(projectRoot, "src/config/altrixs-31959-firebase-adminsdk.json"),
    "/Users/ks/Downloads/viral-flight-cfbae-firebase-adminsdk-fbsvc-40a5cf303e.json",
    "/Users/ks/Downloads/altrixs-31959-firebase-adminsdk-fbsvc-bd5bbf3961.json",
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    const resolvedPath = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(projectRoot, candidate);

    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = fs.readFileSync(resolvedPath, "utf-8");
        return JSON.parse(fileContent);
      } catch (err) {
        console.warn(`[FirebaseAdmin] Failed to read service account from ${resolvedPath}:`, err.message);
      }
    }
  }

  // 3. Individual environment variables
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

export function initFirebaseAdmin() {
  if (appInstance && messagingInstance) {
    return { app: appInstance, messaging: messagingInstance };
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    appInstance = existingApps[0];
    messagingInstance = getAdminMessaging(appInstance);
    return { app: appInstance, messaging: messagingInstance };
  }

  initAttempted = true;

  try {
    const credentials = loadCredentials();
    if (!credentials) {
      console.warn(
        "[FirebaseAdmin] No Firebase service account credentials found. Push notifications will be safely bypassed."
      );
      return { app: null, messaging: null };
    }

    const projectId =
      credentials.project_id ||
      credentials.projectId ||
      process.env.FIREBASE_PROJECT_ID ||
      "viral-flight-cfbae";

    appInstance = initializeApp({
      credential: cert(credentials),
      projectId,
    });

    messagingInstance = getAdminMessaging(appInstance);
    console.log(`[FirebaseAdmin] Initialized successfully for project: ${projectId}`);
    return { app: appInstance, messaging: messagingInstance };
  } catch (err) {
    console.error("[FirebaseAdmin] Initialization failed:", err.message);
    return { app: null, messaging: null };
  }
}

export function isFirebaseReady() {
  if (!initAttempted && !appInstance) {
    initFirebaseAdmin();
  }
  return Boolean(appInstance && messagingInstance);
}

export function getMessaging() {
  if (!appInstance || !messagingInstance) {
    const { messaging } = initFirebaseAdmin();
    return messaging;
  }
  return messagingInstance;
}

// Auto-initialize on module load
initFirebaseAdmin();

export default {
  initFirebaseAdmin,
  isFirebaseReady,
  getMessaging,
};
