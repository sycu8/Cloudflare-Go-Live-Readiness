/** Client poll + Durable Object waitUntil budget for long-running exec (scan, report, …). */
export const LONG_EXEC_WAIT_MS = 1_800_000; // 30 minutes

/** Poll budget for medium commands (ai-ready, seo-ready). */
export const MEDIUM_EXEC_WAIT_MS = 900_000; // 15 minutes

/** Default poll budget for short commands. */
export const SHORT_EXEC_WAIT_MS = 420_000; // 7 minutes

/** Single sandbox.exec() budget — must stay below LONG_EXEC_WAIT_MS (retries + materialize). */
export const LONG_SANDBOX_EXEC_MS = 1_500_000; // 25 minutes

export const LONG_EXEC_WAIT_MINUTES = LONG_EXEC_WAIT_MS / 60_000;

export function longExecTimeoutMessage(): string {
  return `Command timed out after ${LONG_EXEC_WAIT_MINUTES} minutes. Large projects or sandbox cold start may need another run — check Results if partial output exists.`;
}
