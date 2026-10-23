/** Production hostname. workers.dev and other hosts are not canonical. */
export const CANONICAL_HOST = "ready.orangecloud.vn";

export function requestHostname(request: Request): string {
  return new URL(request.url).hostname.replace(/\.$/, "").toLowerCase();
}

export function isCanonicalHost(hostname: string): boolean {
  return hostname.replace(/\.$/, "").toLowerCase() === CANONICAL_HOST;
}

/**
 * Non-canonical hosts (workers.dev, preview hostnames, localhost) must not be indexed.
 * The canonical response is returned unchanged.
 */
export function withNonCanonicalRobots(request: Request, response: Response): Response {
  if (isCanonicalHost(requestHostname(request))) return response;
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
