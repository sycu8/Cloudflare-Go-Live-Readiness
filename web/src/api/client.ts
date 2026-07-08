const API_BASE = "";
const fetchOpts: RequestInit = { credentials: "include" };

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
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to create session");
  }
  const data = (await res.json()) as { sessionId: string };
  return data.sessionId;
}

export async function getStatus(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/status`, fetchOpts);
  return res.json();
}

export async function uploadZip(sessionId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
  return res.json();
}

export async function importGitHub(sessionId: string, repoUrl: string) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/import/github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Import failed");
  return res.json();
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
