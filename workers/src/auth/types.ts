export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export type OAuthStatePayload = {
  mode: "login" | "connect";
  provider: "google" | "github";
  workspaceSessionId?: string;
  userId?: string;
  returnTo?: string;
};

export type ProviderProfile = {
  provider: "google" | "github";
  providerUserId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  accessToken?: string;
  refreshToken?: string;
  profileJson?: string;
};
