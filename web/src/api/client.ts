import { readApiError, readApiJson } from "./errors.js";

const API_BASE = "";
const fetchOpts: RequestInit = { credentials: "include" };

export function normalizeGitHubRepoUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\/[\w.-]+/.test(trimmed)) return `https://github.com/${trimmed.replace(/^\/+/, "")}`;
  return trimmed;
}

async function waitForImportComplete(sessionId: string, timeoutMs = 180_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = (await getStatus(sessionId)) as {
      status?: string;
      lastError?: string | null;
    };
    if (status.status === "idle") return;
    if (status.status === "error") {
      throw new Error(status.lastError ?? "Import failed");
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("Import timed out. The repository may be large — try again.");
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
    const res = await fetch(`${API_BASE}/api/sessions/${stored}/status`, fetchOpts);
    if (res.ok) return stored;
    sessionStorage.removeItem("cf-ready-session");
  }

  const sessionId = await createSession();
  sessionStorage.setItem("cf-ready-session", sessionId);
  return sessionId;
}

export async function getStatus(sessionId: string) {
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

export async function execCommand(sessionId: string, line: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ line }),
    credentials: "include",
  });
  return res.json();
}

export async function getResults(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/results`, fetchOpts);
  return res.json();
}

export function reportPdfUrl(sessionId: string): string {
  return `${API_BASE}/api/sessions/${sessionId}/reports/pdf`;
}

export async function regenerateReport(sessionId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/reports/generate`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to regenerate PDF report");
  }
  return res.blob();
}

export async function listFiles(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/files`, fetchOpts);
  return res.json() as Promise<{ files: string[] }>;
}

export async function chat(sessionId: string, message: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    credentials: "include",
  });
  return res.json();
}

export function githubAuthUrl(sessionId: string): string {
  return `${API_BASE}/api/auth/github?session=${sessionId}`;
}

export async function listGitHubRepos(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/auth/github/repos`, fetchOpts);
  if (!res.ok) throw new Error("GitHub not connected");
  return res.json() as Promise<{ repos: Array<{ full_name: string; private: boolean }> }>;
}
