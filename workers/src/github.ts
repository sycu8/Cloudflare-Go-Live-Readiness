const GITHUB_HOST = "github.com";

export function parseGitHubRepoUrl(repoUrl: string): { owner: string; repo: string; ref: string } | null {
  try {
    const url = new URL(repoUrl.trim());
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
  return `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;
}

export function validateGitHubUrl(repoUrl: string): string {
  const parsed = parseGitHubRepoUrl(repoUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub URL. Use https://github.com/owner/repo");
  }
  return githubTarballUrl(parsed.owner, parsed.repo, parsed.ref);
}
