import { SKILL_ARTIFACTS, sha256Prefixed } from "./skills.js";

export const PRODUCT_VERSION = "0.3.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
};

export function originOf(request: Request): string {
  return new URL(request.url).origin;
}

export function hostnameOf(origin: string): string {
  return new URL(origin).hostname;
}

function json(data: unknown, contentType: string, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
      ...CORS,
    },
  });
}

export function discoveryCorsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export function apiCatalog(origin: string): Response {
  const catalog = {
    linkset: [
      {
        anchor: `${origin}/api`,
        "service-desc": [
          {
            href: `${origin}/openapi.json`,
            type: "application/json",
          },
        ],
        "service-doc": [
          {
            href: `${origin}/docs/index.html`,
            type: "text/html",
          },
        ],
        status: [
          {
            href: `${origin}/api/health`,
            type: "application/json",
          },
        ],
      },
      {
        anchor: `${origin}/api/blog`,
        "service-desc": [
          {
            href: `${origin}/openapi.json`,
            type: "application/json",
          },
        ],
        "service-doc": [
          {
            href: `${origin}/blog/`,
            type: "text/html",
          },
        ],
        status: [
          {
            href: `${origin}/api/health`,
            type: "application/json",
          },
        ],
      },
    ],
  };
  return json(
    catalog,
    'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
  );
}

