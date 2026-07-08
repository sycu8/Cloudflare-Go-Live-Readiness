export async function readApiError(
  res: Response,
  fallback = "Request failed",
): Promise<string> {
  const contentType = res.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? fallback;
  }

  const text = await res.text().catch(() => "");
  if (text.includes("<!DOCTYPE") || text.includes("<html")) {
    if (res.status === 524 || res.status === 504) {
      return "Server timed out while importing. Try again or use a smaller repository.";
    }
    if (res.status === 401 || res.status === 403) {
      return "Session expired. Sign in again and retry.";
    }
    return `Unexpected HTML response (${res.status}). Refresh the page and try again.`;
  }

  return text.trim().slice(0, 200) || `${fallback} (${res.status})`;
}

export async function readApiJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(await readApiError(res, "Invalid server response"));
  }
  return res.json() as Promise<T>;
}
