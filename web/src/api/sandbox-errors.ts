/** Matches server-side sandbox cold-start / reconnect failures. */
export function isSandboxStartingMessage(message: string): boolean {
  return /sandbox container is starting|createSession|runtime connection was closing|OperationInterruptedError|temporarily unavailable|socket hang up/i.test(
    message,
  );
}
