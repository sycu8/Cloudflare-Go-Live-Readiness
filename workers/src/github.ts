const GITHUB_HOST = "github.com";

export function parseGitHubRepoUrl(repoUrl: string): { owner: string; repo: string; ref: string } | null {
  const trimmed = repoUrl.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    const shorthand = trimmed.replace(/^\/+/, "").split("/").filter(Boolean);
    if (shorthand.length >= 2) {
      return {
        owner: shorthand[0],
        repo: shorthand[1].replace(/\.git$/, ""),
        ref: "HEAD",
      };
    }
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname !== GITHUB_HOST && url.hostname !== `www.${GITHUB_HOST}`) {
      return null;
    }
    const parts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    const ref = parts[3] === "tree" && parts[4] ? parts[4] : "HEAD";
    return { owner, repo, ref };
  } catch {
    return null;
  }
}

export function githubTarballUrl(owner: string, repo: string, ref = "HEAD"): string {
  return `https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(ref)}`;
}

function githubApiHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "cf-ready-agent",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Resolve HEAD to the repository default branch for codeload downloads. */
export async function resolveGitHubRef(
  owner: string,
  repo: string,
  ref = "HEAD",
  token?: string,
): Promise<string> {
  if (ref !== "HEAD") return ref;
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubApiHeaders(token),
  });
  if (!response.ok) return "main";
  const data = (await response.json()) as { default_branch?: string };
  return data.default_branch ?? "main";
}

export async function fetchGitHubCommitSha(
  owner: string,
  repo: string,
  ref = "HEAD",
  token?: string,
): Promise<string> {
  const headers = githubApiHeaders(token);

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(`GitHub commit lookup failed (${response.status})`);
  }
  const data = (await response.json()) as { sha?: string };
  if (!data.sha) throw new Error("GitHub commit response missing sha");
  return data.sha;
}

export function validateGitHubUrl(repoUrl: string): string {
  const parsed = parseGitHubRepoUrl(repoUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub URL. Use https://github.com/owner/repo");
  }
  return githubTarballUrl(parsed.owner, parsed.repo, parsed.ref);
}