export function openApiDocument(origin: string): Response {
  const document = {
    openapi: "3.1.0",
    info: {
      title: "CF Ready",
      description:
        "Cloudflare go-live readiness API for health, workspace scans, blog posts, and optional AI optimization.",
      version: PRODUCT_VERSION,
    },
    servers: [{ url: origin }],
    paths: {
      "/api/health": {
        get: {
          summary: "Service health",
          operationId: "getHealth",
          responses: {
            "200": { description: "Service is up" },
          },
        },
      },
      "/api/sessions": {
        post: {
          summary: "Create a Web Agent workspace session",
          operationId: "createSession",
          responses: {
            "200": { description: "Session created" },
            "401": { description: "Sign-in required when authentication is enforced" },
          },
        },
      },
      "/api/optimize": {
        post: {
          summary: "Ask Workers AI for refactor suggestions",
          operationId: "optimize",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Optimization report" },
            "401": { description: "Missing bearer token when AI_API_KEY is set" },
          },
        },
      },
      "/api/blog": {
        get: {
          summary: "List published blog posts",
          operationId: "listPosts",
          responses: {
            "200": { description: "Published posts" },
          },
        },
      },
      "/api/auth/config": {
        get: {
          summary: "Which user sign-in providers are configured",
          operationId: "authConfig",
          responses: {
            "200": { description: "Provider flags" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
  };
  return json(document, "application/json; charset=utf-8");
}

function agentAuth(origin: string) {
  return {
    skill: `${origin}/auth.md`,
    register_uri: `${origin}/oauth/register`,
    identity_endpoint: `${origin}/oauth/register`,
    identity_types_supported: ["anonymous", "identity_assertion"],
    identity_assertion: {
      assertion_types_supported: [
        "urn:ietf:params:oauth:token-type:id-jag",
        "verified_email",
      ],
      credential_types_supported: ["access_token"],
    },
    anonymous: {
      credential_types_supported: ["access_token"],
    },
    claim_uri: `${origin}/oauth/claim`,
    revocation_uri: `${origin}/oauth/revoke`,
    events_supported: [
      "https://schemas.workos.com/events/agent/auth/identity/assertion/revoked",
    ],
  };
}

export function authorizationServerMetadata(origin: string): Record<string, unknown> {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    jwks_uri: `${origin}/.well-known/jwks.json`,
    registration_endpoint: `${origin}/oauth/register`,
    revocation_endpoint: `${origin}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["api:read", "scan:run", "blog:write"],
    service_documentation: `${origin}/docs/index.html`,
    agent_auth: agentAuth(origin),
  };
}

export function openIdConfiguration(origin: string): Response {
  return json(
    {
      ...authorizationServerMetadata(origin),
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      claims_supported: ["sub", "email", "name"],
    },
    "application/json; charset=utf-8",
  );
}

export function oauthAuthorizationServer(origin: string): Response {
  return json(authorizationServerMetadata(origin), "application/json; charset=utf-8");
}

export function protectedResourceMetadata(origin: string): Response {
  return json(
    {
      resource: `${origin}/`,
      resource_name: "CF Ready",
      authorization_servers: [origin],
      scopes_supported: ["api:read", "scan:run", "blog:write"],
      bearer_methods_supported: ["header"],
      resource_documentation: `${origin}/docs/index.html`,
    },
    "application/json; charset=utf-8",
  );
}

export function jwks(): Response {
  return json({ keys: [] }, "application/json; charset=utf-8");
}

export function mcpServerCard(origin: string): Record<string, unknown> {
  return {
    serverInfo: {
      name: "cf-ready",
      version: PRODUCT_VERSION,
      title: "CF Ready",
    },
    name: "vn.orangecloud/cf-ready",
    title: "CF Ready",
    description:
      "Cloudflare go-live readiness tools: health, documentation search, and the install command.",
    version: PRODUCT_VERSION,
    endpoint: `${origin}/mcp`,
    transport: {
      type: "streamable-http",
      endpoint: `${origin}/mcp`,
    },
    remotes: [
      {
        type: "streamable-http",
        url: `${origin}/mcp`,
      },
    ],
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false },
      prompts: { listChanged: false },
    },
    tools: [
      {
        name: "cf_ready_health",
        description: "Report whether the CF Ready service is reachable.",
      },
      {
        name: "search_docs",
        description: "Find CF Ready documentation pages for a readiness topic.",
      },
      {
        name: "install_command",
        description: "Return the command that runs a local Cloudflare go-live scan.",
      },
    ],
  };
}

export function mcpServerCardResponse(origin: string): Response {
  return json(mcpServerCard(origin), "application/json; charset=utf-8");
}

export async function agentSkillsIndex(origin: string): Promise<Response> {
  const skills = await Promise.all(
    SKILL_ARTIFACTS.map(async (skill) => ({
      name: skill.name,
      type: "skill-md",
      description: skill.description,
      url: `${origin}${skill.path}`,
      digest: await sha256Prefixed(skill.body),
    })),
  );
  return json(
    {
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills,
    },
    "application/json; charset=utf-8",
  );
}

export function aiCatalog(origin: string): Response {
  const host = hostnameOf(origin);
  const entries = [
    {
      identifier: `urn:air:${host}:server:cf-ready`,
      displayName: "CF Ready MCP Server",
      type: "application/json",
      url: `${origin}/.well-known/mcp/server-card.json`,
      representativeQueries: [
        "how do I check if my site is ready for Cloudflare",
        "what tools does the CF Ready MCP server expose",
        "run a go-live readiness scan",
        "check security and SEO before deploying to Workers",
      ],
    },
    {
      identifier: `urn:air:${host}:api:readiness`,
      displayName: "CF Ready HTTP API",
      type: "application/json",
      url: `${origin}/openapi.json`,
      representativeQueries: [
        "is the CF Ready API healthy",
        "create a web agent scan session",
        "list the public CF Ready API endpoints",
      ],
    },
    {
      identifier: `urn:air:${host}:catalog:api`,
      displayName: "CF Ready API Catalog",
      type: "application/linkset+json",
      url: `${origin}/.well-known/api-catalog`,
      representativeQueries: [
        "where is the OpenAPI description for CF Ready",
        "what is the health endpoint for the readiness API",
      ],
    },
    {
      identifier: `urn:air:${host}:skills:index`,
      displayName: "CF Ready Agent Skills",
      type: "application/json",
      url: `${origin}/.well-known/agent-skills/index.json`,
      representativeQueries: [
        "which agent skills does CF Ready publish",
        "how do I run the Cloudflare readiness CLI from an agent",
      ],
    },
    {
      identifier: `urn:air:${host}:auth:agents`,
      displayName: "CF Ready agent registration",
      type: "text/markdown",
      url: `${origin}/auth.md`,
      representativeQueries: [
        "how does an agent authenticate to CF Ready",
        "where is the OAuth protected resource metadata",
      ],
    },
  ];

  return json(
    {
      specVersion: "1.0",
      host: {
        displayName: "CF Ready",
        identifier: `did:web:${host}`,
      },
      entries,
    },
    "application/json; charset=utf-8",
  );
}

export function robotsTxt(origin: string): Response {
  const body = `User-agent: *
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: GPTBot
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: ClaudeBot
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

User-agent: PerplexityBot
Allow: /
Content-Signal: ai-train=no, search=yes, ai-input=yes

Sitemap: ${origin}/sitemap.xml
Agentmap: ${origin}/.well-known/ai-catalog.json
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...CORS,
    },
  });
}

export function authMarkdown(origin: string): Response {
  const body = `# auth.md

You are an agent. CF Ready supports agent registration: discover the protected resource, read this skill, register, claim a user only when you need a signed-in workspace, then call the public API.

The resource server and the authorization server are both \`${origin}\`.

## Who this is for

Agents helping a person check whether a site is ready to launch on Cloudflare. Public read endpoints do not need a credential. Workspace sessions and blog generation need a signed-in user or an operator bearer token.

## Step 1 — Discover

Fetch protected resource metadata:

\`\`\`http
GET /.well-known/oauth-protected-resource
\`\`\`

The document includes:

- \`resource\`: \`${origin}/\`
- \`authorization_servers\`: \`${origin}\`
- \`scopes_supported\`: \`api:read\`, \`scan:run\`, \`blog:write\`
- \`bearer_methods_supported\`: \`header\`

Then fetch authorization server metadata:

\`\`\`http
GET /.well-known/oauth-authorization-server
\`\`\`

The \`issuer\` is \`${origin}\`. The \`agent_auth\` block points back at this file.

A 401 from a protected API includes:

\`\`\`http
WWW-Authenticate: Bearer realm="cf-ready", resource_metadata="${origin}/.well-known/oauth-protected-resource"
\`\`\`

## Step 2 — Register

\`register_uri\` is \`${origin}/oauth/register\`.

Supported identity types:

- \`anonymous\` — credential type \`access_token\`. Use this for public read access. POST an empty JSON object to the register URI. No secret is issued; \`api:read\` calls such as \`GET /api/health\` and \`GET /api/blog\` succeed without a bearer token.
- \`identity_assertion\` — assertion types \`urn:ietf:params:oauth:token-type:id-jag\` and \`verified_email\`. Credential type \`access_token\`. CF Ready does not accept a third-party ID-JAG directly. Send the user through the authorization endpoint so GitHub or Google can identify them.

## Step 3 — Claim

\`claim_uri\` is \`${origin}/oauth/claim\`.

When a workspace must belong to a person, send them to:

- GitHub: \`${origin}/oauth/authorize?provider=github\`
- Google: \`${origin}/oauth/authorize?provider=google\`

That is the claim ceremony. After they finish, the browser holds a session cookie. Do not ask the user for their password.

## Step 4 — Call the API

Send a bearer token in the \`Authorization\` header only when the deployment has configured \`AI_API_KEY\` for \`POST /api/optimize\`, or when an operator gave you a token for \`POST /api/blog/generate\`.

\`\`\`http
Authorization: Bearer <token>
\`\`\`

Health, blog reads, the API catalog, and these discovery documents stay public.

## Step 5 — Revoke

\`revocation_uri\` is \`${origin}/oauth/revoke\`.

POST the token you want to stop using. User sessions are also cleared by \`POST /api/auth/logout\` from the signed-in browser.

Revocation events use \`https://schemas.workos.com/events/agent/auth/identity/assertion/revoked\` when an operator withdraws an agent credential.
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ...CORS,
    },
  });
}

export function text(body: string, status = 200, contentType = "text/plain; charset=utf-8"): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      ...CORS,
    },
  });
}

export { CORS };
