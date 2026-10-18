/** RFC 8288 Link header values advertised from the homepage. */
export const HOMEPAGE_LINK_HEADERS: readonly string[] = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</openapi.json>; rel="service-desc"; type="application/json"',
  '</docs/index.html>; rel="service-doc"; type="text/html"',
  '</.well-known/ai-catalog.json>; rel="describedby"; type="application/json"',
  '</auth.md>; rel="describedby"; type="text/markdown"',
  '</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
];

export function isHomepagePath(pathname: string): boolean {
  return pathname === "/" || pathname === "/index.html";
}

/** Attach agent-discovery Link headers to the homepage document response. */
export function withHomepageLinkHeaders(request: Request, response: Response): Response {
  if (request.method !== "GET" && request.method !== "HEAD") return response;
  const url = new URL(request.url);
  if (!isHomepagePath(url.pathname)) return response;
  if (response.status >= 400) return response;

  const headers = new Headers(response.headers);
  for (const value of HOMEPAGE_LINK_HEADERS) {
    headers.append("Link", value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
