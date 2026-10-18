import { describe, expect, it } from "vitest";
import { bearerChallenge } from "../../workers/src/discovery/challenge.js";
import { handleDiscoveryRequest } from "../../workers/src/discovery/handle.js";
import { HOMEPAGE_LINK_HEADERS, withHomepageLinkHeaders } from "../../workers/src/discovery/links.js";
import { SKILL_ARTIFACTS, sha256Prefixed } from "../../workers/src/discovery/skills.js";

const ORIGIN = "https://ready.orangecloud.vn";

function get(path: string, method = "GET"): Request {
  return new Request(`${ORIGIN}${path}`, { method });
}

describe("agent discovery documents", () => {
  it("serves an RFC 9727 API catalog as a linkset", async () => {
    const response = await handleDiscoveryRequest(get("/.well-known/api-catalog"));
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toContain("application/linkset+json");
    const body = await response!.json();
    expect(Array.isArray(body.linkset)).toBe(true);
    const entry = body.linkset[0];
    expect(entry.anchor).toBe(`${ORIGIN}/api`);
    expect(entry["service-desc"][0].href).toBe(`${ORIGIN}/openapi.json`);
    expect(entry["service-doc"][0].href).toContain("/docs/");
    expect(entry.status[0].href).toBe(`${ORIGIN}/api/health`);
  });

  it("publishes OAuth and OIDC metadata with a matching issuer", async () => {
    const oauth = await handleDiscoveryRequest(get("/.well-known/oauth-authorization-server"));
    const oidc = await handleDiscoveryRequest(get("/.well-known/openid-configuration"));
    const resource = await handleDiscoveryRequest(get("/.well-known/oauth-protected-resource"));
    const oauthBody = await oauth!.json();
    const oidcBody = await oidc!.json();
    const resourceBody = await resource!.json();

    expect(oauthBody.issuer).toBe(ORIGIN);
    expect(oauthBody.authorization_endpoint).toBe(`${ORIGIN}/oauth/authorize`);
    expect(oauthBody.token_endpoint).toBe(`${ORIGIN}/oauth/token`);
    expect(oauthBody.jwks_uri).toBe(`${ORIGIN}/.well-known/jwks.json`);
    expect(oauthBody.grant_types_supported).toContain("authorization_code");
    expect(oauthBody.response_types_supported).toContain("code");
    expect(oauthBody.agent_auth.register_uri).toBe(`${ORIGIN}/oauth/register`);
    expect(oauthBody.agent_auth.identity_types_supported).toEqual(
      expect.arrayContaining(["anonymous", "identity_assertion"]),
    );
    expect(oauthBody.agent_auth.anonymous.credential_types_supported).toContain("access_token");
    expect(oauthBody.agent_auth.identity_assertion.assertion_types_supported).toContain(
      "urn:ietf:params:oauth:token-type:id-jag",
    );
    expect(oauthBody.agent_auth.claim_uri).toBe(`${ORIGIN}/oauth/claim`);
    expect(oauthBody.agent_auth.revocation_uri).toBe(`${ORIGIN}/oauth/revoke`);

    expect(oidcBody.issuer).toBe(ORIGIN);
    expect(oidcBody.jwks_uri).toBe(oauthBody.jwks_uri);
    expect(resourceBody.resource).toBe(`${ORIGIN}/`);
    expect(resourceBody.authorization_servers).toEqual([ORIGIN]);
    expect(resourceBody.bearer_methods_supported).toContain("header");
    expect(resourceBody.scopes_supported.length).toBeGreaterThan(0);
  });

  it("serves auth.md with the expected heading", async () => {
    const response = await handleDiscoveryRequest(get("/auth.md"));
    expect(response?.headers.get("content-type")).toContain("text/markdown");
    const body = await response!.text();
    expect(body.startsWith("# auth.md")).toBe(true);
    expect(body).toContain("register_uri");
  });

  it("serves an MCP server card and answers initialize", async () => {
    const cardResponse = await handleDiscoveryRequest(get("/.well-known/mcp/server-card.json"));
    const card = await cardResponse!.json();
    expect(card.serverInfo.name).toBe("cf-ready");
    expect(card.serverInfo.version).toBeTruthy();
    expect(card.transport.endpoint).toBe(`${ORIGIN}/mcp`);
    expect(card.capabilities.tools).toBeTruthy();

    const rpc = await handleDiscoveryRequest(
      new Request(`${ORIGIN}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      }),
    );
    const body = await rpc!.json();
    expect(body.result.serverInfo.name).toBe("cf-ready");
    expect(body.result.protocolVersion).toBeTruthy();

    const search = await handleDiscoveryRequest(
      new Request(`${ORIGIN}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "search_docs", arguments: { query: "security" } },
        }),
      }),
    );
    const searchBody = await search!.json();
    expect(searchBody.result.content[0].text).toContain("/docs/security-readiness.html");
  });

  it("publishes a skills index whose digests match the artifacts", async () => {
    const response = await handleDiscoveryRequest(get("/.well-known/agent-skills/index.json"));
    const body = await response!.json();
    expect(body.$schema).toBe("https://schemas.agentskills.io/discovery/0.2.0/schema.json");
    expect(body.skills).toHaveLength(SKILL_ARTIFACTS.length);
    for (const skill of body.skills) {
      expect(skill.type).toBe("skill-md");
      expect(skill.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      const artifact = SKILL_ARTIFACTS.find((entry) => entry.name === skill.name);
      expect(skill.url).toBe(`${ORIGIN}${artifact!.path}`);
      expect(skill.digest).toBe(await sha256Prefixed(artifact!.body));
      const file = await handleDiscoveryRequest(get(artifact!.path));
      expect(await file!.text()).toBe(artifact!.body);
    }
  });

  it("publishes an ARD catalog and content signals", async () => {
    const catalogResponse = await handleDiscoveryRequest(get("/.well-known/ai-catalog.json"));
    expect(catalogResponse?.headers.get("access-control-allow-origin")).toBe("*");
    expect(catalogResponse?.headers.get("content-type")).toContain("application/json");
    const catalog = await catalogResponse!.json();
    expect(catalog.specVersion).toBe("1.0");
    expect(catalog.host.displayName).toBe("CF Ready");
    expect(catalog.host.identifier).toBe("did:web:ready.orangecloud.vn");
    expect(catalog.entries.length).toBeGreaterThanOrEqual(2);
    for (const entry of catalog.entries) {
      expect(entry.identifier.startsWith("urn:air:ready.orangecloud.vn:")).toBe(true);
      expect(entry.displayName).toBeTruthy();
      expect(entry.type).toBeTruthy();
      expect(Boolean(entry.url) !== Boolean(entry.data)).toBe(true);
      expect(entry.representativeQueries.length).toBeGreaterThanOrEqual(2);
      expect(entry.representativeQueries.length).toBeLessThanOrEqual(5);
    }

    const robots = await handleDiscoveryRequest(get("/robots.txt"));
    const robotsBody = await robots!.text();
    expect(robotsBody).toContain("Content-Signal: ai-train=no, search=yes, ai-input=yes");
    expect(robotsBody).toContain(`Agentmap: ${ORIGIN}/.well-known/ai-catalog.json`);
  });

  it("adds RFC 8288 Link headers on the homepage", () => {
    const response = withHomepageLinkHeaders(
      get("/"),
      new Response("<html></html>", { headers: { "Content-Type": "text/html" } }),
    );
    const link = response.headers.get("link") ?? "";
    for (const value of HOMEPAGE_LINK_HEADERS) {
      expect(link).toContain(value);
    }
    const other = withHomepageLinkHeaders(
      get("/docs/index.html"),
      new Response("ok", { headers: { "Content-Type": "text/html" } }),
    );
    expect(other.headers.get("link")).toBeNull();
  });

  it("points 401 responses at protected resource metadata", () => {
    const headers = bearerChallenge(get("/api/sessions"));
    expect(headers["WWW-Authenticate"]).toContain(
      `resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource"`,
    );
  });
});
