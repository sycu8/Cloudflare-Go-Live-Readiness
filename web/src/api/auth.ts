export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export type AuthState = {
  authenticated: boolean;
  user: AuthUser | null;
  providers: string[];
  githubConnected: boolean;
};

const API_BASE = "";
const fetchOpts: RequestInit = { credentials: "include" };

export async function getAuthState(): Promise<AuthState> {
  const res = await fetch(`${API_BASE}/api/auth/me`, fetchOpts);
  if (res.status === 401) {
    return {
      authenticated: false,
      user: null,
      providers: [],
      githubConnected: false,
    };
  }
  if (!res.ok) throw new Error("Failed to load auth state");
  return res.json() as Promise<AuthState>;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", ...fetchOpts });
}

export function googleLoginUrl(returnTo = "/app/"): string {
  return `${API_BASE}/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
}

export function githubLoginUrl(returnTo = "/app/"): string {
  return `${API_BASE}/api/auth/github/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function githubConnectUrl(sessionId: string): string {
  return `${API_BASE}/api/auth/github?session=${encodeURIComponent(sessionId)}`;
}
