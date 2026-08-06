import { execa } from "execa";
import path from "node:path";

export type CreatePrOptions = {
  rootDir: string;
  files: string[];
  title?: string;
  body?: string;
  branchName?: string;
  dryRun?: boolean;
};

export type CreatePrResult = {
  branch: string;
  files: string[];
  prUrl?: string;
  dryRun: boolean;
  skippedReason?: string;
};

function defaultBranchName(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `cf-ready/fix-${stamp}`;
}

async function runGit(rootDir: string, args: string[]): Promise<string> {
  const { stdout } = await execa("git", args, { cwd: rootDir });
  return stdout.trim();
}

/** Create a branch, commit allowlisted generated files, and open a PR via `gh`. */
export async function createFixPullRequest(
  options: CreatePrOptions,
): Promise<CreatePrResult> {
  const branch = options.branchName ?? defaultBranchName();
  const uniqueFiles = [...new Set(options.files.filter(Boolean))];

  if (uniqueFiles.length === 0) {
    return {
      branch,
      files: [],
      dryRun: Boolean(options.dryRun),
      skippedReason: "No generated files to commit",
    };
  }

  if (options.dryRun) {
    return {
      branch,
      files: uniqueFiles,
      dryRun: true,
    };
  }

  const inside = await runGit(options.rootDir, ["rev-parse", "--is-inside-work-tree"]).catch(
    () => "",
  );
  if (inside !== "true") {
    throw new Error("fix --create-pr requires a git repository");
  }

  await runGit(options.rootDir, ["checkout", "-b", branch]);

  const relativeFiles = uniqueFiles.map((f) =>
    path.isAbsolute(f) ? path.relative(options.rootDir, f) : f,
  );
  await execa("git", ["add", "--", ...relativeFiles], { cwd: options.rootDir });

  const staged = await runGit(options.rootDir, ["diff", "--cached", "--name-only"]);
  if (!staged) {
    return {
      branch,
      files: relativeFiles,
      dryRun: false,
      skippedReason: "No staged changes (files may be unchanged)",
    };
  }

  const title = options.title ?? "chore: apply cf-ready safe readiness fixes";
  const body =
    options.body ??
    [
      "This PR was created by `cf-ready fix --create-pr`.",
      "",
      "Only safe generated readiness assets are included (AI/SEO drafts).",
      "Please review before merging.",
      "",
      "Files:",
      ...relativeFiles.map((f) => `- \`${f}\``),
    ].join("\n");

  await execa("git", ["commit", "-m", title], { cwd: options.rootDir });
  await execa("git", ["push", "-u", "origin", branch], { cwd: options.rootDir });

  const { stdout: prUrl } = await execa(
    "gh",
    ["pr", "create", "--title", title, "--body", body, "--head", branch],
    { cwd: options.rootDir },
  );

  return {
    branch,
    files: relativeFiles,
    prUrl: prUrl.trim(),
    dryRun: false,
  };
}
