import { syncAllConnectedAccounts } from "../application/social/SocialConnectionService.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let syncInProgress = false;

const runSocialStatsSync = async () => {
  if (syncInProgress) {
    return;
  }

  syncInProgress = true;

  try {
    const result = await syncAllConnectedAccounts();
    console.log(
      `[social-sync] Completed: ${result.synced} synced, ${result.failed} failed, ${result.total} total`
    );
  } catch (error) {
    console.error("[social-sync] Job failed:", error.message);
  } finally {
    syncInProgress = false;
  }
};

const startSocialStatsSyncJob = () => {
  if (process.env.SOCIAL_SYNC_CRON_ENABLED === "false") {
    console.log("[social-sync] Cron disabled via SOCIAL_SYNC_CRON_ENABLED=false");
    return;
  }

  const intervalMs = Number(process.env.SOCIAL_SYNC_INTERVAL_MS) || TWENTY_FOUR_HOURS_MS;

  setInterval(runSocialStatsSync, intervalMs);
  console.log(
    `[social-sync] Nightly stats sync scheduled every ${Math.round(intervalMs / 3600000)}h`
  );
};

export { runSocialStatsSync, startSocialStatsSyncJob };
