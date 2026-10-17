import { skillByPath } from "./skills.js";
import {
  agentSkillsIndex,
  aiCatalog,
  apiCatalog,
  authMarkdown,
  discoveryCorsPreflight,
  jwks,
  mcpServerCardResponse,
  oauthAuthorizationServer,
  openApiDocument,
  openIdConfiguration,
  originOf,
  protectedResourceMetadata,
  robotsTxt,
  text,
} from "./documents.js";
import { handleMcp } from "./mcp.js";

function normalizedPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function authorizeRedirect(request: Request): Response {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const target =
    provider === "google" ? "/api/auth/google" : "/api/auth/github/login";
  return Response.redirect(new URL(target, url.origin), 302);
}

function registerDocument(origin: string): Response {
  return text(
    JSON.stringify(
      {
        register_uri: `${origin}/oauth/register`,
        identity_types_supported: ["anonymous", "identity_assertion"],
        anonymous: { credential_types_supported: ["access_token"] },
        identity_assertion: {
          assertion_types_supported: [
            "urn:ietf:params:oauth:token-type:id-jag",
            "verified_email",
          ],
          credential_types_supported: ["access_token"],
        },
        claim_uri: `${origin}/oauth/claim`,
        revocation_uri: `${origin}/oauth/revoke`,
        public_read: `${origin}/api/health`,
        authorization_endpoint: `${origin}/oauth/authorize`,
      },
      null,
      2,
    ),
    200,
    "application/json; charset=utf-8",
  );
}

/**
 * Serves agent-discovery documents. Returns null when the request belongs to
 * the rest of the site.
 */
export async function handleDiscoveryRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = normalizedPath(url.pathname);
  const origin = originOf(request);
  const method = request.method;

  if (path === "/mcp") return handleMcp(request);

  const discoveryPath =
    path.startsWith("/.well-known/") ||
    path === "/auth.md" ||
    path === "/robots.txt" ||
    path === "/openapi.json" ||
    path === "/oauth/authorize" ||
    path === "/oauth/token" ||
    path === "/oauth/register" ||
    path === "/oauth/claim" ||
    path === "/oauth/revoke";

  if (!discoveryPath) return null;

  if (method === "OPTIONS") return discoveryCorsPreflight();

  if (method !== "GET" && method !== "HEAD" && method !== "POST") {
    return text("Method not allowed", 405);
  }

  if (path === "/oauth/authorize" && method === "GET") return authorizeRedirect(request);
  if (path === "/oauth/register" && (method === "GET" || method === "POST")) {
    return registerDocument(origin);
  }
  if (path === "/oauth/claim" && (method === "GET" || method === "POST")) {
    return text(
      `Send the user to ${origin}/oauth/authorize?provider=github or ${origin}/oauth/authorize?provider=google to claim a workspace. Public reads do not need a claim.`,
    );
  }
  if (path === "/oauth/revoke" && method === "POST") {
    return new Response(null, { status: 200 });
  }
  if (path === "/oauth/token" && method === "POST") {
    return text(
      JSON.stringify({
        error: "invalid_grant",
        error_description:
          "CF Ready does not mint access tokens at this endpoint. Public reads need no token. Signed-in workspace access uses the authorization endpoint.",
      }),
      400,
      "application/json; charset=utf-8",
    );
  }

  if (method !== "GET" && method !== "HEAD") return null;

  if (path === "/robots.txt") return robotsTxt(origin);
  if (path === "/auth.md") return authMarkdown(origin);
  if (path === "/openapi.json") return openApiDocument(origin);
  if (path === "/.well-known/api-catalog") return apiCatalog(origin);
  if (path === "/.well-known/ai-catalog.json") return aiCatalog(origin);
  if (path === "/.well-known/openid-configuration") return openIdConfiguration(origin);
  if (path === "/.well-known/oauth-authorization-server" || path.startsWith("/.well-known/oauth-authorization-server/")) {
    return oauthAuthorizationServer(origin);
  }
  if (path === "/.well-known/oauth-protected-resource" || path.startsWith("/.well-known/oauth-protected-resource/")) {
    return protectedResourceMetadata(origin);
  }
  if (path === "/.well-known/jwks.json") return jwks();
  if (path === "/.well-known/mcp/server-card.json") return mcpServerCardResponse(origin);
  if (path === "/.well-known/agent-skills/index.json") return agentSkillsIndex(origin);

  const skill = skillByPath(path);
  if (skill) {
    return new Response(skill.body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return null;
}
