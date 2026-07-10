const RETRYABLE =
  /OperationInterruptedError|interrupted while the runtime connection|createSession|connection was closing|ECONNRESET|socket hang up|temporarily unavailable|reconnecting|not ready|503|service unavailable/i;

export const SANDBOX_COLD_START_RETRY = { maxAttempts: 15, baseDelayMs: 2000 };
export const SANDBOX_SCAN_RETRY = { maxAttempts: 20, baseDelayMs: 2500 };

export function isRetryableSandboxError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return RETRYABLE.test(message);
}

export function isSandboxStartingMessage(message: string): boolean {
  return (
    /sandbox container is starting or reconnecting/i.test(message) || RETRYABLE.test(message)
  );
}

export function formatSandboxError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (isRetryableSandboxError(error)) {
    return "Sandbox container is starting or reconnecting. Wait a few seconds and try again, or run scan to continue.";
  }
  return message;
}

/** Retry transient Sandbox RPC / container cold-start failures. */
export async function withSandboxRetry<T>(
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 10;
  const baseDelayMs = opts?.baseDelayMs ?? 3000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableSandboxError(error) || attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  throw lastError;
}
