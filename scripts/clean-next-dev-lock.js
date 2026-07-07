import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const lockPath = path.join(process.cwd(), ".next", "dev", "lock");

if (!fs.existsSync(lockPath)) {
  process.exit(0);
}

let pid;

try {
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  pid = lock?.pid;
} catch {
  pid = undefined;
}

if (pid) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGTERM");
    }
    console.log(`Stopped stale Next.js dev process (PID ${pid})`);
  } catch {
    // Process already exited.
  }
}

fs.unlinkSync(lockPath);
console.log("Removed stale Next.js dev lock");
