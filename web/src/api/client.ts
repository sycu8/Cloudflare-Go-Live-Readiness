import { readApiError, readApiJson } from "./errors.js";

const API_BASE = "";
const fetchOpts: RequestInit = { credentials: "include" };

export function normalizeGitHubRepoUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const stripped = trimmed.replace(/^\/+/, "");
  if (/^[\w.-]+\/[\w.-]+/.test(stripped)) return `https://github.com/${stripped}`;
  return trimmed;
}

async function waitForSessionStatus(
  sessionId: string,
  done: (status: Record<string, unknown>) => boolean,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Record<string, unknown>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = (await getStatus(sessionId)) as Record<string, unknown>;
    if (status.status === "error") {
      throw new Error(String(status.lastError ?? "Operation failed"));
    }
    if (done(status)) return status;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(timeoutMessage);
}

async function waitForImportComplete(sessionId: string, timeoutMs = 180_000): Promise<void> {
  await waitForSessionStatus(
    sessionId,
    (status) => status.status === "idle" || status.status === "done",
    timeoutMs,
    "Import timed out. The repository may be large — try again.",
  );
}

async function waitForExecComplete(sessionId: string, timeoutMs = 300_000) {
  await waitForSessionStatus(
    sessionId,
    (status) => status.status === "done" || status.status === "idle",
    timeoutMs,
    "Command timed out. Try again or use a smaller project.",
  );
  return getResults(sessionId);
}

export type SessionStatus = "idle" | "importing" | "running" | "done" | "error";

export type ScanScores = {
  overall: number;
  migration: number;
  security: number;
  aiReadiness: number;
  seo: number;
  deployment: number;
};

export type Finding = {
  id: string;
  title: string;
  severity: string;
  category: string;
  description?: string;
};

export type SessionResults = {
  result?: ScanResultData;
  markdown?: string;
  error?: string | null;
};

export type ChatResponse = {
  reply?: string;
  command?: string;
  result?: {
    data?: ScanResultData;
    stdout?: string;
  };
};

export type ScanResultData = {
  productionReady?: boolean;
  scores?: ScanScores;
  blockers?: Finding[];
  findings?: Finding[];
  inspection?: {
    projectName?: string;
    framework?: string;
    deploymentTarget?: string;
    packageManager?: string;
  };
  markdown?: string;
};

export async function createSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/sessions`, { method: "POST", ...fetchOpts });
  if (!res.ok) {
    throw new Error(await readApiError(res, "Failed to create session"));
  }
  const data = await readApiJson<{ sessionId: string }>(res);
  return data.sessionId;
}

/** Reuse a linked workspace session or create a new one after sign-in. */
export async function ensureWorkspaceSession(): Promise<string> {
  const stored = sessionStorage.getItem("cf-ready-session");
  if (stored) {
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${stored}/status`, fetchOpts);
      if (res.ok) {
        const status = await readApiJson<{ status?: string }>(res);
        if (status.status) return stored;
      }
    } catch {
      /* stale or invalid session */
    }
    sessionStorage.removeItem("cf-ready-session");
  }

  const sessionId = await createSession();
  sessionStorage.setItem("cf-ready-session", sessionId);
  return sessionId;
}

export async function getStatus(sessionId: string): Promise<{ status?: SessionStatus; lastError?: string }> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/status`, fetchOpts);
  if (!res.ok) {
    throw new Error(await readApiError(res, "Failed to load session status"));
  }
  return readApiJson(res);
}

export async function uploadZip(sessionId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readApiError(res, "Upload failed"));
  return readApiJson(res);
}

export async function importGitHub(sessionId: string, repoUrl: string) {
  const normalized = normalizeGitHubRepoUrl(repoUrl);
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/import/github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl: normalized }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readApiError(res, "Import failed"));
  const data = await readApiJson<{ ok?: boolean; status?: string }>(res);
  if (data.status === "importing") {
    await waitForImportComplete(sessionId);
  }
  return data;
}

export type ExecCommandResult = {
  status?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  data?: unknown;
  error?: string;
  markdown?: string;
};

export async function execCommand(sessionId: string, line: string): Promise<ExecCommandResult> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readApiError(res, "Command failed"));
  const data = await readApiJson<ExecCommandResult>(res);

  if (data.status === "running") {
    const results = await waitForExecComplete(sessionId);
    if (results.error) throw new Error(results.error);
    const payload = results.result ?? null;
    return {
      exitCode: 0,
      stdout: payload ? JSON.stringify(payload) : "",
      stderr: "",
      data: payload,
      markdown: results.markdown,
    };
  }

  return data;
}

export async function getResults(sessionId: string): Promise<SessionResults> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/results`, fetchOpts);
  if (!res.ok) throw new Error(await readApiError(res, "Failed to load results"));
  return readApiJson<SessionResults>(res);
}

export function reportPdfUrl(sessionId: string): string {
  return `${API_BASE}/api/sessions/${sessionId}/reports/pdf`;
}

export async function regenerateReport(sessionId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/reports/generate`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readApiError(res, "Failed to regenerate PDF report"));
  return res.blob();
}

export async function listFiles(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/files`, fetchOpts);
  if (!res.ok) throw new Error(await readApiError(res, "Failed to list files"));
  return readApiJson<{ files: string[] }>(res);
}

export async function chat(sessionId: string, message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    credentials: "include",
  });
  if (!res.ok) throw new Error(await readApiError(res, "Chat request failed"));
  return readApiJson<ChatResponse>(res);
}

export function githubAuthUrl(sessionId: string): string {
  return `${API_BASE}/api/auth/github?session=${sessionId}`;
}

export async function listGitHubRepos(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/auth/github/repos`, fetchOpts);
  if (!res.ok) throw new Error(await readApiError(res, "GitHub not connected"));
  return readApiJson<{ repos: Array<{ full_name: string; private: boolean }> }>(res);
}
