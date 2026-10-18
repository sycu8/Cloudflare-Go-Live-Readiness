/** RFC 9728 challenge so agents can find protected-resource metadata. */
export function bearerChallenge(request: Request): Record<string, string> {
  const origin = new URL(request.url).origin;
  return {
    "WWW-Authenticate": `Bearer realm="cf-ready", resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
  };
}
